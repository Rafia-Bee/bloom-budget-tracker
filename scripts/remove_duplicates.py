"""
Bloom - Remove Duplicate Data Script

Removes duplicate debts, recurring expenses, and salary periods from the database.
Use this for cleaning up duplicates that may have been created before duplicate checking was implemented.

Usage: python scripts/remove_duplicates.py
"""

from backend.app import create_app
from backend.models.database import db, Debt, RecurringExpense, SalaryPeriod, BudgetPeriod, Income, Expense
import sys
import os
from collections import defaultdict

# Add parent directory to path to import backend modules FIRST
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import after path is set


def remove_duplicate_debts(user_id=None, dry_run=True):
    """Remove duplicate debts (same name + original_amount)."""
    query = Debt.query.filter_by(archived=False)
    if user_id:
        query = query.filter_by(user_id=user_id)

    all_debts = query.all()

    # Group by user_id, name, and original_amount
    debt_groups = defaultdict(list)
    for debt in all_debts:
        key = (debt.user_id, debt.name, debt.original_amount)
        debt_groups[key].append(debt)

    duplicates_found = 0
    duplicates_removed = 0

    for key, debts in debt_groups.items():
        if len(debts) > 1:
            # Keep the oldest one (first created), remove the rest
            debts.sort(key=lambda d: d.created_at)
            duplicates_found += len(debts) - 1

            print(f"\nFound {len(debts)} duplicate debts:")
            print(f"  Name: {debts[0].name}")
            print(f"  Original Amount: {debts[0].original_amount}")
            print(f"  User ID: {debts[0].user_id}")

            for i, debt in enumerate(debts):
                status = "KEEP" if i == 0 else "REMOVE"
                print(
                    f"    [{status}] ID: {debt.id}, Created: {debt.created_at}, Balance: {debt.current_balance}")

            if not dry_run:
                for debt in debts[1:]:
                    db.session.delete(debt)
                    duplicates_removed += 1

    return duplicates_found, duplicates_removed


def remove_duplicate_recurring_expenses(user_id=None, dry_run=True):
    """Remove duplicate recurring expenses (same name + amount + category)."""
    query = RecurringExpense.query.filter_by(is_active=True)
    if user_id:
        query = query.filter_by(user_id=user_id)

    all_recurring = query.all()

    # Group by user_id, name, amount, and category
    recurring_groups = defaultdict(list)
    for recurring in all_recurring:
        key = (recurring.user_id, recurring.name,
               recurring.amount, recurring.category)
        recurring_groups[key].append(recurring)

    duplicates_found = 0
    duplicates_removed = 0

    for key, recurring_list in recurring_groups.items():
        if len(recurring_list) > 1:
            # Keep the oldest one (first created), remove the rest
            recurring_list.sort(key=lambda r: r.id)
            duplicates_found += len(recurring_list) - 1

            print(
                f"\nFound {len(recurring_list)} duplicate recurring expenses:")
            print(f"  Name: {recurring_list[0].name}")
            print(f"  Amount: {recurring_list[0].amount}")
            print(f"  Category: {recurring_list[0].category}")
            print(f"  User ID: {recurring_list[0].user_id}")

            for i, recurring in enumerate(recurring_list):
                status = "KEEP" if i == 0 else "REMOVE"
                print(
                    f"    [{status}] ID: {recurring.id}, Frequency: {recurring.frequency}, Start: {recurring.start_date}")

            if not dry_run:
                for recurring in recurring_list[1:]:
                    db.session.delete(recurring)
                    duplicates_removed += 1

    return duplicates_found, duplicates_removed


