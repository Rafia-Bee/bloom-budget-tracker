"""
Bloom - Recurring Expense Generator

Utility service to automatically generate expenses from recurring templates.
Checks for due recurring expenses and creates expense instances.
"""

from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from backend.models.database import db, RecurringExpense, Expense, BudgetPeriod


def find_budget_period_for_date(user_id, date):
    """
    Find the budget period that contains the given date for a user.

    Args:
        user_id: User ID
        date: Date to find period for

    Returns:
        BudgetPeriod or None
    """
    return BudgetPeriod.query.filter(
        BudgetPeriod.user_id == user_id,
        BudgetPeriod.start_date <= date,
        BudgetPeriod.end_date >= date,
    ).first()


def calculate_next_due_date(recurring_expense):
    """
    Calculate the next due date for a recurring expense based on its frequency.

    Args:
        recurring_expense: RecurringExpense instance

    Returns:
        datetime.date: The next due date
    """
    current_next = recurring_expense.next_due_date

    if recurring_expense.frequency == "weekly":
        return current_next + timedelta(days=7)

    elif recurring_expense.frequency == "biweekly":
        return current_next + timedelta(days=14)

    elif recurring_expense.frequency == "monthly":
        # Move to next month, same day
        next_month = current_next.month + 1
        next_year = current_next.year

        if next_month > 12:
            next_month = 1
            next_year += 1

        # Handle day overflow (e.g., Jan 31 -> Feb 28)
        # Safe day for all months
        day = min(recurring_expense.day_of_month, 28)

        try:
            return datetime(next_year, next_month, day).date()
        except ValueError:
            # If day is still invalid, use last day of month
            if next_month == 2:
                # February
                is_leap = (next_year % 4 == 0 and next_year % 100 != 0) or (next_year % 400 == 0)
                day = 29 if is_leap else 28
            elif next_month in [4, 6, 9, 11]:
                day = 30
            else:
                day = 31
            return datetime(next_year, next_month, day).date()

    elif recurring_expense.frequency == "custom":
        return current_next + timedelta(days=recurring_expense.frequency_value)

    return current_next


