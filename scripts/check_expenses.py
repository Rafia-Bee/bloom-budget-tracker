"""
Check expenses in database (LOCALHOST ONLY)

Usage: python scripts/check_expenses.py <user_email>
"""

from backend.app import create_app
from backend.models.database import db, User, Expense
import sys
import os

# Add parent directory to path FIRST
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Now import backend modules


def check_expenses(email):
    """Check expenses for a user"""
    app = create_app()

    with app.app_context():
        user = User.query.filter_by(email=email).first()

        if not user:
            print(f"User with email '{email}' not found")
            return False

        user_id = user.id
        print(f"User: {user.email} (ID: {user_id})\n")

        # Get all expenses
        all_expenses = Expense.query.filter_by(user_id=user_id).all()
        print(f"Total expenses in database: {len(all_expenses)}\n")

        # Check for pre-existing debt
        pre_existing = Expense.query.filter_by(
            user_id=user_id, name="Pre-existing Credit Card Debt"
        ).first()

        if pre_existing:
            print("✅ PRE-EXISTING DEBT FOUND!")
            print(f"  Amount: €{pre_existing.amount/100:.2f}")
            print(f"  Date: {pre_existing.date}")
            print(f"  Category: {pre_existing.category}")
            print(f"  Subcategory: {pre_existing.subcategory}")
            print(f"  Payment method: {pre_existing.payment_method}")
            print(f"  Budget period ID: {pre_existing.budget_period_id}")
            print(f"  Notes: {pre_existing.notes}")
        else:
            print("❌ PRE-EXISTING DEBT NOT FOUND")

        # Show expenses without budget_period_id
        print("\n\nExpenses without budget_period_id:")
        no_period = Expense.query.filter_by(
            user_id=user_id, budget_period_id=None
        ).all()

        if no_period:
            for exp in no_period:
                print(
                    f"  - {exp.name}: €{exp.amount/100:.2f} ({exp.date}) - {exp.category}"
                )
        else:
            print("  None found")

        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/check_expenses.py <user_email>")
        sys.exit(1)

    email = sys.argv[1]
    success = check_expenses(email)
    sys.exit(0 if success else 1)
