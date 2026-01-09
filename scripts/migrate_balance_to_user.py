"""
Bloom - Balance Data Migration Script

Phase 2 of Issue #149 - Migrate existing Income/Expense markers to User fields.

This script migrates balance tracking data from Income/Expense marker records
to explicit User model fields. After this migration, the balance calculation
will use User fields instead of querying Income/Expense tables.

Usage:
    python scripts/migrate_balance_to_user.py

    Or with dry-run mode (shows what would be changed without modifying):
    python scripts/migrate_balance_to_user.py --dry-run

What it does:
1. For each user, finds the earliest "Initial Balance" income record
2. Finds the earliest "Pre-existing Credit Card Debt" expense record
3. Populates User.balance_start_date, user_initial_debit_balance,
   user_initial_credit_limit, user_initial_credit_debt
4. Sets User.balance_mode = "sync" (default)

Note: This migration is non-destructive. The original Income/Expense marker
records are NOT deleted - they will be removed in Phase 6 after the new
system is verified working.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from backend.app import create_app
from backend.models.database import db, User, Income, Expense, SalaryPeriod
from sqlalchemy import and_


def migrate_user_balance(user: User, dry_run: bool = False) -> dict:
    """
    Migrate balance data for a single user.

    Args:
        user: User model instance
        dry_run: If True, don't actually save changes

    Returns:
        dict with migration results
    """
    result = {
        "user_id": user.id,
        "email": user.email,
        "changes": [],
        "already_migrated": False,
    }

    # Check if already migrated (balance_start_date is set)
    if user.balance_start_date is not None:
        result["already_migrated"] = True
        result["changes"].append("Skipped - already migrated")
        return result

    # Find earliest "Initial Balance" income record
    earliest_initial_balance = (
        db.session.query(Income)
        .filter(
            and_(
                Income.user_id == user.id,
                Income.type == "Initial Balance",
                Income.deleted_at.is_(None),
            )
        )
        .order_by(Income.actual_date)
        .first()
    )

    # Find earliest "Pre-existing Credit Card Debt" expense
    earliest_debt_marker = (
        db.session.query(Expense)
        .filter(
            and_(
                Expense.user_id == user.id,
                Expense.category == "Debt",
                Expense.subcategory == "Credit Card",
                Expense.name == "Pre-existing Credit Card Debt",
                Expense.deleted_at.is_(None),
            )
        )
        .order_by(Expense.date)
        .first()
    )

    # Find earliest salary period for credit limit
    earliest_salary_period = (
        db.session.query(SalaryPeriod)
        .filter(SalaryPeriod.user_id == user.id)
        .order_by(SalaryPeriod.start_date)
        .first()
    )

    # Determine balance_start_date
    if earliest_initial_balance:
        balance_start_date = earliest_initial_balance.actual_date
        initial_debit_balance = earliest_initial_balance.amount
        result["changes"].append(
            f"Found Initial Balance: €{initial_debit_balance/100:.2f} on {balance_start_date}"
        )
    elif earliest_salary_period:
        # Fallback: use earliest salary period start date
        balance_start_date = earliest_salary_period.start_date
        initial_debit_balance = earliest_salary_period.initial_debit_balance
        result["changes"].append(
            f"No Initial Balance found, using earliest salary period: {balance_start_date}"
        )
    else:
        # No data to migrate
        result["changes"].append("No salary periods found - nothing to migrate")
        return result

    # Get credit limit from earliest salary period
    if earliest_salary_period:
        initial_credit_limit = earliest_salary_period.credit_limit
        result["changes"].append(f"Credit limit: €{initial_credit_limit/100:.2f}")
    else:
        initial_credit_limit = 0

    # Get initial credit debt
    if earliest_debt_marker:
        initial_credit_debt = earliest_debt_marker.amount
        result["changes"].append(
            f"Found Pre-existing Credit Card Debt: €{initial_credit_debt/100:.2f}"
        )
    else:
        # Calculate from earliest salary period (limit - available = debt)
        if earliest_salary_period:
            initial_credit_debt = (
                earliest_salary_period.credit_limit
                - earliest_salary_period.initial_credit_balance
            )
            if initial_credit_debt > 0:
                result["changes"].append(
                    f"Calculated initial credit debt from salary period: €{initial_credit_debt/100:.2f}"
                )
            else:
                initial_credit_debt = 0
        else:
            initial_credit_debt = 0

    # Apply changes
    if not dry_run:
        user.balance_start_date = balance_start_date
        user.user_initial_debit_balance = initial_debit_balance
        user.user_initial_credit_limit = initial_credit_limit
        user.user_initial_credit_debt = initial_credit_debt
        user.balance_mode = "sync"
        result["changes"].append("Changes applied")
    else:
        result["changes"].append(f"Would set balance_start_date = {balance_start_date}")
        result["changes"].append(f"Would set user_initial_debit_balance = {initial_debit_balance}")
        result["changes"].append(f"Would set user_initial_credit_limit = {initial_credit_limit}")
        result["changes"].append(f"Would set user_initial_credit_debt = {initial_credit_debt}")
        result["changes"].append("Would set balance_mode = 'sync'")

    return result


def run_migration(dry_run: bool = False):
    """
    Run the migration for all users.

    Args:
        dry_run: If True, show what would happen without making changes
    """
    print("=" * 60)
    print("Balance Data Migration - Phase 2 of Issue #149")
    print("=" * 60)
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE'}")
    print()

    # Get all users
    users = User.query.all()
    print(f"Found {len(users)} users to process")
    print()

    migrated_count = 0
    skipped_count = 0
    no_data_count = 0

    for user in users:
        print(f"Processing user {user.id} ({user.email})...")
        result = migrate_user_balance(user, dry_run)

        for change in result["changes"]:
            print(f"  - {change}")

        if result["already_migrated"]:
            skipped_count += 1
        elif "nothing to migrate" in str(result["changes"]).lower():
            no_data_count += 1
        else:
            migrated_count += 1
        print()

    # Commit changes if not dry run
    if not dry_run:
        db.session.commit()
        print("Changes committed to database")

    print("=" * 60)
    print("Summary:")
    print(f"  Migrated: {migrated_count}")
    print(f"  Skipped (already done): {skipped_count}")
    print(f"  No data to migrate: {no_data_count}")
    print("=" * 60)

    return {
        "migrated": migrated_count,
        "skipped": skipped_count,
        "no_data": no_data_count,
    }


def verify_migration():
    """
    Verify that the migration was successful.
    """
    print()
    print("=" * 60)
    print("Verification")
    print("=" * 60)

    users_with_data = (
        User.query
        .filter(User.balance_start_date.isnot(None))
        .all()
    )

    print(f"Users with balance_start_date set: {len(users_with_data)}")
    print()

    for user in users_with_data[:5]:  # Show first 5
        print(f"User {user.id} ({user.email}):")
        print(f"  balance_start_date: {user.balance_start_date}")
        print(f"  user_initial_debit_balance: €{user.user_initial_debit_balance/100:.2f}")
        print(f"  user_initial_credit_limit: €{user.user_initial_credit_limit/100:.2f}")
        print(f"  user_initial_credit_debt: €{user.user_initial_credit_debt/100:.2f}")
        print(f"  balance_mode: {user.balance_mode}")
        print()

    if len(users_with_data) > 5:
        print(f"... and {len(users_with_data) - 5} more users")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate balance data to User model")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without making changes"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Only verify existing migration, don't run migration"
    )
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if args.verify:
            verify_migration()
        else:
            run_migration(dry_run=args.dry_run)
            verify_migration()
