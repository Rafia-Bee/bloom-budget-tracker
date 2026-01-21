"""
Replicate Production User to Dev Database

This script imports production data with EXACT IDs into the local SQLite dev database.
It handles foreign key relationships by importing in the correct order.

Usage:
1. First, run the SQL export queries in Neon SQL Editor (see EXPORT_QUERIES below)
2. Save the results as JSON files in the expected locations
3. Run this script: python scripts/replicate_production_user.py

Or use the --generate-sql flag to print the export queries:
    python scripts/replicate_production_user.py --generate-sql
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, date

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# SQL Export Queries for Neon (run these in Neon SQL Editor)
EXPORT_QUERIES = """
-- ============================================
-- PRODUCTION EXPORT QUERIES FOR NEON SQL EDITOR
-- Run each query and save the JSON output
-- ============================================

-- 1. Export User (user_id = 1)
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, email, password_hash, created_at, failed_login_attempts, locked_until,
           recurring_lookahead_days, default_currency, balance_start_date,
           user_initial_debit_balance, user_initial_credit_limit, user_initial_credit_available,
           balance_mode, payment_date_adjustment
    FROM users WHERE id = 1
) t;

-- 2. Export Salary Periods
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, initial_debit_balance, initial_credit_balance, credit_limit,
           credit_budget_allowance, salary_amount, total_budget_amount, fixed_bills_total,
           remaining_amount, weekly_budget, weekly_debit_budget, weekly_credit_budget,
           num_sub_periods, start_date, end_date, is_active, created_at, updated_at
    FROM salary_periods WHERE user_id = 1 ORDER BY id
) t;

-- 3. Export Budget Periods
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, salary_period_id, week_number, budget_amount, start_date, end_date,
           period_type, created_at
    FROM budget_periods WHERE user_id = 1 ORDER BY id
) t;

-- 4. Export Expenses (including soft-deleted)
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, recurring_template_id, name, amount, currency, original_amount,
           exchange_rate_used, category, subcategory, date, due_date, payment_method,
           notes, receipt_url, is_fixed_bill, created_at, updated_at, deleted_at
    FROM expenses WHERE user_id = 1 ORDER BY id
) t;

-- 5. Export Income (including soft-deleted)
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, type, amount, currency, original_amount, exchange_rate_used,
           scheduled_date, actual_date, recurring_income_id, created_at, updated_at, deleted_at
    FROM income WHERE user_id = 1 ORDER BY id
) t;

-- 6. Export Debts (including soft-deleted)
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, name, original_amount, current_balance, monthly_payment,
           archived, created_at, updated_at, deleted_at
    FROM debts WHERE user_id = 1 ORDER BY id
) t;

-- 7. Export Recurring Expenses (including soft-deleted)
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, name, amount, category, subcategory, payment_method, frequency,
           frequency_value, day_of_month, day_of_week, start_date, end_date, next_due_date,
           is_active, is_fixed_bill, notes, created_at, updated_at, deleted_at
    FROM recurring_expenses WHERE user_id = 1 ORDER BY id
) t;

-- 8. Export Recurring Income (including soft-deleted)
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, name, amount, income_type, currency, frequency, frequency_value,
           day_of_month, day_of_week, start_date, end_date, next_due_date, is_active,
           notes, created_at, updated_at, deleted_at
    FROM recurring_income WHERE user_id = 1 ORDER BY id
) t;

-- 9. Export User Defaults
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, default_expense_name, default_category, default_subcategory,
           default_payment_method
    FROM user_defaults WHERE user_id = 1
) t;

-- 10. Export Credit Card Settings
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, credit_limit, created_at, updated_at
    FROM credit_card_settings WHERE user_id = 1
) t;

-- 11. Export Goals (including soft-deleted)
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, name, description, target_amount, initial_amount, target_date,
           subcategory_name, is_active, created_at, updated_at, deleted_at
    FROM goals WHERE user_id = 1 ORDER BY id
) t;

-- 12. Export Subcategories
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, category, name, is_system, is_active, created_at, updated_at
    FROM subcategories WHERE user_id = 1 OR user_id IS NULL ORDER BY id
) t;

