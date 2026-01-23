"""
Balance calculation service - provides real-time balance calculations
for salary periods based on actual transaction data.

This service implements "lazy balance correction" - salary periods store
snapshot balances at creation time, but this service calculates real-time
balances by analyzing all transactions within the period.

Critical for Issue #89: Debit/Credit Balance Calculation Bug
When salary periods are created before the previous period ends, snapshot
balances don't account for transactions made after creation. This service
always calculates from source of truth (transactions).
"""

from datetime import datetime
from typing import Dict
from backend.models.database import (
    db,
    SalaryPeriod,
    BudgetPeriod,
    Expense,
    Income,
    User,
)
from sqlalchemy import and_


def get_display_balances(salary_period_id: int, user_id: int) -> Dict[str, float]:
    """
    Calculate real-time balances for a salary period based on actual transactions.

    Returns display balances that should be shown in UI instead of the snapshot
    balances stored in salary_period.initial_debit_balance / initial_credit_balance.

    Behavior depends on user's balance_mode:
    - "budget" (isolated): Each period has its own independent balance
    - "sync" (cumulative): Balances accumulate across all periods

    Args:
        salary_period_id: ID of the salary period to calculate balances for
        user_id: ID of the user (for multi-tenant data isolation)

    Returns:
        dict with keys:
            - debit_balance: Current debit card balance (in euros)
            - credit_available: Available credit (what user can spend, in euros)
    """
    salary_period = SalaryPeriod.query.filter_by(
        id=salary_period_id, user_id=user_id
    ).first_or_404()

    # Get user to check balance mode
    user = User.query.get(user_id)
    balance_mode = user.balance_mode if user else "sync"

    # Calculate real debit balance (mode-aware)
    debit_balance = _calculate_debit_balance(
        user_id=user_id,
        salary_period=salary_period,
        balance_mode=balance_mode,
    )

    # Calculate real credit available (mode-aware)
    credit_available = _calculate_credit_available(
        user_id=user_id,
        salary_period=salary_period,
        balance_mode=balance_mode,
    )

    # Ensure available doesn't exceed limit
    credit_limit = salary_period.credit_limit / 100  # Convert cents to euros
    credit_available = min(credit_available, credit_limit)  # Cap at limit

    return {
        "debit_balance": debit_balance,
        "credit_available": credit_available,  # Available credit (what user can spend)
    }


