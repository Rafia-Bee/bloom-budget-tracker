"""
Migrate Postgres to SQLite

Exports all data from Render PostgreSQL database and imports into SQLite.
Run this before Dec 28, 2025 to preserve your data before Postgres expires.

Usage:
    python scripts/migrate_postgres_to_sqlite.py

Environment variables required:
    DATABASE_URL - Render PostgreSQL connection string
"""

import os
import sys
import time
from pathlib import Path

# Add project root to path BEFORE imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from sqlalchemy import create_engine, inspect
    from sqlalchemy.orm import sessionmaker
    from backend.models.database import (
        db,
        User,
        Expense,
        Income,
        Debt,
        SalaryPeriod,
        BudgetPeriod,
        RecurringExpense,
    )
except ImportError as e:
    print(f"ERROR: Missing required packages: {e}")
    print("\nInstall dependencies first:")
    print("  pip install sqlalchemy flask-sqlalchemy")
    sys.exit(1)


def migrate_data():
    """Migrate all data from Postgres to SQLite"""

    # Get Postgres URL
    postgres_url = os.getenv("DATABASE_URL")
    if not postgres_url:
        print("ERROR: DATABASE_URL environment variable not set")
        print("Get it from: Render Dashboard → Database → Internal Connection String")
        sys.exit(1)

    # Fix postgres:// → postgresql:// (Render uses old format)
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)

    # SQLite path
    sqlite_path = Path(__file__).parent.parent / "instance" / "bloom.db"
    sqlite_path.parent.mkdir(exist_ok=True)

    # Backup existing SQLite if it exists
    if sqlite_path.exists():
        backup_path = sqlite_path.parent / f"bloom_backup_{int(time.time())}.db"
        import shutil

        shutil.copy2(sqlite_path, backup_path)
        print(f"✓ Backed up existing SQLite to {backup_path}")
        sqlite_path.unlink()

    sqlite_url = f"sqlite:///{sqlite_path}"

    print("=" * 60)
    print("Postgres → SQLite Migration")
    print("=" * 60)
    print(f"Source: {postgres_url[:30]}...")
    print(f"Target: {sqlite_path}")
    print()

    try:
        # Connect to both databases
        postgres_engine = create_engine(postgres_url)
        sqlite_engine = create_engine(sqlite_url)

        PostgresSession = sessionmaker(bind=postgres_engine)
        SQLiteSession = sessionmaker(bind=sqlite_engine)

        pg_session = PostgresSession()
        sqlite_session = SQLiteSession()

        # Create SQLite schema
        print("Creating SQLite schema...")
        db.Model.metadata.create_all(sqlite_engine)
        print("✓ Schema created")
        print()

        # Migration order (respect foreign keys)
        models = [
            (User, "Users"),
            (SalaryPeriod, "Salary Periods"),
            (BudgetPeriod, "Budget Periods"),
            (Expense, "Expenses"),
            (Income, "Income"),
            (Debt, "Debts"),
            (RecurringExpense, "Recurring Expenses"),
        ]

        total_records = 0

        for model, name in models:
            print(f"Migrating {name}...")

            # Fetch all records from Postgres
            records = pg_session.query(model).all()
            count = len(records)

            if count == 0:
                print(f"  No records found")
                continue

            # Insert into SQLite
            for record in records:
                # Get record as dict
                record_dict = {
                    c.name: getattr(record, c.name) for c in model.__table__.columns
                }

                # Create new record in SQLite
                new_record = model(**record_dict)
                sqlite_session.add(new_record)

            sqlite_session.commit()
            total_records += count
            print(f"  ✓ Migrated {count} record(s)")

        print()
        print("=" * 60)
        print(f"✓ Migration completed successfully")
        print(f"  Total records migrated: {total_records}")
        print(f"  SQLite database: {sqlite_path}")
        print("=" * 60)

        pg_session.close()
        sqlite_session.close()

    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ Migration failed: {e}")
        print("=" * 60)
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    migrate_data()