-- 13. Export Period Suggestions
SELECT json_agg(row_to_json(t))
FROM (
    SELECT id, user_id, suggestion_type, amount, status, created_at
    FROM period_suggestions WHERE user_id = 1 ORDER BY id
) t;

-- ============================================
-- COMBINED EXPORT (Alternative - single query)
-- This creates a single JSON object with all data
-- ============================================
SELECT json_build_object(
    'exported_at', NOW(),
    'user_id', 1,
    'users', (SELECT json_agg(row_to_json(u)) FROM (
        SELECT id, email, password_hash, created_at, failed_login_attempts, locked_until,
               recurring_lookahead_days, default_currency, balance_start_date,
               user_initial_debit_balance, user_initial_credit_limit, user_initial_credit_available,
               balance_mode, payment_date_adjustment
        FROM users WHERE id = 1
    ) u),
    'salary_periods', (SELECT COALESCE(json_agg(row_to_json(sp) ORDER BY sp.id), '[]'::json) FROM (
        SELECT * FROM salary_periods WHERE user_id = 1
    ) sp),
    'budget_periods', (SELECT COALESCE(json_agg(row_to_json(bp) ORDER BY bp.id), '[]'::json) FROM (
        SELECT * FROM budget_periods WHERE user_id = 1
    ) bp),
    'expenses', (SELECT COALESCE(json_agg(row_to_json(e) ORDER BY e.id), '[]'::json) FROM (
        SELECT * FROM expenses WHERE user_id = 1
    ) e),
    'income', (SELECT COALESCE(json_agg(row_to_json(i) ORDER BY i.id), '[]'::json) FROM (
        SELECT * FROM income WHERE user_id = 1
    ) i),
    'debts', (SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.id), '[]'::json) FROM (
        SELECT * FROM debts WHERE user_id = 1
    ) d),
    'recurring_expenses', (SELECT COALESCE(json_agg(row_to_json(re) ORDER BY re.id), '[]'::json) FROM (
        SELECT * FROM recurring_expenses WHERE user_id = 1
    ) re),
    'recurring_income', (SELECT COALESCE(json_agg(row_to_json(ri) ORDER BY ri.id), '[]'::json) FROM (
        SELECT * FROM recurring_income WHERE user_id = 1
    ) ri),
    'user_defaults', (SELECT COALESCE(json_agg(row_to_json(ud)), '[]'::json) FROM (
        SELECT * FROM user_defaults WHERE user_id = 1
    ) ud),
    'credit_card_settings', (SELECT COALESCE(json_agg(row_to_json(ccs)), '[]'::json) FROM (
        SELECT * FROM credit_card_settings WHERE user_id = 1
    ) ccs),
    'goals', (SELECT COALESCE(json_agg(row_to_json(g) ORDER BY g.id), '[]'::json) FROM (
        SELECT * FROM goals WHERE user_id = 1
    ) g),
    'subcategories', (SELECT COALESCE(json_agg(row_to_json(sc) ORDER BY sc.id), '[]'::json) FROM (
        SELECT * FROM subcategories WHERE user_id = 1 OR user_id IS NULL
    ) sc),
    'period_suggestions', (SELECT COALESCE(json_agg(row_to_json(ps) ORDER BY ps.id), '[]'::json) FROM (
        SELECT * FROM period_suggestions WHERE user_id = 1
    ) ps)
);
"""


def parse_date(value):
    """Parse date string to date object."""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        # Handle ISO format dates
        return datetime.fromisoformat(value.replace('Z', '+00:00')).date()
    return value


def parse_datetime(value):
    """Parse datetime string to datetime object."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        # Handle various ISO formats
        value = value.replace('Z', '+00:00')
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            # Try parsing without timezone
            return datetime.fromisoformat(value.replace('+00:00', ''))
    return value


