"""
Migration: Remove duplicate Initial Balance entries

This script finds and removes duplicate "Initial Balance" income entries,
keeping only the earliest one (by actual_date) for each user.

Run manually on production after deploying the fix to prevent future duplicates.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app import create_app, db
from backend.models.database import Income
from sqlalchemy import func

app = create_app()


def remove_duplicate_initial_balances():
    """Remove duplicate Initial Balance entries, keeping earliest for each user."""
    with app.app_context():
        print("\n=== Removing Duplicate Initial Balance Entries ===\n")

        # Find all users with multiple Initial Balance entries
        users_with_duplicates = (
            db.session.query(Income.user_id, func.count(Income.id).label("count"))
            .filter(Income.type == "Initial Balance")
            .group_by(Income.user_id)
            .having(func.count(Income.id) > 1)
            .all()
        )

        if not users_with_duplicates:
            print("✓ No duplicate Initial Balance entries found")
            return

        print(
            f"Found {len(users_with_duplicates)} users with duplicate Initial Balance entries\n"
        )

        total_deleted = 0

        for user_id, count in users_with_duplicates:
            # Get all Initial Balance entries for this user, ordered by date
            entries = (
                Income.query.filter_by(user_id=user_id, type="Initial Balance")
                .order_by(Income.actual_date)
                .all()
            )

            # Keep the first (earliest) one
            keep_entry = entries[0]
            delete_entries = entries[1:]

            print(f"User {user_id}: Found {len(entries)} Initial Balance entries")
            print(
                f"  ✓ Keeping: ID={keep_entry.id}, Amount=€{keep_entry.amount/100:.2f}, Date={keep_entry.actual_date}"
            )

            for entry in delete_entries:
                print(
                    f"  ✗ Deleting: ID={entry.id}, Amount=€{entry.amount/100:.2f}, Date={entry.actual_date}"
                )
                db.session.delete(entry)
                total_deleted += 1

            print()

        # Commit all deletions
        db.session.commit()

        print(f"\n=== Migration Complete ===")
        print(f"Deleted {total_deleted} duplicate Initial Balance entries")
        print(f"Each user now has exactly 1 Initial Balance (their starting money)\n")


if __name__ == "__main__":
    try:
        remove_duplicate_initial_balances()
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
        sys.exit(1)
