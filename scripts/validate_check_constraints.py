"""
Validate existing database data against proposed CHECK constraints.
Run this before applying migration e8f5c3a1b9d4 to ensure no violations.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app, db
from backend.models.database import (
    User, SalaryPeriod, BudgetPeriod, Expense, Income, Debt,
    RecurringExpense, CreditCardSettings, PeriodSuggestion
)


def validate_check_constraints():
    """Validate all records against proposed CHECK constraints."""
    app = create_app('development')
    violations = []

    with app.app_context():
        print("Validating existing data against CHECK constraints...\n")

        # User constraints
        print("Checking User table...")
        invalid_users = User.query.filter(~User.email.like('%@%')).all()
        if invalid_users:
            violations.append(f"✗ {len(invalid_users)} users with invalid email format")
            for u in invalid_users:
                print(f"  - User {u.id}: {u.email}")

        invalid_attempts = User.query.filter(User.failed_login_attempts < 0).all()
        if invalid_attempts:
            violations.append(f"✗ {len(invalid_attempts)} users with negative failed_login_attempts")

        if not invalid_users and not invalid_attempts:
            print("✓ User table valid\n")
        else:
            print()

        # SalaryPeriod constraints
        print("Checking SalaryPeriod table...")
        invalid_dates = SalaryPeriod.query.filter(
            SalaryPeriod.start_date >= SalaryPeriod.end_date
        ).all()
        if invalid_dates:
            violations.append(f"✗ {len(invalid_dates)} salary periods with invalid date range")
            for sp in invalid_dates:
                print(f"  - SalaryPeriod {sp.id}: {sp.start_date} >= {sp.end_date}")

        invalid_budget = SalaryPeriod.query.filter(SalaryPeriod.weekly_budget <= 0).all()
        if invalid_budget:
            violations.append(f"✗ {len(invalid_budget)} salary periods with non-positive weekly_budget")

        invalid_debit = SalaryPeriod.query.filter(SalaryPeriod.initial_debit_balance < 0).all()
        if invalid_debit:
            violations.append(f"✗ {len(invalid_debit)} salary periods with negative initial_debit_balance")

        invalid_credit_limit = SalaryPeriod.query.filter(SalaryPeriod.credit_limit <= 0).all()
        if invalid_credit_limit:
            violations.append(f"✗ {len(invalid_credit_limit)} salary periods with non-positive credit_limit")

        if not any([invalid_dates, invalid_budget, invalid_debit, invalid_credit_limit]):
            print("✓ SalaryPeriod table valid\n")
        else:
            print()

        # BudgetPeriod constraints
        print("Checking BudgetPeriod table...")
        invalid_bp_dates = BudgetPeriod.query.filter(
            BudgetPeriod.start_date >= BudgetPeriod.end_date
        ).all()
        if invalid_bp_dates:
            violations.append(f"✗ {len(invalid_bp_dates)} budget periods with invalid date range")
            for bp in invalid_bp_dates:
                print(f"  - BudgetPeriod {bp.id}: {bp.start_date} >= {bp.end_date}")

        invalid_week = BudgetPeriod.query.filter(
            BudgetPeriod.week_number.isnot(None),
            ~BudgetPeriod.week_number.between(1, 4)
        ).all()
        if invalid_week:
            violations.append(f"✗ {len(invalid_week)} budget periods with week_number outside 1-4")
            for bp in invalid_week:
                print(f"  - BudgetPeriod {bp.id}: week_number={bp.week_number}")

        invalid_bp_amount = BudgetPeriod.query.filter(
            BudgetPeriod.budget_amount.isnot(None),
            BudgetPeriod.budget_amount <= 0
        ).all()
        if invalid_bp_amount:
            violations.append(f"✗ {len(invalid_bp_amount)} budget periods with non-positive budget_amount")

        if not any([invalid_bp_dates, invalid_week, invalid_bp_amount]):
            print("✓ BudgetPeriod table valid\n")
        else:
            print()

        # Expense constraints
        print("Checking Expense table...")
        invalid_expenses = Expense.query.filter(Expense.amount <= 0).all()
        if invalid_expenses:
            violations.append(f"✗ {len(invalid_expenses)} expenses with non-positive amount")
            for exp in invalid_expenses[:5]:  # Show first 5
                print(f"  - Expense {exp.id}: amount={exp.amount}")
            if len(invalid_expenses) > 5:
                print(f"  ... and {len(invalid_expenses) - 5} more")
        else:
            print("✓ Expense table valid\n")

        # Income constraints
        print("Checking Income table...")
        invalid_income = Income.query.filter(Income.amount <= 0).all()
        if invalid_income:
            violations.append(f"✗ {len(invalid_income)} income records with non-positive amount")
        else:
            print("✓ Income table valid\n")

        # Debt constraints
        print("Checking Debt table...")
        invalid_debt_orig = Debt.query.filter(Debt.original_amount <= 0).all()
        if invalid_debt_orig:
            violations.append(f"✗ {len(invalid_debt_orig)} debts with non-positive original_amount")

        invalid_debt_balance = Debt.query.filter(Debt.current_balance < 0).all()
        if invalid_debt_balance:
            violations.append(f"✗ {len(invalid_debt_balance)} debts with negative current_balance")

        invalid_debt_payment = Debt.query.filter(Debt.monthly_payment <= 0).all()
        if invalid_debt_payment:
            violations.append(f"✗ {len(invalid_debt_payment)} debts with non-positive monthly_payment")

        if not any([invalid_debt_orig, invalid_debt_balance, invalid_debt_payment]):
            print("✓ Debt table valid\n")
        else:
            print()

        # RecurringExpense constraints
        print("Checking RecurringExpense table...")
        invalid_rec_amount = RecurringExpense.query.filter(RecurringExpense.amount <= 0).all()
        if invalid_rec_amount:
            violations.append(f"✗ {len(invalid_rec_amount)} recurring expenses with non-positive amount")

        invalid_rec_dates = RecurringExpense.query.filter(
            RecurringExpense.end_date.isnot(None),
            RecurringExpense.start_date >= RecurringExpense.end_date
        ).all()
        if invalid_rec_dates:
            violations.append(f"✗ {len(invalid_rec_dates)} recurring expenses with invalid date range")

        invalid_dom = RecurringExpense.query.filter(
            RecurringExpense.day_of_month.isnot(None),
            ~RecurringExpense.day_of_month.between(1, 31)
        ).all()
        if invalid_dom:
            violations.append(f"✗ {len(invalid_dom)} recurring expenses with day_of_month outside 1-31")

        invalid_dow = RecurringExpense.query.filter(
            RecurringExpense.day_of_week.isnot(None),
            ~RecurringExpense.day_of_week.between(0, 6)
        ).all()
        if invalid_dow:
            violations.append(f"✗ {len(invalid_dow)} recurring expenses with day_of_week outside 0-6")

        if not any([invalid_rec_amount, invalid_rec_dates, invalid_dom, invalid_dow]):
            print("✓ RecurringExpense table valid\n")
        else:
            print()

        # CreditCardSettings constraints
        print("Checking CreditCardSettings table...")
        invalid_cc = CreditCardSettings.query.filter(CreditCardSettings.credit_limit <= 0).all()
        if invalid_cc:
            violations.append(f"✗ {len(invalid_cc)} credit card settings with non-positive credit_limit")
        else:
            print("✓ CreditCardSettings table valid\n")

        # PeriodSuggestion constraints
        print("Checking PeriodSuggestion table...")
        invalid_ps = PeriodSuggestion.query.filter(PeriodSuggestion.amount <= 0).all()
        if invalid_ps:
            violations.append(f"✗ {len(invalid_ps)} period suggestions with non-positive amount")
        else:
            print("✓ PeriodSuggestion table valid\n")

        # Summary
        print("=" * 60)
        if violations:
            print(f"❌ VALIDATION FAILED - {len(violations)} issue(s) found:\n")
            for v in violations:
                print(f"  {v}")
            print("\n⚠️  Fix these issues before applying CHECK constraint migration!")
            return False
        else:
            print("✅ ALL CHECKS PASSED - Safe to apply CHECK constraints migration")
            return True


if __name__ == '__main__':
    success = validate_check_constraints()
    sys.exit(0 if success else 1)