def delete_local_database():
    """Delete the local SQLite database files."""
    db_path = project_root / "instance" / "bloom.db"
    wal_path = project_root / "instance" / "bloom.db-wal"
    shm_path = project_root / "instance" / "bloom.db-shm"

    for path in [db_path, wal_path, shm_path]:
        if path.exists():
            print(f"Deleting {path}...")
            path.unlink()

    print("Local database deleted.")


def import_data(data: dict):
    """Import production data into local SQLite database with exact IDs."""
    from backend.app import create_app
    from backend.models.database import (
        db, User, SalaryPeriod, BudgetPeriod, Expense, Income, Debt,
        RecurringExpense, RecurringIncome, UserDefaults, CreditCardSettings,
        Goal, Subcategory, PeriodSuggestion
    )

    app = create_app()

    with app.app_context():
        # Create all tables fresh
        db.create_all()

        # Disable foreign key checks for SQLite during import
        db.session.execute(db.text("PRAGMA foreign_keys = OFF"))

        try:
            # 1. Import User
            print("\n1. Importing user...")
            users = data.get('users', [])
            if users:
                for u in users:
                    user = User(
                        id=u['id'],
                        email=u['email'],
                        password_hash=u['password_hash'],
                        created_at=parse_datetime(u.get('created_at')),
                        failed_login_attempts=u.get('failed_login_attempts', 0),
                        locked_until=parse_datetime(u.get('locked_until')),
                        recurring_lookahead_days=u.get('recurring_lookahead_days', 14),
                        default_currency=u.get('default_currency', 'EUR'),
                        balance_start_date=parse_date(u.get('balance_start_date')),
                        user_initial_debit_balance=u.get('user_initial_debit_balance', 0),
                        user_initial_credit_limit=u.get('user_initial_credit_limit', 0),
                        user_initial_credit_available=u.get('user_initial_credit_available', 0),
                        balance_mode=u.get('balance_mode', 'sync'),
                        payment_date_adjustment=u.get('payment_date_adjustment', 'exact_date')
                    )
                    db.session.add(user)
                print(f"   Imported {len(users)} user(s)")

            db.session.flush()

            # 2. Import Salary Periods (before Budget Periods due to FK)
            print("2. Importing salary periods...")
            salary_periods = data.get('salary_periods', [])
            for sp in salary_periods:
                salary_period = SalaryPeriod(
                    id=sp['id'],
                    user_id=sp['user_id'],
                    initial_debit_balance=sp['initial_debit_balance'],
                    initial_credit_balance=sp['initial_credit_balance'],
                    credit_limit=sp['credit_limit'],
                    credit_budget_allowance=sp.get('credit_budget_allowance', 0),
                    salary_amount=sp.get('salary_amount'),
                    total_budget_amount=sp['total_budget_amount'],
                    fixed_bills_total=sp.get('fixed_bills_total', 0),
                    remaining_amount=sp['remaining_amount'],
                    weekly_budget=sp['weekly_budget'],
                    weekly_debit_budget=sp['weekly_debit_budget'],
                    weekly_credit_budget=sp.get('weekly_credit_budget', 0),
                    num_sub_periods=sp.get('num_sub_periods', 4),
                    start_date=parse_date(sp['start_date']),
                    end_date=parse_date(sp['end_date']),
                    is_active=sp.get('is_active', True),
                    created_at=parse_datetime(sp.get('created_at')),
                    updated_at=parse_datetime(sp.get('updated_at'))
                )
                db.session.add(salary_period)
            print(f"   Imported {len(salary_periods)} salary period(s)")

            db.session.flush()

            # 3. Import Budget Periods
            print("3. Importing budget periods...")
            budget_periods = data.get('budget_periods', [])
            for bp in budget_periods:
                budget_period = BudgetPeriod(
                    id=bp['id'],
                    user_id=bp['user_id'],
                    salary_period_id=bp.get('salary_period_id'),
                    week_number=bp.get('week_number'),
                    budget_amount=bp.get('budget_amount'),
                    start_date=parse_date(bp['start_date']),
                    end_date=parse_date(bp['end_date']),
                    period_type=bp['period_type'],
                    created_at=parse_datetime(bp.get('created_at'))
                )
                db.session.add(budget_period)
            print(f"   Imported {len(budget_periods)} budget period(s)")

            db.session.flush()

            # 4. Import Recurring Expenses (before Expenses due to FK)
            print("4. Importing recurring expenses...")
            recurring_expenses = data.get('recurring_expenses', [])
            for re in recurring_expenses:
                recurring_expense = RecurringExpense(
                    id=re['id'],
                    user_id=re['user_id'],
                    name=re['name'],
                    amount=re['amount'],
                    category=re['category'],
                    subcategory=re.get('subcategory'),
                    payment_method=re.get('payment_method', 'credit'),
                    frequency=re['frequency'],
                    frequency_value=re.get('frequency_value'),
                    day_of_month=re.get('day_of_month'),
                    day_of_week=re.get('day_of_week'),
                    start_date=parse_date(re['start_date']),
                    end_date=parse_date(re.get('end_date')),
                    next_due_date=parse_date(re['next_due_date']),
                    is_active=re.get('is_active', True),
                    is_fixed_bill=re.get('is_fixed_bill', False),
                    notes=re.get('notes'),
                    created_at=parse_datetime(re.get('created_at')),
                    updated_at=parse_datetime(re.get('updated_at')),
                    deleted_at=parse_datetime(re.get('deleted_at'))
                )
                db.session.add(recurring_expense)
            print(f"   Imported {len(recurring_expenses)} recurring expense(s)")

            db.session.flush()

            # 5. Import Recurring Income (before Income due to FK)
            print("5. Importing recurring income...")
            recurring_income = data.get('recurring_income', [])
            for ri in recurring_income:
                rec_income = RecurringIncome(
                    id=ri['id'],
                    user_id=ri['user_id'],
                    name=ri['name'],
                    amount=ri['amount'],
                    income_type=ri.get('income_type', 'Salary'),
                    currency=ri.get('currency', 'EUR'),
                    frequency=ri['frequency'],
                    frequency_value=ri.get('frequency_value'),
                    day_of_month=ri.get('day_of_month'),
                    day_of_week=ri.get('day_of_week'),
                    start_date=parse_date(ri['start_date']),
                    end_date=parse_date(ri.get('end_date')),
                    next_due_date=parse_date(ri['next_due_date']),
                    is_active=ri.get('is_active', True),
                    notes=ri.get('notes'),
                    created_at=parse_datetime(ri.get('created_at')),
                    updated_at=parse_datetime(ri.get('updated_at')),
                    deleted_at=parse_datetime(ri.get('deleted_at'))
                )
                db.session.add(rec_income)
            print(f"   Imported {len(recurring_income)} recurring income(s)")

            db.session.flush()

            # 6. Import Expenses
            print("6. Importing expenses...")
            expenses = data.get('expenses', [])
            for e in expenses:
                expense = Expense(
                    id=e['id'],
                    user_id=e['user_id'],
                    recurring_template_id=e.get('recurring_template_id'),
                    name=e['name'],
                    amount=e['amount'],
                    currency=e.get('currency', 'EUR'),
                    original_amount=e.get('original_amount'),
                    exchange_rate_used=e.get('exchange_rate_used'),
                    category=e['category'],
                    subcategory=e.get('subcategory'),
                    date=parse_date(e['date']),
                    due_date=e.get('due_date', 'N/A'),
                    payment_method=e.get('payment_method', 'credit'),
                    notes=e.get('notes'),
                    receipt_url=e.get('receipt_url'),
                    is_fixed_bill=e.get('is_fixed_bill', False),
                    created_at=parse_datetime(e.get('created_at')),
                    updated_at=parse_datetime(e.get('updated_at')),
                    deleted_at=parse_datetime(e.get('deleted_at'))
                )
                db.session.add(expense)
            print(f"   Imported {len(expenses)} expense(s)")

            # 7. Import Income
            print("7. Importing income...")
            income_entries = data.get('income', [])
            for i in income_entries:
                income = Income(
                    id=i['id'],
                    user_id=i['user_id'],
                    type=i['type'],
                    amount=i['amount'],
                    currency=i.get('currency', 'EUR'),
                    original_amount=i.get('original_amount'),
                    exchange_rate_used=i.get('exchange_rate_used'),
                    scheduled_date=parse_date(i.get('scheduled_date')),
                    actual_date=parse_date(i.get('actual_date')),
                    recurring_income_id=i.get('recurring_income_id'),
                    created_at=parse_datetime(i.get('created_at')),
                    updated_at=parse_datetime(i.get('updated_at')),
                    deleted_at=parse_datetime(i.get('deleted_at'))
                )
                db.session.add(income)
            print(f"   Imported {len(income_entries)} income record(s)")

            # 8. Import Debts
            print("8. Importing debts...")
            debts = data.get('debts', [])
            for d in debts:
                debt = Debt(
                    id=d['id'],
                    user_id=d['user_id'],
                    name=d['name'],
                    original_amount=d['original_amount'],
                    current_balance=d['current_balance'],
                    monthly_payment=d['monthly_payment'],
                    archived=d.get('archived', False),
                    created_at=parse_datetime(d.get('created_at')),
                    updated_at=parse_datetime(d.get('updated_at')),
                    deleted_at=parse_datetime(d.get('deleted_at'))
                )
                db.session.add(debt)
            print(f"   Imported {len(debts)} debt(s)")

            # 9. Import User Defaults
            print("9. Importing user defaults...")
            user_defaults = data.get('user_defaults', [])
            for ud in user_defaults:
                user_default = UserDefaults(
                    id=ud['id'],
                    user_id=ud['user_id'],
                    default_expense_name=ud.get('default_expense_name', 'Wolt'),
                    default_category=ud.get('default_category', 'Flexible Expenses'),
                    default_subcategory=ud.get('default_subcategory', 'Food'),
                    default_payment_method=ud.get('default_payment_method', 'credit')
                )
                db.session.add(user_default)
            print(f"   Imported {len(user_defaults)} user default(s)")

            # 10. Import Credit Card Settings
            print("10. Importing credit card settings...")
            credit_card_settings = data.get('credit_card_settings', [])
            for ccs in credit_card_settings:
                cc_setting = CreditCardSettings(
                    id=ccs['id'],
                    user_id=ccs['user_id'],
                    credit_limit=ccs.get('credit_limit', 150000),
                    created_at=parse_datetime(ccs.get('created_at')),
                    updated_at=parse_datetime(ccs.get('updated_at'))
                )
                db.session.add(cc_setting)
            print(f"   Imported {len(credit_card_settings)} credit card setting(s)")

            # 11. Import Goals
            print("11. Importing goals...")
            goals = data.get('goals', [])
            for g in goals:
                goal = Goal(
                    id=g['id'],
                    user_id=g['user_id'],
                    name=g['name'],
                    description=g.get('description'),
                    target_amount=g['target_amount'],
                    initial_amount=g.get('initial_amount', 0),
                    target_date=parse_date(g.get('target_date')),
                    subcategory_name=g['subcategory_name'],
                    is_active=g.get('is_active', True),
                    created_at=parse_datetime(g.get('created_at')),
                    updated_at=parse_datetime(g.get('updated_at')),
                    deleted_at=parse_datetime(g.get('deleted_at'))
                )
                db.session.add(goal)
            print(f"   Imported {len(goals)} goal(s)")

            # 12. Import Subcategories
            print("12. Importing subcategories...")
            subcategories = data.get('subcategories', [])
            for sc in subcategories:
                subcategory = Subcategory(
                    id=sc['id'],
                    user_id=sc.get('user_id'),  # Can be NULL for system subcategories
                    category=sc['category'],
                    name=sc['name'],
                    is_system=sc.get('is_system', False),
                    is_active=sc.get('is_active', True),
                    created_at=parse_datetime(sc.get('created_at')),
                    updated_at=parse_datetime(sc.get('updated_at'))
                )
                db.session.add(subcategory)
            print(f"   Imported {len(subcategories)} subcategory(ies)")

            # 13. Import Period Suggestions
            print("13. Importing period suggestions...")
            period_suggestions = data.get('period_suggestions', [])
            for ps in period_suggestions:
                suggestion = PeriodSuggestion(
                    id=ps['id'],
                    user_id=ps['user_id'],
                    suggestion_type=ps['suggestion_type'],
                    amount=ps['amount'],
                    status=ps.get('status', 'pending'),
                    created_at=parse_datetime(ps.get('created_at'))
                )
                db.session.add(suggestion)
            print(f"   Imported {len(period_suggestions)} period suggestion(s)")

            # Re-enable foreign key checks
            db.session.execute(db.text("PRAGMA foreign_keys = ON"))

            # Commit all changes
            db.session.commit()

            # Update SQLite sequences to continue from max IDs
            print("\n14. Updating SQLite sequences...")
            update_sqlite_sequences(db)

            print("\n✅ Import completed successfully!")
            print_summary(data)

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during import: {e}")
            raise