def remove_duplicate_salary_periods(user_id=None, dry_run=True):
    """Remove duplicate salary periods (same start_date + end_date)."""
    query = SalaryPeriod.query.filter_by(is_active=True)
    if user_id:
        query = query.filter_by(user_id=user_id)

    all_periods = query.all()

    # Group by user_id, start_date, and end_date
    period_groups = defaultdict(list)
    for period in all_periods:
        key = (period.user_id, period.start_date, period.end_date)
        period_groups[key].append(period)

    duplicates_found = 0
    duplicates_removed = 0

    for key, periods in period_groups.items():
        if len(periods) > 1:
            # Keep the oldest one (first created), remove the rest along with their budget periods
            periods.sort(key=lambda p: p.id)
            duplicates_found += len(periods) - 1

            print(f"\nFound {len(periods)} duplicate salary periods:")
            print(
                f"  Date Range: {periods[0].start_date} to {periods[0].end_date}")
            print(f"  User ID: {periods[0].user_id}")

            for i, period in enumerate(periods):
                status = "KEEP" if i == 0 else "REMOVE"
                budget_periods_count = len(period.budget_periods)
                print(
                    f"    [{status}] ID: {period.id}, Budget Periods: {budget_periods_count}, Weekly Budget: {period.weekly_budget}")

            if not dry_run:
                for period in periods[1:]:
                    # Delete associated budget periods first
                    for budget_period in period.budget_periods:
                        # Delete associated income/expenses
                        Income.query.filter_by(
                            budget_period_id=budget_period.id).delete()
                        Expense.query.filter_by(
                            budget_period_id=budget_period.id).delete()
                        db.session.delete(budget_period)

                    # Delete income/expenses not tied to budget periods but tied to salary period
                    Income.query.filter_by(user_id=period.user_id, budget_period_id=None).filter(
                        Income.scheduled_date.between(
                            period.start_date, period.end_date)
                    ).delete(synchronize_session=False)
                    Expense.query.filter_by(user_id=period.user_id, budget_period_id=None).filter(
                        Expense.date.between(
                            period.start_date, period.end_date)
                    ).delete(synchronize_session=False)

                    db.session.delete(period)
                    duplicates_removed += 1

    return duplicates_found, duplicates_removed


def main():
    """Main function to remove all duplicates."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Remove duplicate data from Bloom database')
    parser.add_argument('--user-id', type=int,
                        help='Only process data for specific user ID')
    parser.add_argument('--apply', action='store_true',
                        help='Actually remove duplicates (default is dry-run)')
    parser.add_argument('--debts-only', action='store_true',
                        help='Only process debts')
    parser.add_argument('--recurring-only', action='store_true',
                        help='Only process recurring expenses')
    parser.add_argument('--periods-only', action='store_true',
                        help='Only process salary periods')

    args = parser.parse_args()

    dry_run = not args.apply

    print("=" * 60)
    print("Bloom - Remove Duplicates Script")
    print("=" * 60)
    print(
        f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'APPLY (will remove duplicates)'}")
    if args.user_id:
        print(f"User ID Filter: {args.user_id}")
    print("=" * 60)

    app = create_app('development')
    with app.app_context():
        total_found = 0
        total_removed = 0

        # Process debts
        if not args.recurring_only and not args.periods_only:
            print("\n" + "=" * 60)
            print("Checking Debts for Duplicates...")
            print("=" * 60)
            found, removed = remove_duplicate_debts(args.user_id, dry_run)
            total_found += found
            total_removed += removed
            print(f"\nDebts: Found {found} duplicates" +
                  (f", removed {removed}" if not dry_run else ""))

        # Process recurring expenses
        if not args.debts_only and not args.periods_only:
            print("\n" + "=" * 60)
            print("Checking Recurring Expenses for Duplicates...")
            print("=" * 60)
            found, removed = remove_duplicate_recurring_expenses(
                args.user_id, dry_run)
            total_found += found
            total_removed += removed
            print(f"\nRecurring Expenses: Found {found} duplicates" + (
                f", removed {removed}" if not dry_run else ""))

        # Process salary periods
        if not args.debts_only and not args.recurring_only:
            print("\n" + "=" * 60)
            print("Checking Salary Periods for Duplicates...")
            print("=" * 60)
            found, removed = remove_duplicate_salary_periods(
                args.user_id, dry_run)
            total_found += found
            total_removed += removed
            print(f"\nSalary Periods: Found {found} duplicates" +
                  (f", removed {removed}" if not dry_run else ""))

        # Commit changes if not dry run
        if not dry_run and total_removed > 0:
            print("\n" + "=" * 60)
            print("Committing changes to database...")
            db.session.commit()
            print("✓ Changes committed successfully")

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total duplicates found: {total_found}")
        if not dry_run:
            print(f"Total duplicates removed: {total_removed}")
        else:
            print("\nℹ️  This was a dry run. No changes were made.")
            print("   Run with --apply flag to actually remove duplicates:")
            print("   python scripts/remove_duplicates.py --apply")
        print("=" * 60)


if __name__ == '__main__':
    main()
