"""
Database migration script for weekly budgeting feature.

This script adds:
- SalaryPeriod table
- salary_period_id, week_number, budget_amount columns to BudgetPeriod
- is_fixed_bill column to Expense

Run with: python migrate_weekly_budgets.py
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir.parent))

from backend.app import create_app
from backend.models.database import db


def migrate():
    """Apply migration for weekly budgeting feature."""
    app = create_app("development")

    with app.app_context():
        print("Starting migration for weekly budgeting feature...")

        # Check if tables exist
        inspector = db.inspect(db.engine)
        existing_tables = inspector.get_table_names()

        # Create new tables and columns
        with db.engine.connect() as conn:
            # Add SalaryPeriod table if it doesn't exist
            if "salary_periods" not in existing_tables:
                print("Creating salary_periods table...")
                conn.execute(
                    db.text(
                        """
                    CREATE TABLE salary_periods (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        salary_amount INTEGER NOT NULL,
                        fixed_bills_total INTEGER NOT NULL DEFAULT 0,
                        remaining_amount INTEGER NOT NULL,
                        weekly_budget INTEGER NOT NULL,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                """
                    )
                )
                conn.commit()
                print("✓ salary_periods table created")
            else:
                print("✓ salary_periods table already exists")

            # Check and add columns to budget_periods
            budget_period_columns = [col["name"] for col in inspector.get_columns("budget_periods")]

            if "salary_period_id" not in budget_period_columns:
                print("Adding salary_period_id to budget_periods...")
                conn.execute(
                    db.text(
                        """
                    ALTER TABLE budget_periods
                    ADD COLUMN salary_period_id INTEGER REFERENCES salary_periods(id)
                """
                    )
                )
                conn.commit()
                print("✓ salary_period_id column added")
            else:
                print("✓ salary_period_id column already exists")

            if "week_number" not in budget_period_columns:
                print("Adding week_number to budget_periods...")
                conn.execute(
                    db.text(
                        """
                    ALTER TABLE budget_periods
                    ADD COLUMN week_number INTEGER
                """
                    )
                )
                conn.commit()
                print("✓ week_number column added")
            else:
                print("✓ week_number column already exists")

            if "budget_amount" not in budget_period_columns:
                print("Adding budget_amount to budget_periods...")
                conn.execute(
                    db.text(
                        """
                    ALTER TABLE budget_periods
                    ADD COLUMN budget_amount INTEGER
                """
                    )
                )
                conn.commit()
                print("✓ budget_amount column added")
            else:
                print("✓ budget_amount column already exists")

            # Check and add column to expenses
            expense_columns = [col["name"] for col in inspector.get_columns("expenses")]

            if "is_fixed_bill" not in expense_columns:
                print("Adding is_fixed_bill to expenses...")
                conn.execute(
                    db.text(
                        """
                    ALTER TABLE expenses
                    ADD COLUMN is_fixed_bill BOOLEAN NOT NULL DEFAULT 0
                """
                    )
                )
                conn.commit()
                print("✓ is_fixed_bill column added")
            else:
                print("✓ is_fixed_bill column already exists")

            # Check and add column to recurring_expenses
            recurring_columns = [col["name"] for col in inspector.get_columns("recurring_expenses")]

            if "is_fixed_bill" not in recurring_columns:
                print("Adding is_fixed_bill to recurring_expenses...")
                conn.execute(
                    db.text(
                        """
                    ALTER TABLE recurring_expenses
                    ADD COLUMN is_fixed_bill BOOLEAN NOT NULL DEFAULT 0
                """
                    )
                )
                conn.commit()
                print("✓ is_fixed_bill column added to recurring_expenses")
            else:
                print("✓ is_fixed_bill column already exists in recurring_expenses")

        print("\n✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Create API endpoints for salary periods")
        print("2. Update frontend to show weekly budget UI")
        print("3. Implement leftover budget allocation")


if __name__ == "__main__":
    migrate()