def update_sqlite_sequences(db):
    """Update SQLite autoincrement sequences to continue from max IDs."""
    tables = [
        'users', 'salary_periods', 'budget_periods', 'expenses', 'income',
        'debts', 'recurring_expenses', 'recurring_income', 'user_defaults',
        'credit_card_settings', 'goals', 'subcategories', 'period_suggestions'
    ]

    for table in tables:
        try:
            result = db.session.execute(db.text(f"SELECT MAX(id) FROM {table}")).scalar()
            if result:
                # Update sqlite_sequence table
                db.session.execute(db.text(
                    f"INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('{table}', {result})"
                ))
        except Exception as e:
            print(f"   Warning: Could not update sequence for {table}: {e}")

    db.session.commit()
    print("   Sequences updated.")


def print_summary(data: dict):
    """Print import summary."""
    print("\n" + "="*50)
    print("IMPORT SUMMARY")
    print("="*50)
    print(f"User ID: {data.get('user_id', 'N/A')}")
    print(f"Exported at: {data.get('exported_at', 'N/A')}")
    print("-"*50)

    tables = [
        ('users', 'Users'),
        ('salary_periods', 'Salary Periods'),
        ('budget_periods', 'Budget Periods'),
        ('expenses', 'Expenses'),
        ('income', 'Income'),
        ('debts', 'Debts'),
        ('recurring_expenses', 'Recurring Expenses'),
        ('recurring_income', 'Recurring Income'),
        ('user_defaults', 'User Defaults'),
        ('credit_card_settings', 'Credit Card Settings'),
        ('goals', 'Goals'),
        ('subcategories', 'Subcategories'),
        ('period_suggestions', 'Period Suggestions'),
    ]

    for key, name in tables:
        count = len(data.get(key, []))
        print(f"{name:25} {count:>5} record(s)")

    print("="*50)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Replicate production user to dev database")
    parser.add_argument('--generate-sql', action='store_true',
                        help='Print SQL export queries for Neon')
    parser.add_argument('--json-file', type=str,
                        help='Path to JSON file with exported data')
    parser.add_argument('--keep-db', action='store_true',
                        help='Keep existing database (do not delete)')

    args = parser.parse_args()

    if args.generate_sql:
        print(EXPORT_QUERIES)
        return

    # Check for JSON file
    json_file = args.json_file or project_root / "production_export.json"

    if not Path(json_file).exists():
        print(f"❌ JSON file not found: {json_file}")
        print("\nTo use this script:")
        print("1. Run: python scripts/replicate_production_user.py --generate-sql")
        print("2. Copy the COMBINED EXPORT query and run it in Neon SQL Editor")
        print("3. Save the output as 'production_export.json' in the project root")
        print("4. Run: python scripts/replicate_production_user.py")
        print("\nOr specify a custom path:")
        print("   python scripts/replicate_production_user.py --json-file /path/to/export.json")
        return

    # Load JSON data
    print(f"Loading data from {json_file}...")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Delete existing database unless --keep-db is specified
    if not args.keep_db:
        print("\nDeleting existing local database...")
        delete_local_database()

    # Import data
    print("\nImporting production data...")
    import_data(data)


if __name__ == "__main__":
    main()
