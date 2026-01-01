"""
Bloom - Database Maintenance & Utilities Script

Consolidates migration, cleanup, and maintenance operations.
Run with: python scripts/maintenance.py <command>

Available commands:
  migrate              - Run all pending database migrations
  cleanup-recurring    - Remove orphaned recurring expenses
  remove-duplicates    - Remove duplicate recurring expense templates
  verify-db           - Verify database integrity
  purge-deleted [days] - Permanently delete soft-deleted records (default: 30 days)

Security Note (#81):
- Table/column names are hardcoded constants (no user input)
- Uses SQLAlchemy introspection where possible
- Raw SQL limited to DDL operations (migrations)
"""

import sys
import os
from datetime import datetime
from sqlalchemy import text, inspect

# Add parent directory to path BEFORE imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import db, Expense, RecurringExpense, Debt
from backend.app import create_app

# Security (#81): Whitelist of allowed tables for validation
ALLOWED_TABLES = {
    "users",
    "expenses",
    "income",
    "debts",
    "recurring_expenses",
    "budget_periods",
    "salary_periods",
    "user_defaults",
    "credit_card_settings",
    "period_suggestions",
    "password_reset_tokens",
}

# Security (#81): Whitelist of allowed columns per table
ALLOWED_COLUMNS = {
    "debts": {"archived", "amount", "name", "user_id", "id"},
    "expenses": {"recurring_template_id", "amount", "name", "date", "user_id", "id"},
}


def validate_table_name(table_name: str) -> str:
    """
    Security (#81): Validate table name against whitelist.
    Prevents SQL injection in table introspection queries.

    Args:
        table_name: Table name to validate

    Returns:
        Validated table name

    Raises:
        ValueError: If table name is not in whitelist
    """
    if table_name not in ALLOWED_TABLES:
        raise ValueError(
            f"Invalid table name: '{table_name}'. Allowed tables: {ALLOWED_TABLES}"
        )
    return table_name


def validate_column_name(table_name: str, column_name: str) -> str:
    """
    Security (#81): Validate column name for specific table.

    Args:
        table_name: Table name (must be validated first)
        column_name: Column name to validate

    Returns:
        Validated column name

    Raises:
        ValueError: If column name is not allowed for this table
    """
    if table_name not in ALLOWED_COLUMNS:
        raise ValueError(f"No column validation defined for table '{table_name}'")

    if column_name not in ALLOWED_COLUMNS[table_name]:
        raise ValueError(
            f"Invalid column name: '{column_name}' for table '{table_name}'. "
            f"Allowed columns: {ALLOWED_COLUMNS[table_name]}"
        )

    return column_name


def column_exists(table_name: str, column_name: str) -> bool:
    """
    Security (#81): Safely check if column exists using SQLAlchemy introspection.

    Args:
        table_name: Table name to check
        column_name: Column name to check

    Returns:
        True if column exists, False otherwise
    """
    # Validate inputs first
    validate_table_name(table_name)
    validate_column_name(table_name, column_name)

    # Use SQLAlchemy inspector (safer than raw SQL)
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns(table_name)]

    return column_name in columns


def table_exists(table_name: str) -> bool:
    """
    Security (#81): Safely check if table exists using SQLAlchemy introspection.

    Args:
        table_name: Table name to check

    Returns:
        True if table exists, False otherwise
    """
    # Validate input first
    validate_table_name(table_name)

    # Use SQLAlchemy inspector (safer than raw SQL)
    inspector = inspect(db.engine)
    return table_name in inspector.get_table_names()