def generate_due_expenses(user_id=None, dry_run=False, days_ahead=60):
    """
    Generate expenses from recurring templates that are due.

    Args:
        user_id: Optional user ID to filter by specific user
        dry_run: If True, return what would be generated without creating anything
        days_ahead: Generate expenses up to this many days in the future (default 60)

    Returns:
        dict: Statistics about generated expenses
    """
    today = datetime.now().date()
    future_date = today + timedelta(days=days_ahead)

    # Query for active recurring expenses that are due (up to future_date)
    query = RecurringExpense.query.filter(
        RecurringExpense.is_active == True,
        RecurringExpense.next_due_date <= future_date,
    )

    if user_id:
        query = query.filter_by(user_id=user_id)

    # Also filter by end_date if set
    query = query.filter(
        db.or_(RecurringExpense.end_date == None, RecurringExpense.end_date >= today)
    )

    due_recurring_expenses = query.all()

    generated_count = 0
    updated_templates = []
    errors = []

    for recurring_expense in due_recurring_expenses:
        try:
            # Check if we already generated an expense for this date
            existing = Expense.query.filter_by(
                user_id=recurring_expense.user_id,
                recurring_template_id=recurring_expense.id,
                date=recurring_expense.next_due_date,
            ).first()

            if existing:
                # Already generated, just update next_due_date
                if not dry_run:
                    recurring_expense.next_due_date = calculate_next_due_date(recurring_expense)
                    recurring_expense.updated_at = datetime.utcnow()
                updated_templates.append(
                    {
                        "id": recurring_expense.id,
                        "name": recurring_expense.name,
                        "amount": recurring_expense.amount / 100,
                        "date": recurring_expense.next_due_date.isoformat(),
                        "action": "skipped (already exists)",
                    }
                )
                continue

            # Create the expense
            if not dry_run:
                # Store the date we're generating for (before updating next_due_date)
                generation_date = recurring_expense.next_due_date

                # Create expense regardless of budget period
                # (budget periods are optional, date-based queries handle it)
                expense = Expense(
                    user_id=recurring_expense.user_id,
                    name=recurring_expense.name,
                    amount=recurring_expense.amount,
                    date=generation_date,
                    category=recurring_expense.category,
                    subcategory=recurring_expense.subcategory,
                    payment_method=recurring_expense.payment_method,
                    recurring_template_id=recurring_expense.id,
                    is_fixed_bill=recurring_expense.is_fixed_bill,
                )

                try:
                    db.session.add(expense)
                    db.session.flush()  # Check constraint before updating next_due_date
                except IntegrityError:
                    # Race condition: expense already generated by concurrent run
                    db.session.rollback()
                    updated_templates.append(
                        {
                            "id": recurring_expense.id,
                            "name": recurring_expense.name,
                            "amount": recurring_expense.amount / 100,
                            "date": generation_date.isoformat(),
                            "action": "skipped (race condition - already generated)",
                        }
                    )
                    continue

                # Update next_due_date
                recurring_expense.next_due_date = calculate_next_due_date(recurring_expense)
                recurring_expense.updated_at = datetime.utcnow()

                # Check if we should deactivate (past end_date)
                if (
                    recurring_expense.end_date
                    and recurring_expense.next_due_date > recurring_expense.end_date
                ):
                    recurring_expense.is_active = False

            generated_count += 1
            updated_templates.append(
                {
                    "id": recurring_expense.id,
                    "name": recurring_expense.name,
                    "amount": recurring_expense.amount / 100,
                    "date": generation_date.isoformat()
                    if not dry_run
                    else recurring_expense.next_due_date.isoformat(),
                    "action": "generated" if not dry_run else "would generate",
                }
            )

        except Exception as e:
            errors.append(
                {
                    "id": recurring_expense.id,
                    "name": recurring_expense.name,
                    "error": str(e),
                }
            )

    if not dry_run and generated_count > 0:
        db.session.commit()

    return {
        "generated_count": generated_count,
        "templates_processed": len(due_recurring_expenses),
        "templates": updated_templates,
        "errors": errors,
        "dry_run": dry_run,
    }


def get_upcoming_recurring_expenses(user_id, days=30):
    """
    Get a preview of upcoming recurring expenses for the next X days.

    Args:
        user_id: User ID to filter by
        days: Number of days to look ahead

    Returns:
        list: List of upcoming expense dictionaries
    """
    today = datetime.now().date()
    end_date = today + timedelta(days=days)

    recurring_expenses = RecurringExpense.query.filter_by(user_id=user_id, is_active=True).all()

    upcoming = []

    for recurring_expense in recurring_expenses:
        next_due = recurring_expense.next_due_date

        # Generate all occurrences in the date range
        while next_due <= end_date:
            if recurring_expense.end_date and next_due > recurring_expense.end_date:
                break

            upcoming.append(
                {
                    "template_id": recurring_expense.id,
                    "name": recurring_expense.name,
                    "amount": recurring_expense.amount / 100,
                    "date": next_due.isoformat(),
                    "category": recurring_expense.category,
                    "subcategory": recurring_expense.subcategory,
                    "frequency": recurring_expense.frequency,
                }
            )

            # Calculate next occurrence
            if recurring_expense.frequency == "weekly":
                next_due = next_due + timedelta(days=7)
            elif recurring_expense.frequency == "biweekly":
                next_due = next_due + timedelta(days=14)
            elif recurring_expense.frequency == "monthly":
                next_month = next_due.month + 1
                next_year = next_due.year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                try:
                    next_due = datetime(
                        next_year, next_month, recurring_expense.day_of_month
                    ).date()
                except ValueError:
                    # Handle invalid day (e.g., Feb 30)
                    next_due = datetime(next_year, next_month, 28).date()
            elif recurring_expense.frequency == "custom":
                next_due = next_due + timedelta(days=recurring_expense.frequency_value)

    # Sort by date
    upcoming.sort(key=lambda x: x["date"])

    return upcoming
