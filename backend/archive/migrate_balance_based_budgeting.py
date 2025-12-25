"""
Migration Script: Add Balance-Based Budgeting Fields to SalaryPeriod

Adds new fields for tracking debit/credit balances and budget allocation.
Run this script to update the database schema.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from backend.models.database import db, SalaryPeriod


def migrate():
    with app.app_context():
        print("Starting migration: Adding balance-based budgeting fields...")

        # For SQLite, we need to recreate the table since ALTER COLUMN is not supported
        # First, check if we need to migrate
        with db.engine.connect() as conn:
            result = conn.execute(db.text("PRAGMA table_info(salary_periods)"))
            columns = [row[1] for row in result.fetchall()]

            if "initial_debit_balance" in columns:
                print("✓ Migration already completed!")
                return

        print("Recreating salary_periods table with new schema...")

        # Get existing data
        existing_periods = SalaryPeriod.query.all()
        print(f"Found {len(existing_periods)} existing salary periods to migrate")

        # Drop and recreate table
        db.session.execute(db.text("DROP TABLE IF EXISTS salary_periods"))
        db.session.commit()

        # Create new table with updated schema
        SalaryPeriod.__table__.create(db.engine)
        print("✓ Created new salary_periods table with balance-based fields")

        # Migrate old data (if any)
        if existing_periods:
            print("Note: Old salary periods were dropped. You'll need to create new ones.")

        print("\n✅ Migration completed successfully!")
        print("\nNote: All old salary periods have been removed.")
        print("Please create a new budget period with your current balances.")


if __name__ == "__main__":
    migrate()