def print_header(title):
    """Print formatted section header."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}\n")


def migrate_add_archived():
    """
    Add 'archived' column to debts table.
    Security (#81): Uses validated table/column names.
    """
    print("Checking for archived column in debts table...")

    # Security (#81): Use safe introspection helpers
    if not column_exists("debts", "archived"):
        print("Adding 'archived' column to debts table...")
        with db.engine.connect() as conn:
            try:
                # Column name is validated, safe to use in DDL
                conn.execute(
                    text(
                        "ALTER TABLE debts ADD COLUMN archived BOOLEAN DEFAULT 0 NOT NULL"
                    )
                )
                conn.commit()
                print("✓ 'archived' column added successfully")
            except Exception as e:
                print(f"✗ Error: {e}")
                conn.rollback()
                raise
    else:
        print("✓ 'archived' column already exists")


def migrate_add_recurring_expenses():
    """
    Add recurring_expenses table and recurring_template_id to expenses.
    Security (#81): Uses validated table names and safe introspection.
    """
    print("Checking for recurring_expenses table...")

    try:
        # Security (#81): Use safe introspection helper
        if not table_exists("recurring_expenses"):
            print("Creating recurring_expenses table...")
            db.session.execute(
                text(
                    """
                CREATE TABLE recurring_expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(200) NOT NULL,
                    amount INTEGER NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    subcategory VARCHAR(100),
                    payment_method VARCHAR(20) NOT NULL DEFAULT 'credit',
                    frequency VARCHAR(20) NOT NULL,
                    frequency_value INTEGER,
                    day_of_month INTEGER,
                    day_of_week INTEGER,
                    start_date DATE NOT NULL,
                    end_date DATE,
                    next_due_date DATE NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """
                )
            )
            print("✓ recurring_expenses table created")
        else:
            print("✓ recurring_expenses table already exists")

        # Security (#81): Use safe column check
        if not column_exists("expenses", "recurring_template_id"):
            print("Adding recurring_template_id column to expenses table...")
            db.session.execute(
                text(
                    """
                ALTER TABLE expenses
                ADD COLUMN recurring_template_id INTEGER
                REFERENCES recurring_expenses(id)
            """
                )
            )
            print("✓ recurring_template_id column added")
        else:
            print("✓ recurring_template_id column already exists")

        db.session.commit()
        print("✓ Recurring expenses migration complete")

    except Exception as e:
        db.session.rollback()
        print(f"✗ Migration failed: {str(e)}")
        raise


def migrate_add_password_reset_tokens():
    """
    Add password_reset_tokens table.
    Security (#81): Uses validated table names and safe introspection.
    """
    print("Checking for password_reset_tokens table...")

    # Security (#81): Use safe table existence check
    if not table_exists("password_reset_tokens"):
        print("Creating password_reset_tokens table...")
        with db.engine.connect() as conn:
            try:
                conn.execute(
                    text(
                        """
                    CREATE TABLE password_reset_tokens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        token VARCHAR(255) UNIQUE NOT NULL,
                        expires_at DATETIME NOT NULL,
                        is_used BOOLEAN DEFAULT 0 NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                """
                    )
                )
                conn.commit()
                conn.commit()
                print("✓ password_reset_tokens table created successfully")
            except Exception as e:
                print(f"✗ Error: {e}")
                conn.rollback()
                raise
    else:
        print("✓ password_reset_tokens table already exists")


def migrate_flexible_sub_periods():
    """
    Update constraints for flexible sub-periods feature (#9).
    - Adds num_sub_periods column to salary_periods
    - Updates budget_periods date_range constraint to allow single-day periods
    """
    print("Checking for flexible sub-periods migration...")

    # Check if num_sub_periods column exists
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("salary_periods")]

    if "num_sub_periods" not in columns:
        print("Adding num_sub_periods column to salary_periods...")
        with db.engine.connect() as conn:
            try:
                conn.execute(
                    text(
                        "ALTER TABLE salary_periods ADD COLUMN num_sub_periods INTEGER NOT NULL DEFAULT 4"
                    )
                )
                conn.commit()
                print("✓ num_sub_periods column added")
            except Exception as e:
                print(f"✗ Error adding column: {e}")
                conn.rollback()
                raise
    else:
        print("✓ num_sub_periods column already exists")

    # Check if budget_periods constraint needs update (SQLite requires table recreation)
    print("Checking budget_periods date_range constraint...")
    with db.engine.connect() as conn:
        result = conn.execute(
            text("SELECT sql FROM sqlite_master WHERE name='budget_periods'")
        )
        schema = result.fetchone()[0]

        if "start_date < end_date" in schema:
            print("Updating budget_periods constraint for single-day periods...")
            try:
                conn.execute(text("PRAGMA foreign_keys=OFF"))

                # Create new table with updated constraint
                conn.execute(
                    text(
                        """
                    CREATE TABLE budget_periods_new (
                        id INTEGER NOT NULL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        salary_period_id INTEGER,
                        week_number INTEGER,
                        budget_amount INTEGER,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        period_type VARCHAR(50) NOT NULL,
                        created_at DATETIME,
                        CONSTRAINT check_budget_period_date_range CHECK (start_date <= end_date),
                        CONSTRAINT check_budget_period_positive_amount CHECK (budget_amount IS NULL OR budget_amount > 0),
                        CONSTRAINT check_budget_period_week_number CHECK (week_number IS NULL OR week_number >= 1),
                        FOREIGN KEY(salary_period_id) REFERENCES salary_periods (id) ON DELETE CASCADE,
                        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                """
                    )
                )

                # Copy data
                conn.execute(
                    text("INSERT INTO budget_periods_new SELECT * FROM budget_periods")
                )

                # Drop old table
                conn.execute(text("DROP TABLE budget_periods"))

                # Rename new table
                conn.execute(
                    text("ALTER TABLE budget_periods_new RENAME TO budget_periods")
                )

                # Recreate index
                conn.execute(
                    text(
                        "CREATE INDEX idx_budget_period_active ON budget_periods (user_id, start_date, end_date)"
                    )
                )

                conn.execute(text("PRAGMA foreign_keys=ON"))
                conn.commit()
                print("✓ budget_periods constraint updated")
            except Exception as e:
                conn.execute(text("PRAGMA foreign_keys=ON"))
                print(f"✗ Error updating constraint: {e}")
                conn.rollback()
                raise
        else:
            print("✓ budget_periods constraint already allows single-day periods")


def run_all_migrations():
    """Run all database migrations."""
    print_header("Running Database Migrations")

    migrate_add_archived()
    print()
    migrate_add_recurring_expenses()
    print()
    migrate_add_password_reset_tokens()
    print()
    migrate_flexible_sub_periods()

    print("\n✓ All migrations completed successfully!")


def cleanup_recurring_expenses():
    """Remove orphaned recurring expenses (no budget_period_id)."""
    print_header("Cleanup: Orphaned Recurring Expenses")

    orphaned = Expense.query.filter(
        Expense.recurring_template_id.isnot(None), Expense.budget_period_id.is_(None)
    ).all()

    if not orphaned:
        print("✓ No orphaned recurring expenses found")
        return

    print(f"Found {len(orphaned)} orphaned expenses:\n")
    for expense in orphaned:
        print(f"  • {expense.name} - €{expense.amount/100:.2f} on {expense.date}")

    confirm = input(f"\nDelete these {len(orphaned)} expenses? (yes/no): ").lower()

    if confirm == "yes":
        for expense in orphaned:
            db.session.delete(expense)
        db.session.commit()
        print(f"\n✓ Deleted {len(orphaned)} orphaned expenses")
    else:
        print("\n✗ Cleanup cancelled")


def remove_duplicate_recurring():
    """Remove duplicate recurring expense templates."""
    print_header("Cleanup: Duplicate Recurring Templates")

    all_templates = RecurringExpense.query.all()
    print(f"Total recurring templates: {len(all_templates)}\n")

    # Find duplicates by name and user_id
    seen = {}
    duplicates = []

    for template in all_templates:
        key = (template.user_id, template.name)
        if key in seen:
            duplicates.append(template)
            print(f"Duplicate: {template.name} (ID: {template.id})")
        else:
            seen[key] = template

    if not duplicates:
        print("✓ No duplicates found")
        return

    print(f"\nFound {len(duplicates)} duplicate(s)")
    confirm = input(f"Delete {len(duplicates)} duplicates? (yes/no): ").lower()

    if confirm == "yes":
        for dup in duplicates:
            db.session.delete(dup)
        db.session.commit()
        print(f"\n✓ Deleted {len(duplicates)} duplicates")
    else:
        print("\n✗ Cleanup cancelled")


def verify_database():
    """
    Verify database integrity and show statistics.
    Security (#81): Uses SQLAlchemy ORM instead of raw SQL for counting.
    """
    print_header("Database Verification & Statistics")

    try:
        # Security (#81): Use ORM queries instead of raw SQL
        from backend.models.database import (
            User,
            Expense,
            Income,
            Debt,
            RecurringExpense,
            BudgetPeriod,
        )

        user_count = db.session.query(User).count()
        expense_count = db.session.query(Expense).count()
        income_count = db.session.query(Income).count()
        debt_count = db.session.query(Debt).count()
        recurring_count = db.session.query(RecurringExpense).count()
        period_count = db.session.query(BudgetPeriod).count()

        print("Record Counts:")
        print(f"  Users:              {user_count}")
        print(f"  Budget Periods:     {period_count}")
        print(f"  Expenses:           {expense_count}")
        print(f"  Income:             {income_count}")
        print(f"  Debts:              {debt_count}")
        print(f"  Recurring Templates: {recurring_count}")

        # Check for orphaned records
        print("\nIntegrity Checks:")

        orphaned_expenses = Expense.query.filter(
            Expense.recurring_template_id.isnot(None),
            Expense.budget_period_id.is_(None),
        ).count()

        if orphaned_expenses > 0:
            print(f"  ⚠ {orphaned_expenses} orphaned recurring expenses found")
        else:
            print(f"  ✓ No orphaned recurring expenses")

        # Check for duplicate recurring templates
        all_templates = RecurringExpense.query.all()
        seen = set()
        duplicate_count = 0

        for template in all_templates:
            key = (template.user_id, template.name)
            if key in seen:
                duplicate_count += 1
            else:
                seen.add(key)

        if duplicate_count > 0:
            print(f"  ⚠ {duplicate_count} duplicate recurring templates found")
        else:
            print(f"  ✓ No duplicate recurring templates")

        print("\n✓ Database verification complete")

    except Exception as e:
        print(f"\n✗ Verification failed: {str(e)}")


def purge_soft_deleted():
    """
    Permanently delete soft-deleted records older than 30 days.

    This is the cleanup job for the soft delete feature (#61).
    Records that have been in the Trash for more than 30 days are
    permanently removed to free up space.
    """
    from backend.services.cleanup_service import CleanupService

    print("\n=== Purging Soft-Deleted Records ===\n")

    # Get optional days argument
    days = 30
    if len(sys.argv) > 2:
        try:
            days = int(sys.argv[2])
        except ValueError:
            print(f"✗ Invalid days argument: {sys.argv[2]}")
            return

    print(f"Purging records deleted more than {days} days ago...\n")

    try:
        results = CleanupService.purge_soft_deleted_records(days_old=days)

        print(f"  Expenses:           {results['expenses']}")
        print(f"  Income:             {results['income']}")
        print(f"  Debts:              {results['debts']}")
        print(f"  Recurring Expenses: {results['recurring_expenses']}")
        print(f"  Goals:              {results['goals']}")
        print(f"  ─────────────────────────────────")
        print(f"  Total purged:       {results['total']}")

        print("\n✓ Purge complete")

    except Exception as e:
        print(f"\n✗ Purge failed: {str(e)}")


def show_help():
    """Display help message."""
    print(__doc__)


def main():
    """Main entry point."""
    # Use development config for maintenance scripts (skip production validation)
    app = create_app("development")

    with app.app_context():
        if len(sys.argv) < 2:
            show_help()
            sys.exit(1)

        command = sys.argv[1].lower()

        commands = {
            "migrate": run_all_migrations,
            "cleanup-recurring": cleanup_recurring_expenses,
            "remove-duplicates": remove_duplicate_recurring,
            "verify-db": verify_database,
            "purge-deleted": purge_soft_deleted,
            "help": show_help,
        }

        if command in commands:
            try:
                commands[command]()
            except Exception as e:
                print(f"\n✗ Command failed: {str(e)}")
                sys.exit(1)
        else:
            print(f"✗ Unknown command: {command}")
            show_help()
            sys.exit(1)


if __name__ == "__main__":
    main()
