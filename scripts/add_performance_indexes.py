"""
Add Performance Indexes Migration Script

Adds database indexes to Expense and Income tables for improved query performance.
This script is safe to run multiple times (checks if indexes exist before creating).

Usage:
    python scripts/add_performance_indexes.py
"""

from sqlalchemy import text, inspect
from backend.models.database import db
from backend.app import create_app
import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")))


def index_exists(inspector, table_name, index_name):
    """Check if an index already exists on a table."""
    indexes = inspector.get_indexes(table_name)
    return any(idx["name"] == index_name for idx in indexes)


def add_indexes():
    """Add performance indexes to expenses and income tables."""
    app = create_app()

    with app.app_context():
        inspector = inspect(db.engine)
        connection = db.engine.connect()

        print("=== Adding Performance Indexes ===\n")

        # Expense table indexes
        expense_indexes = [
            ("idx_expenses_user_id", "expenses", "user_id"),
            ("idx_expenses_date", "expenses", "date"),
            ("idx_expenses_category", "expenses", "category"),
            ("idx_expenses_payment_method", "expenses", "payment_method"),
            ("idx_expense_user_date", "expenses", "user_id, date"),
            ("idx_expense_user_category", "expenses", "user_id, category"),
            ("idx_expense_user_payment", "expenses", "user_id, payment_method"),
        ]

        # Income table indexes
        income_indexes = [
            ("idx_income_user_id", "income", "user_id"),
            ("idx_income_scheduled_date", "income", "scheduled_date"),
            ("idx_income_actual_date", "income", "actual_date"),
            ("idx_income_user_scheduled", "income", "user_id, scheduled_date"),
            ("idx_income_user_actual", "income", "user_id, actual_date"),
        ]

        all_indexes = expense_indexes + income_indexes

        created_count = 0
        skipped_count = 0

        for index_name, table_name, columns in all_indexes:
            if index_exists(inspector, table_name, index_name):
                print(f"⏭️  SKIP: {index_name} (already exists)")
                skipped_count += 1
            else:
                try:
                    # PostgreSQL and SQLite both support this syntax
                    sql = text(
                        f"CREATE INDEX {index_name} ON {table_name} ({columns})")
                    connection.execute(sql)
                    connection.commit()
                    print(
                        f"✅ CREATED: {index_name} on {table_name}({columns})")
                    created_count += 1
                except Exception as e:
                    print(f"❌ ERROR creating {index_name}: {str(e)}")

        connection.close()

        print(f"\n=== Migration Complete ===")
        print(f"Created: {created_count} indexes")
        print(f"Skipped: {skipped_count} indexes (already existed)")
        print(
            f"\n✅ Performance optimization complete! Queries on expenses and income should be significantly faster."
        )


if __name__ == "__main__":
    add_indexes()
