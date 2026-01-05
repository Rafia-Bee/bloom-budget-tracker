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
)
from sqlalchemy import and_


def get_display_balances(salary_period_id: int, user_id: int) -> Dict[str, float]:
    """
    Calculate real-time balances for a salary period based on actual transactions.

    Returns display balances that should be shown in UI instead of the snapshot
    balances stored in salary_period.initial_debit_balance / initial_credit_balance.

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

    # Get date range for this salary period
    period_start = salary_period.start_date
    # Use the last budget period's end_date to ensure we capture the full period
    last_budget_period = (
        BudgetPeriod.query.filter_by(salary_period_id=salary_period_id, user_id=user_id)
        .order_by(BudgetPeriod.end_date.desc())
        .first()
    )
    period_end = (
        last_budget_period.end_date if last_budget_period else salary_period.start_date
    )

    # Calculate real debit balance
    debit_balance = _calculate_debit_balance(user_id)

    # Calculate real credit available (period-agnostic, uses all transactions)
    credit_available = _calculate_credit_available(
        user_id=user_id,
        credit_limit_cents=salary_period.credit_limit,
    )

    # Ensure available doesn't exceed limit
    credit_limit = salary_period.credit_limit / 100  # Convert cents to euros
    credit_available = min(credit_available, credit_limit)  # Cap at limit

    return {
        "debit_balance": debit_balance,
        "credit_available": credit_available,  # Available credit (what user can spend)
    }


def _calculate_debit_balance(user_id: int) -> float:
    """
    Calculate real-time debit balance from all-time transactions.

    Periods are cosmetic filters only - balance reflects actual account state.

    Method:
    1. Find earliest "Initial Balance" income entry (starting money when user began tracking)
    2. Exclude subsequent "Initial Balance" entries (they would cause double-counting
       since salary income is already included in the bank balance when user enters it)
    3. Sum all other income since that date
    4. Subtract all debit expenses since that date

    Note (Issue #149): Only the FIRST Initial Balance counts as the starting point.
    Subsequent salary periods' initial_debit_balance values are snapshots, not additional
    money - the salary income is already included in those values.

    Args:
        user_id: User ID to scope all transaction queries

    Returns:
        Debit balance in euros (can be negative if overdrawn)
    """
    from datetime import datetime

    today = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

    # Find earliest "Initial Balance" entry for this user
    # This is the ONLY initial balance that should count - it represents
    # what the user had when they first started using the app
    earliest_initial_balance = (
        db.session.query(Income)
        .filter(
            and_(
                Income.user_id == user_id,
                Income.type == "Initial Balance",
                Income.deleted_at.is_(None),
            )
        )
        .order_by(Income.actual_date)
        .first()
    )

    if not earliest_initial_balance:
        # No initial balance, use earliest income instead
        earliest_income = (
            db.session.query(Income)
            .filter(and_(Income.user_id == user_id, Income.deleted_at.is_(None)))
            .order_by(Income.actual_date)
            .first()
        )
        if not earliest_income:
            return 0.0
        start_from_date = earliest_income.actual_date
        starting_balance = 0
    else:
        start_from_date = earliest_initial_balance.actual_date
        starting_balance = earliest_initial_balance.amount

    # Get all NON-initial-balance income since tracking started (up to today)
    # Exclude ALL "Initial Balance" entries - only the first one was counted above
    # Subsequent Initial Balances would cause double-counting (salary already included)
    total_income = (
        db.session.query(db.func.coalesce(db.func.sum(Income.amount), 0))
        .filter(
            and_(
                Income.user_id == user_id,
                Income.type != "Initial Balance",  # Exclude all initial balance entries
                Income.actual_date >= start_from_date,
                Income.actual_date <= today,
                Income.deleted_at.is_(None),
            )
        )
        .scalar()
        or 0
    )

    # Get ALL debit expenses since tracking started (up to today)
    total_debit_expenses = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.user_id == user_id,
                Expense.payment_method == "Debit card",
                Expense.date >= start_from_date,
                Expense.date <= today,
                Expense.deleted_at.is_(None),
            )
        )
        .scalar()
        or 0
    )

    # Balance = Starting (first initial balance) + Income - Expenses
    balance_cents = starting_balance + total_income - total_debit_expenses
    return balance_cents / 100  # Convert cents to euros


def _calculate_credit_available(user_id: int, credit_limit_cents: int) -> float:
    """
    Calculate current real-time credit card available balance.

    Periods are cosmetic filters only - balance reflects ALL transactions ever made.

    Method (period-agnostic):
    1. Find earliest "Pre-existing Credit Card Debt" marker (category=Debt, subcategory=Credit Card)
    2. Starting available = Credit Limit - that debt amount
    3. Add ALL credit card payments since that date
    4. Subtract ALL credit card expenses since that date (excluding Debt category markers)

    Args:
        user_id: User ID to scope all transaction queries
        credit_limit_cents: Credit card limit (in cents)

    Returns:
        Current available credit balance in euros
    """
    today = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

    # Find earliest "Pre-existing Credit Card Debt" entry for THIS USER
    earliest_debt_marker = (
        db.session.query(Expense)
        .filter(
            and_(
                Expense.user_id == user_id,
                Expense.category == "Debt",
                Expense.subcategory == "Credit Card",
                Expense.payment_method == "Credit card",
                Expense.deleted_at.is_(None),
            )
        )
        .order_by(Expense.date)
        .first()
    )

    if earliest_debt_marker:
        # Start from this marker's date
        start_from_date = earliest_debt_marker.date
        # Starting available = limit - debt
        starting_available_cents = credit_limit_cents - earliest_debt_marker.amount
    else:
        # No marker found - assume started with full credit limit available
        start_from_date = datetime(2000, 1, 1).date()  # Beginning of time
        starting_available_cents = credit_limit_cents

    # Get ALL credit card expenses since start date (excluding Debt category markers)
    total_credit_expenses = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.user_id == user_id,
                Expense.payment_method == "Credit card",
                Expense.category != "Debt",  # Exclude pre-existing debt markers
                Expense.date >= start_from_date,
                Expense.date <= today,
                Expense.deleted_at.is_(None),
            )
        )
        .scalar()
        or 0
    )

    # Get ALL debt payments since start date
    total_credit_payments = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.user_id == user_id,
                Expense.category == "Debt Payments",
                Expense.subcategory == "Credit Card",
                Expense.date >= start_from_date,
                Expense.date <= today,
                Expense.deleted_at.is_(None),
            )
        )
        .scalar()
        or 0
    )

    # Available = Starting + Payments - Expenses
    balance_cents = (
        starting_available_cents + total_credit_payments - total_credit_expenses
    )
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