def _calculate_debit_balance(
    user_id: int, salary_period: SalaryPeriod, balance_mode: str
) -> float:
    """
    Calculate real-time debit balance based on balance mode.

    Args:
        user_id: User ID to scope all transaction queries
        salary_period: The salary period being viewed
        balance_mode: "budget" (isolated) or "sync" (cumulative)

    Returns:
        Debit balance in euros (can be negative if overdrawn)
    """
    from datetime import datetime

    if balance_mode == "budget":
        # BUDGET MODE: Each period is isolated
        # Balance = Period's initial balance + income within period - expenses within period
        starting_balance = salary_period.initial_debit_balance
        period_start = salary_period.start_date
        period_end = salary_period.end_date

        # Get income within this period only (excluding Initial Balance markers)
        total_income = (
            db.session.query(db.func.coalesce(db.func.sum(Income.amount), 0))
            .filter(
                and_(
                    Income.user_id == user_id,
                    Income.type != "Initial Balance",
                    Income.actual_date >= period_start,
                    Income.actual_date <= period_end,
                    Income.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        # Get debit expenses within this period only
        total_debit_expenses = (
            db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.payment_method == "Debit card",
                    Expense.date >= period_start,
                    Expense.date <= period_end,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        balance_cents = starting_balance + total_income - total_debit_expenses

    else:
        # SYNC MODE: User's balance mirrors their real bank account
        #
        # The ANCHOR is User.user_initial_debit_balance, set when first period created.
        # User.balance_start_date marks when tracking began.
        #
        # If viewing a PAST period (before balance_start_date), show that period's
        # isolated balance. The past period balance is added to cumulative total
        # only when viewing periods from anchor date onwards.
        #
        # Formula for anchor+ periods:
        #   Balance = Anchor + Past Period Balances + Income - Expenses

        user = User.query.get(user_id)
        if user and user.user_initial_debit_balance is not None:
            anchor_balance = user.user_initial_debit_balance
            # Fallback to salary_period.start_date if balance_start_date is None (Issue #180 Bug #3)
            anchor_date = user.balance_start_date or salary_period.start_date
        else:
            # Fallback: use earliest period's balance
            earliest_period = (
                SalaryPeriod.query.filter_by(user_id=user_id, is_active=True)
                .order_by(SalaryPeriod.start_date)
                .first()
            )
            if earliest_period:
                anchor_balance = earliest_period.initial_debit_balance
                anchor_date = earliest_period.start_date
            else:
                anchor_balance = 0
                anchor_date = salary_period.start_date

        # Check if viewing a PAST period (before anchor date)
        # Guard against None anchor_date (Issue #180 Bug #3)
        if anchor_date is not None and salary_period.start_date < anchor_date:
            # Past period: Show isolated balance (like budget mode)
            starting_balance = salary_period.initial_debit_balance
            period_start = salary_period.start_date
            period_end = salary_period.end_date

            total_income = (
                db.session.query(db.func.coalesce(db.func.sum(Income.amount), 0))
                .filter(
                    and_(
                        Income.user_id == user_id,
                        Income.type != "Initial Balance",
                        Income.actual_date >= period_start,
                        Income.actual_date <= period_end,
                        Income.deleted_at.is_(None),
                    )
                )
                .scalar()
                or 0
            )

            total_debit_expenses = (
                db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
                .filter(
                    and_(
                        Expense.user_id == user_id,
                        Expense.payment_method == "Debit card",
                        Expense.date >= period_start,
                        Expense.date <= period_end,
                        Expense.deleted_at.is_(None),
                    )
                )
                .scalar()
                or 0
            )

            balance_cents = starting_balance + total_income - total_debit_expenses
            return balance_cents / 100

        # Current or future period: Calculate cumulative balance
        # Sum past period balances (periods that START before anchor date)
        # These are treated as "past income" to be accounted for
        # Guard against None anchor_date (Issue #180 Bug #3)
        if anchor_date is not None:
            past_period_balances = (
                db.session.query(
                    db.func.coalesce(db.func.sum(SalaryPeriod.initial_debit_balance), 0)
                )
                .filter(
                    and_(
                        SalaryPeriod.user_id == user_id,
                        SalaryPeriod.is_active == True,  # noqa: E712
                        SalaryPeriod.start_date < anchor_date,
                    )
                )
                .scalar()
                or 0
            )
        else:
            past_period_balances = 0

        # Calculate from earliest date (could be past period or anchor)
        all_periods = (
            SalaryPeriod.query.filter_by(user_id=user_id, is_active=True)
            .order_by(SalaryPeriod.start_date)
            .all()
        )
        if all_periods:
            earliest_date = all_periods[0].start_date
        else:
            earliest_date = anchor_date

        end_at_date = salary_period.end_date

        # Get all income up to this period's end (excluding Initial Balance markers)
        total_income = (
            db.session.query(db.func.coalesce(db.func.sum(Income.amount), 0))
            .filter(
                and_(
                    Income.user_id == user_id,
                    Income.type != "Initial Balance",
                    Income.actual_date >= earliest_date,
                    Income.actual_date <= end_at_date,
                    Income.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        # Get all debit expenses up to this period's end
        total_debit_expenses = (
            db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.payment_method == "Debit card",
                    Expense.date >= earliest_date,
                    Expense.date <= end_at_date,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        balance_cents = (
            anchor_balance + past_period_balances + total_income - total_debit_expenses
        )

    return balance_cents / 100  # Convert cents to euros


def _calculate_credit_available(
    user_id: int, salary_period: SalaryPeriod, balance_mode: str
) -> float:
    """
    Calculate real-time credit card available balance based on balance mode.

    Credit debt is treated as GLOBAL regardless of mode (per Issue #149 decision).
    This means credit debt accumulates across all periods, even in budget mode.

    Args:
        user_id: User ID to scope all transaction queries
        salary_period: The salary period being viewed
        balance_mode: "budget" (isolated) or "sync" (cumulative)

    Returns:
        Current available credit balance in euros
    """
    credit_limit = salary_period.credit_limit

    if balance_mode == "budget":
        # BUDGET MODE: Period-isolated balance
        # Credit available = Period's initial credit balance
        # (which is credit_limit - debt at period start)
        starting_available = salary_period.initial_credit_balance
        period_start = salary_period.start_date
        period_end = salary_period.end_date

        # Get credit expenses within this period only (excluding Debt markers)
        total_credit_expenses = (
            db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.payment_method == "Credit card",
                    Expense.category != "Debt",
                    Expense.date >= period_start,
                    Expense.date <= period_end,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        # Get debt payments within this period
        total_credit_payments = (
            db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.category == "Debt Payments",
                    Expense.subcategory == "Credit Card",
                    Expense.date >= period_start,
                    Expense.date <= period_end,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        balance_cents = (
            starting_available + total_credit_payments - total_credit_expenses
        )

    else:
        # SYNC MODE: Credit mirrors real credit card state
        # Use the ONE initial credit state set when user created their first period
        # Then track all credit expenses and payments up to viewed period's end
        #
        # NOTE: We do NOT sum period initial_credit_balances because that would
        # misrepresent the actual credit card state.

        user = User.query.get(user_id)
        if user and user.user_initial_credit_available is not None:
            # Use stored credit available directly (simplified in Phase 6)
            anchor_available = user.user_initial_credit_available
            # Fallback to salary_period.start_date if balance_start_date is None (Issue #180 Bug #3)
            anchor_date = user.balance_start_date or salary_period.start_date
        else:
            # Fallback: use earliest period's credit balance
            earliest_period = (
                SalaryPeriod.query.filter_by(user_id=user_id, is_active=True)
                .order_by(SalaryPeriod.start_date)
                .first()
            )
            if earliest_period:
                anchor_available = earliest_period.initial_credit_balance
                anchor_date = earliest_period.start_date
            else:
                anchor_available = salary_period.credit_limit
                anchor_date = salary_period.start_date

        # Check if viewing a PAST period (before anchor date)
        # Guard against None anchor_date (Issue #180 Bug #3)
        if anchor_date is not None and salary_period.start_date < anchor_date:
            # Past period: Show isolated balance (like budget mode)
            starting_available = salary_period.initial_credit_balance
            period_start = salary_period.start_date
            period_end = salary_period.end_date

            # Get credit expenses within this period only (excluding Debt markers)
            total_credit_expenses = (
                db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
                .filter(
                    and_(
                        Expense.user_id == user_id,
                        Expense.payment_method == "Credit card",
                        Expense.category != "Debt",
                        Expense.date >= period_start,
                        Expense.date <= period_end,
                        Expense.deleted_at.is_(None),
                    )
                )
                .scalar()
                or 0
            )

            # Get debt payments within this period
            total_credit_payments = (
                db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
                .filter(
                    and_(
                        Expense.user_id == user_id,
                        Expense.category == "Debt Payments",
                        Expense.subcategory == "Credit Card",
                        Expense.date >= period_start,
                        Expense.date <= period_end,
                        Expense.deleted_at.is_(None),
                    )
                )
                .scalar()
                or 0
            )

            balance_cents = (
                starting_available + total_credit_payments - total_credit_expenses
            )
            return balance_cents / 100  # Convert cents to euros

        # Current or future period: Calculate cumulative credit balance
        end_at_date = salary_period.end_date

        # Get ALL credit expenses up to this period's end (excluding Debt markers)
        total_credit_expenses = (
            db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.payment_method == "Credit card",
                    Expense.category != "Debt",
                    Expense.date >= anchor_date,
                    Expense.date <= end_at_date,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        # Get ALL debt payments up to this period's end
        total_credit_payments = (
            db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.category == "Debt Payments",
                    Expense.subcategory == "Credit Card",
                    Expense.date >= anchor_date,
                    Expense.date <= end_at_date,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        balance_cents = anchor_available + total_credit_payments - total_credit_expenses

    return balance_cents / 100  # Convert cents to euros


def get_period_summary(salary_period_id: int, user_id: int) -> Dict:
    """
    Get comprehensive summary for a salary period including real-time balances
    and period statistics.

    Args:
        salary_period_id: ID of the salary period
        user_id: ID of the user (for multi-tenant data isolation)

    Returns:
        dict with period info, real-time balances, and spending stats
    """
    salary_period = SalaryPeriod.query.filter_by(
        id=salary_period_id, user_id=user_id
    ).first_or_404()
    balances = get_display_balances(salary_period_id, user_id)

    # Get spending within this period
    budget_periods = BudgetPeriod.query.filter_by(
        salary_period_id=salary_period_id, user_id=user_id
    ).all()

    total_spent = 0
    for bp in budget_periods:
        expenses = Expense.query.filter(
            and_(
                Expense.user_id == user_id,
                Expense.date >= bp.start_date,
                Expense.date <= bp.end_date,
                Expense.deleted_at.is_(None),
            )
        ).all()
        total_spent += sum(e.amount for e in expenses)

    return {
        "salary_period_id": salary_period_id,
        "start_date": salary_period.start_date.isoformat(),
        "balances": balances,
        "total_spent_cents": total_spent,
        "total_spent_euros": total_spent / 100,
        "credit_limit_euros": salary_period.credit_limit / 100,
    }
