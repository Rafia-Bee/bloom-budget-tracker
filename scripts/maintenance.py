"""
Bloom - Database Maintenance & Utilities Script

Consolidates migration, cleanup, and maintenance operations.
Run with: python scripts/maintenance.py <command>

Available commands:
  migrate              - Run all pending database migrations
  cleanup-recurring    - Remove orphaned recurring expenses
  remove-duplicates    - Remove duplicate recurring expense templates
  verify-db           - Verify database integrity
"""

from datetime import datetime
from sqlalchemy import text
from backend.models.database import db, Expense, RecurringExpense, Debt
from backend.app import create_app
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def print_header(title):
    """Print formatted section header."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}\n")


def migrate_add_archived():
    """Add 'archived' column to debts table."""
    print("Checking for archived column in debts table...")

    with db.engine.connect() as conn:
        try:
            result = conn.execute(text("PRAGMA table_info(debts)"))
            columns = [row[1] for row in result]

            if "archived" not in columns:
                print("Adding 'archived' column to debts table...")
                conn.execute(
                    text(
                        "ALTER TABLE debts ADD COLUMN archived BOOLEAN DEFAULT 0 NOT NULL"
                    )
                )
                conn.commit()
                print("✓ 'archived' column added successfully")
            else:
                print("✓ 'archived' column already exists")
        except Exception as e:
            print(f"✗ Error: {e}")
            conn.rollback()
            raise


def migrate_add_recurring_expenses():
    """Add recurring_expenses table and recurring_template_id to expenses."""
    print("Checking for recurring_expenses table...")

    try:
        # Check if recurring_expenses table exists
        result = db.session.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_expenses'"
            )
        )
        table_exists = result.fetchone() is not None

        if not table_exists:
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

        # Check if recurring_template_id column exists
        result = db.session.execute(text("PRAGMA table_info(expenses)"))
        columns = [row[1] for row in result.fetchall()]

        if "recurring_template_id" not in columns:
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
    """Add password_reset_tokens table."""
    print("Checking for password_reset_tokens table...")

    with db.engine.connect() as conn:
        try:
            # Check if table exists
            result = conn.execute(
                text(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens'"
                )
            )
            table_exists = result.fetchone() is not None

            if not table_exists:
                print("Creating password_reset_tokens table...")
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
                print("✓ password_reset_tokens table created successfully")
            else:
                print("✓ password_reset_tokens table already exists")
        except Exception as e:
            print(f"✗ Error: {e}")
            conn.rollback()


def run_all_migrations():
    """Run all database migrations."""
    print_header("Running Database Migrations")

    migrate_add_archived()
    print()
    migrate_add_recurring_expenses()
    print()
    migrate_add_password_reset_tokens()

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
    """Verify database integrity and show statistics."""
    print_header("Database Verification & Statistics")

    try:
        # Count records
        user_count = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar()
        expense_count = db.session.execute(
            text("SELECT COUNT(*) FROM expenses")
        ).scalar()
        income_count = db.session.execute(text("SELECT COUNT(*) FROM income")).scalar()
        debt_count = db.session.execute(text("SELECT COUNT(*) FROM debts")).scalar()
        recurring_count = db.session.execute(
            text("SELECT COUNT(*) FROM recurring_expenses")
        ).scalar()
        period_count = db.session.execute(
            text("SELECT COUNT(*) FROM budget_periods")
        ).scalar()

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


def show_help():
    """Display help message."""
    print(__doc__)


def main():
    """Main entry point."""
    app = create_app()

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
