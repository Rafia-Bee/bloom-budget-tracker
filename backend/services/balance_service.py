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
from typing import Dict, Optional
from backend.models.database import (
    db,
    SalaryPeriod,
    BudgetPeriod,
    Expense,
    Income,
)
from sqlalchemy import and_


def get_display_balances(salary_period_id: int) -> Dict[str, float]:
    """
    Calculate real-time balances for a salary period based on actual transactions.

    Returns display balances that should be shown in UI instead of the snapshot
    balances stored in salary_period.initial_debit_balance / initial_credit_balance.

    Args:
        salary_period_id: ID of the salary period to calculate balances for

    Returns:
        dict with keys:
            - debit_balance: Current debit card balance (in euros)
            - credit_balance: Current credit card balance (in euros)
            - credit_available: Remaining credit limit (in euros)
    """
    salary_period = SalaryPeriod.query.get_or_404(salary_period_id)

    # Get date range for this salary period
    period_start = salary_period.start_date
    # Use the last budget period's end_date to ensure we capture the full period
    last_budget_period = (
        BudgetPeriod.query.filter_by(salary_period_id=salary_period_id)
        .order_by(BudgetPeriod.end_date.desc())
        .first()
    )
    period_end = (
        last_budget_period.end_date if last_budget_period else salary_period.start_date
    )

    # Calculate real debit balance
    debit_balance = _calculate_debit_balance(period_start, period_end)

    # Calculate real credit available (start with initial balance)
    initial_credit_balance = salary_period.initial_credit_balance  # Already in cents
    credit_available = _calculate_credit_balance(
        period_start, period_end, initial_credit_balance
    )

    # Ensure available doesn't exceed limit
    credit_limit = salary_period.credit_limit / 100  # Convert cents to euros
    credit_available = min(credit_available, credit_limit)  # Cap at limit

    return {
        "debit_balance": debit_balance,
        "credit_balance": credit_available,  # Return AVAILABLE (what user can spend)
        "credit_available": credit_available,
    }


def _calculate_debit_balance(start_date: datetime, end_date: datetime) -> float:
    """
    Calculate real-time debit balance by analyzing transactions before period start.

    Debit balance = (all income before period) - (all debit expenses before period)
    This represents the actual money available in the debit account.

    Args:
        start_date: Period start date (calculate balance as of this date)
        end_date: Period end date (unused for debit, but kept for consistency)

    Returns:
        Debit balance in euros (can be negative if overdrawn)
    """
    # Get all income before period start (use actual_date for realized income)
    total_income = (
        db.session.query(db.func.coalesce(db.func.sum(Income.amount), 0))
        .filter(Income.actual_date < start_date)
        .scalar()
        or 0
    )

    # Get all debit expenses before period start (payment_method is a string field)
    total_debit_expenses = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.payment_method == "Debit card",
                Expense.date < start_date,
            )
        )
        .scalar()
        or 0
    )

    balance_cents = total_income - total_debit_expenses
    return balance_cents / 100  # Convert cents to euros


def _calculate_credit_balance(
    start_date: datetime, end_date: datetime, initial_balance: int
) -> float:
    """
    Calculate current real-time credit card available balance.

    Periods are cosmetic filters only - balance reflects ALL transactions ever made.

    Method:
    1. Find earliest "Pre-existing Credit Card Debt" marker (category=Debt, subcategory=Credit Card)
    2. Calculate starting available = Credit Limit - that debt amount
    3. Add all credit payments since that date
    4. Subtract all credit expenses since that date (excluding Debt category markers)

    Args:
        start_date: Unused - kept for API compatibility
        end_date: Unused - kept for API compatibility
        initial_balance: Unused - we calculate from transactions

    Returns:
        Current available credit balance in euros
    """
    from datetime import datetime
    from backend.models.database import SalaryPeriod

    today = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

    # Get credit limit from current salary period
    current_period = SalaryPeriod.query.filter_by(is_active=True).first()
    if not current_period:
        return 0.0

    credit_limit_cents = current_period.credit_limit

    # Find earliest "Pre-existing Credit Card Debt" entry
    earliest_debt_marker = (
        db.session.query(Expense)
        .filter(
            and_(
                Expense.category == "Debt",
                Expense.subcategory == "Credit Card",
                Expense.payment_method == "Credit card",
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
        start_from_date = datetime(2000, 1, 1)  # Beginning of time
        starting_available_cents = credit_limit_cents

    # Get ALL credit card expenses since start date (excluding Debt category markers)
    total_credit_expenses = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.payment_method == "Credit card",
                Expense.category != "Debt",  # Exclude pre-existing debt markers
                Expense.date >= start_from_date,
                Expense.date <= today,
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
                Expense.category == "Debt Payments",
                Expense.subcategory == "Credit Card",
                Expense.date >= start_from_date,
                Expense.date <= today,
            )
        )
        .scalar()
        or 0
    )

    # Available = Starting + Payments - Expenses
    balance_cents = starting_available_cents + total_credit_payments - total_credit_expenses
    return balance_cents / 100  # Convert cents to euros


def get_period_summary(salary_period_id: int) -> Dict:
    """
    Get comprehensive summary for a salary period including real-time balances
    and period statistics.

    Args:
        salary_period_id: ID of the salary period

    Returns:
        dict with period info, real-time balances, and spending stats
    """
    salary_period = SalaryPeriod.query.get_or_404(salary_period_id)
    balances = get_display_balances(salary_period_id)

    # Get spending within this period
    budget_periods = BudgetPeriod.query.filter_by(
        salary_period_id=salary_period_id
    ).all()

    total_spent = 0
    for bp in budget_periods:
        expenses = Expense.query.filter(
            and_(
                Expense.date >= bp.start_date,
                Expense.date <= bp.end_date,
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
