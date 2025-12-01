"""
Clear all data for a specific user (LOCALHOST ONLY)

Usage: python scripts/clear_user_data.py <user_email>
"""

from backend.models.database import (
    db,
    User,
    Expense,
    Income,
    Debt,
    RecurringExpense,
    BudgetPeriod,
    SalaryPeriod,
    ExpenseNameMapping,
)
from backend.app import create_app
import sys
import os

# Add parent directory to path FIRST
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")))

# Now import backend modules


def clear_user_data(email):
    """Clear all data for a user (keeps the user account)"""
    app = create_app()

    with app.app_context():
        # Check if running on localhost
        if app.config.get('ENV') == 'production':
            print("ERROR: This script can only be run in development mode!")
            print("Set FLASK_ENV=development or remove this check if you're sure.")
            return False

        user = User.query.filter_by(email=email).first()

        if not user:
            print(f"User with email '{email}' not found")
            return False

        user_id = user.id
        print(f"Found user: {user.email} (ID: {user_id})")
        print("Clearing all data...")

        # Delete in order of dependencies
        deleted_expenses = Expense.query.filter_by(user_id=user_id).delete()
        deleted_income = Income.query.filter_by(user_id=user_id).delete()
        deleted_recurring = RecurringExpense.query.filter_by(
            user_id=user_id).delete()
        deleted_budget_periods = BudgetPeriod.query.filter_by(
            user_id=user_id).delete()
        deleted_salary_periods = SalaryPeriod.query.filter_by(
            user_id=user_id).delete()
        deleted_debts = Debt.query.filter_by(user_id=user_id).delete()

        db.session.commit()

        print(f"\nDeleted:")
        print(f"  - {deleted_expenses} expenses")
        print(f"  - {deleted_income} income entries")
        print(f"  - {deleted_recurring} recurring expenses")
        print(f"  - {deleted_budget_periods} budget periods")
        print(f"  - {deleted_salary_periods} salary periods")
        print(f"  - {deleted_debts} debts")
        print(
            f"\nUser account '{email}' still exists - you can log in and import fresh data")

        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/clear_user_data.py <user_email>")
        sys.exit(1)

    email = sys.argv[1]
    success = clear_user_data(email)
    sys.exit(0 if success else 1)
