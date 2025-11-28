"""
Check budget period date ranges and find overlaps or gaps
"""
from backend.models.database import db, BudgetPeriod, Expense, SalaryPeriod
from backend.app import create_app
from datetime import datetime
import sys
import os
# Add parent directory to path FIRST
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


app = create_app()

with app.app_context():
    print("\n=== SALARY PERIODS ===")
    salary_periods = SalaryPeriod.query.filter_by(is_active=True).all()

    for sp in salary_periods:
        print(f"\nSalary Period ID: {sp.id}")
        print(f"  Date Range: {sp.start_date} to {sp.end_date}")
        print(f"  User ID: {sp.user_id}")

        weeks = BudgetPeriod.query.filter_by(
            salary_period_id=sp.id).order_by(BudgetPeriod.week_number).all()

        print(f"  Weeks:")
        for week in weeks:
            print(
                f"    Week {week.week_number}: ID={week.id}, {week.start_date} to {week.end_date}")

            # Check for expenses in this week
            expenses = Expense.query.filter_by(budget_period_id=week.id).all()
            if expenses:
                print(f"      {len(expenses)} expenses:")
                for exp in expenses:
                    date_in_range = week.start_date <= exp.date <= week.end_date
                    marker = "✓" if date_in_range else "✗ MISMATCH"
                    print(
                        f"        {marker} {exp.name}: {exp.date} (€{exp.amount/100:.2f})")

    print("\n=== STANDALONE BUDGET PERIODS (no salary_period_id) ===")
    standalone = BudgetPeriod.query.filter_by(salary_period_id=None).all()

    for bp in standalone:
        print(f"\nBudget Period ID: {bp.id}")
        print(f"  Date Range: {bp.start_date} to {bp.end_date}")
        print(f"  Type: {bp.period_type}")
        print(f"  User ID: {bp.user_id}")
