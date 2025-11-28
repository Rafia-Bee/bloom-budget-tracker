"""
Fix imported salary periods by adding missing Initial Balance income entries.

Run this after importing salary periods to ensure debit card shows correct balance.
Usage: python scripts/fix_imported_salary_period.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.models.database import db, SalaryPeriod, Income, Expense
from datetime import timedelta

def fix_imported_salary_periods():
    app = create_app('development')

    with app.app_context():
        # Find all salary periods
        salary_periods = SalaryPeriod.query.all()

        print(f"Found {len(salary_periods)} salary period(s)")

        for sp in salary_periods:
            print(f"\n  Checking salary period {sp.id} for user {sp.user_id}")
            print(f"    Start: {sp.start_date}, Debit: €{sp.initial_debit_balance/100:.2f}")

            # Check if Initial Balance income already exists
            existing_income = Income.query.filter_by(
                user_id=sp.user_id,
                type='Initial Balance',
                actual_date=sp.start_date
            ).first()

            if existing_income:
                print(f"    ✓ Initial Balance already exists (€{existing_income.amount/100:.2f})")
            else:
                # Create Initial Balance income
                if sp.initial_debit_balance > 0:
                    initial_income = Income(
                        user_id=sp.user_id,
                        budget_period_id=None,
                        type='Initial Balance',
                        amount=sp.initial_debit_balance,
                        scheduled_date=sp.start_date,
                        actual_date=sp.start_date
                    )
                    db.session.add(initial_income)
                    print(f"    + Created Initial Balance income: €{sp.initial_debit_balance/100:.2f}")
                else:
                    print(f"    - No initial debit balance to add")

            # Check if Pre-existing Credit Card Debt exists
            pre_existing_debt = sp.credit_limit - sp.initial_credit_balance
            if pre_existing_debt > 0:
                existing_debt = Expense.query.filter_by(
                    user_id=sp.user_id,
                    name='Pre-existing Credit Card Debt',
                    date=sp.start_date - timedelta(days=1)
                ).first()

                if existing_debt:
                    print(f"    ✓ Pre-existing debt already exists (€{existing_debt.amount/100:.2f})")
                else:
                    debt_expense = Expense(
                        user_id=sp.user_id,
                        budget_period_id=None,
                        name='Pre-existing Credit Card Debt',
                        amount=pre_existing_debt,
                        category='Debt',
                        subcategory='Credit Card',
                        payment_method='Credit card',
                        date=sp.start_date - timedelta(days=1),
                        is_fixed_bill=False,
                        notes='Existing credit card balance at budget period start'
                    )
                    db.session.add(debt_expense)
                    print(f"    + Created Pre-existing Credit Card Debt: €{pre_existing_debt/100:.2f}")

        db.session.commit()
        print("\n✅ All salary periods fixed!")

if __name__ == '__main__':
    fix_imported_salary_periods()
