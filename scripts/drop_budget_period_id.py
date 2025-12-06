"""
Migration Script: Drop budget_period_id Columns

Removes budget_period_id foreign key columns from Expense, Income, and PeriodSuggestion tables.
This migration completes the transition to date-based expense/income tracking (Issue #50).

SAFETY CHECKS:
- Verifies backend code no longer uses budget_period_id in queries
- Creates backup before modification
- Tests database integrity after changes

Run this script with: python scripts/drop_budget_period_id.py
"""

import os
from datetime import datetime
from sqlalchemy import text, inspect
from backend.models.database import db
from backend.app import create_app
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def verify_no_budget_period_id_queries():
    """Check that backend routes don't use budget_period_id in queries"""
    routes_dir = Path(__file__).parent.parent / "backend" / "routes"

    # Files that should NOT contain budget_period_id queries
    files_to_check = [
        routes_dir / "expenses.py",
        routes_dir / "income.py",
        routes_dir / "salary_periods.py",
    ]

    problematic_lines = []
    for filepath in files_to_check:
        if not filepath.exists():
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')

            for i, line in enumerate(lines, 1):
                # Check for budget_period_id usage in queries (excluding comments)
                if 'budget_period_id' in line.lower():
                    # Skip if it's just removing it from response or a comment
                    if 'budget_period_id' in line and 'filter' in line.lower():
                        problematic_lines.append(
                            f"{filepath.name}:{i}: {line.strip()}")

    if problematic_lines:
        print("⚠️  WARNING: Found budget_period_id usage in backend queries:")
        for line in problematic_lines:
            print(f"  {line}")
        response = input("\nContinue anyway? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Migration cancelled")
            return False
    else:
        print("✅ No budget_period_id queries found in backend routes")

    return True


def backup_database():
    """Create a backup of the current database"""
    print("\n📦 Creating database backup...")

    # Check if we're using SQLite or PostgreSQL
    db_path = Path(__file__).parent.parent / "instance" / "bloom.db"

    if db_path.exists():
        # SQLite backup
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = db_path.parent / f"bloom_backup_{timestamp}.db"

        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ SQLite backup created: {backup_path}")
        return True
    else:
        # PostgreSQL - suggest manual backup
        print("⚠️  Using PostgreSQL - please ensure you have a recent backup")
        print("   You can create one with: python scripts/backup_database.py")
        response = input("\nContinue without backup? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Migration cancelled")
            return False
        return True


def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def drop_column_sqlite(table_name, column_name):
    """Drop a column from SQLite table (requires recreating table)"""
    inspector = inspect(db.engine)
    columns = inspector.get_columns(table_name)

    # Get all columns except the one to drop
    remaining_columns = [col for col in columns if col['name'] != column_name]
    column_names = [col['name'] for col in remaining_columns]

    # Build column definitions for new table
    column_defs = []
    for col in remaining_columns:
        col_def = f"{col['name']} {col['type']}"
        if not col.get('nullable', True):
            col_def += " NOT NULL"
        if col.get('default') is not None:
            col_def += f" DEFAULT {col['default']}"
        column_defs.append(col_def)

    # Create new table without the column
    print(f"  Creating temporary table without {column_name}...")
    db.session.execute(text(f"""
        CREATE TABLE {table_name}_new (
            {', '.join(column_defs)}
        )
    """))

    # Copy data
    print(f"  Copying data...")
    column_list = ', '.join(column_names)
    db.session.execute(text(f"""
        INSERT INTO {table_name}_new ({column_list})
        SELECT {column_list}
        FROM {table_name}
    """))

    # Drop old table and rename new one
    print(f"  Replacing original table...")
    db.session.execute(text(f"DROP TABLE {table_name}"))
    db.session.execute(
        text(f"ALTER TABLE {table_name}_new RENAME TO {table_name}"))

    db.session.commit()


def drop_column_postgres(table_name, column_name):
    """Drop a column from PostgreSQL table"""
    print(f"  Dropping column {column_name} from {table_name}...")
    db.session.execute(
        text(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS {column_name}"))
    db.session.commit()


def drop_budget_period_id_columns():
    """Drop budget_period_id from Expense, Income, and PeriodSuggestion tables"""
    print("\n🔧 Dropping budget_period_id columns...")

    # Detect database type
    db_url = str(db.engine.url)
    is_postgres = 'postgresql' in db_url

    tables_to_modify = [
        ('expenses', 'budget_period_id'),
        ('income', 'budget_period_id'),
        ('period_suggestions', 'budget_period_id'),
    ]

    for table_name, column_name in tables_to_modify:
        if not check_column_exists(table_name, column_name):
            print(
                f"  ⏭️  Column {column_name} already removed from {table_name}")
            continue

        print(f"  📝 Removing {column_name} from {table_name}...")

        try:
            if is_postgres:
                drop_column_postgres(table_name, column_name)
            else:
                drop_column_sqlite(table_name, column_name)

            print(f"  ✅ Successfully removed {column_name} from {table_name}")
        except Exception as e:
            print(f"  ❌ Error removing {column_name} from {table_name}: {e}")
            raise


def verify_database_integrity():
    """Run basic checks to ensure database is still functional"""
    print("\n🔍 Verifying database integrity...")

    try:
        # Check that tables still exist and are queryable
        from backend.models.database import Expense, Income, PeriodSuggestion, BudgetPeriod

        # Try to query each table
        Expense.query.first()
        Income.query.first()
        PeriodSuggestion.query.first()
        BudgetPeriod.query.first()

        print("✅ All tables are accessible")

        # Check that budget_period_id columns are gone
        inspector = inspect(db.engine)

        for table_name in ['expenses', 'income', 'period_suggestions']:
            columns = [col['name']
                       for col in inspector.get_columns(table_name)]
            if 'budget_period_id' in columns:
                print(
                    f"❌ Column budget_period_id still exists in {table_name}")
                return False

        print("✅ budget_period_id columns successfully removed")
        return True

    except Exception as e:
        print(f"❌ Database integrity check failed: {e}")
        return False


def main():
    """Execute migration"""
    print("=" * 60)
    print("Migration: Drop budget_period_id Columns (Issue #50 Phase 3)")
    print("=" * 60)

    # Step 1: Verify backend code is ready
    if not verify_no_budget_period_id_queries():
        return

    # Step 2: Create backup
    if not backup_database():
        return

    # Step 3: Perform migration
    app = create_app()
    with app.app_context():
        try:
            drop_budget_period_id_columns()

            # Step 4: Verify integrity
            if not verify_database_integrity():
                print("\n❌ Migration failed integrity checks!")
                print("   Restore from backup if needed")
                return

            print("\n" + "=" * 60)
            print("✅ Migration completed successfully!")
            print("=" * 60)
            print("\nNext steps:")
            print("1. Update backend/models/database.py to remove budget_period_id")
            print("2. Remove budget_period_id from seed_data.py")
            print("3. Update tests to remove budget_period_id assertions")
            print("4. Run full test suite to verify everything works")

        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            print("   Database may be in inconsistent state - restore from backup")
            raise


if __name__ == "__main__":
    main()
