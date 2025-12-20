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

    # Calculate real credit balance
    credit_balance = _calculate_credit_balance(period_start, period_end)

    # Calculate available credit
    credit_limit = salary_period.credit_limit / 100  # Convert cents to euros
    credit_available = max(0, credit_limit - credit_balance)

    return {
        "debit_balance": debit_balance,
        "credit_balance": credit_balance,
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


def _calculate_credit_balance(start_date: datetime, end_date: datetime) -> float:
    """
    Calculate real-time credit balance by analyzing transactions before period start.

    Credit balance = (all credit expenses before period) - (all credit card payments before period)
    This represents the amount owed on the credit card.

    Args:
        start_date: Period start date (calculate balance as of this date)
        end_date: Period end date (unused for credit, but kept for consistency)

    Returns:
        Credit balance in euros (can be negative if overpaid, usually >= 0)
    """
    # Get all credit expenses before period start (payment_method is a string field)
    total_credit_expenses = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.payment_method == "Credit card",
                Expense.date < start_date,
            )
        )
        .scalar()
        or 0
    )

    # Get all credit card payments (debt payments) before period start
    total_credit_payments = (
        db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.category == "Debt Payments",
                Expense.subcategory == "Credit Card",
                Expense.date < start_date,
            )
        )
        .scalar()
        or 0
    )

    balance_cents = total_credit_expenses - total_credit_payments
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
