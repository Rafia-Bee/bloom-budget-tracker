"""
Debug script to investigate expense mismatches.
"""

from backend.models.database import db, User, Expense
from backend.app import create_app
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def debug_expenses():
    app = create_app()

    with app.app_context():
        user = User.query.filter_by(email="test@bloom.com").first()
        if not user:
            print("❌ Test user not found.")
            return

        # Check the specific expenses
        problem_ids = [120, 121, 122, 123, 124]

        for exp_id in problem_ids:
            expense = Expense.query.get(exp_id)
            if expense:
                print(f"\nExpense ID {exp_id}:")
                print(f"  Name: {expense.name}")
                print(f"  Amount: €{expense.amount/100:.2f}")
                print(f"  Date: {expense.date}")
                print(f"  budget_period_id: {expense.budget_period_id}")
                print(f"  Category: {expense.category}")
                print(f"  is_fixed_bill: {expense.is_fixed_bill}")

                # Check which period this date falls into
                if expense.budget_period_id:
                    from backend.models.database import BudgetPeriod

                    period = BudgetPeriod.query.get(expense.budget_period_id)
                    if period:
                        print(
                            f"  Period dates: {period.start_date} to {period.end_date}"
                        )
                        in_range = period.start_date <= expense.date <= period.end_date
                        print(f"  Date in period range? {in_range}")


if __name__ == "__main__":
    debug_expenses()
