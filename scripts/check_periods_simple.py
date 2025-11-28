"""
Check budget period date ranges and find overlaps or gaps
"""
import sqlite3
from datetime import datetime

# Connect to database
db_path = 'instance/bloom.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("\n=== SALARY PERIODS ===")
    cursor.execute("""
        SELECT id, user_id, start_date, end_date, is_active
        FROM salary_periods
        WHERE is_active = 1
    """)

    salary_periods = cursor.fetchall()

    for sp_id, user_id, start_date, end_date, is_active in salary_periods:
        print(f"\nSalary Period ID: {sp_id}")
        print(f"  Date Range: {start_date} to {end_date}")
        print(f"  User ID: {user_id}")

        cursor.execute("""
            SELECT id, week_number, start_date, end_date, budget_amount
            FROM budget_periods
            WHERE salary_period_id = ?
            ORDER BY week_number
        """, (sp_id,))

        weeks = cursor.fetchall()

        print(f"  Weeks:")
        for week_id, week_num, w_start, w_end, budget in weeks:
            print(f"    Week {week_num}: ID={week_id}, {w_start} to {w_end}")

            # Check for expenses in this week
            cursor.execute("""
                SELECT name, date, amount
                FROM expenses
                WHERE budget_period_id = ?
                ORDER BY date
            """, (week_id,))

            expenses = cursor.fetchall()
            if expenses:
                print(f"      {len(expenses)} expenses:")
                for name, date, amount in expenses:
                    date_in_range = w_start <= date <= w_end
                    marker = "✓" if date_in_range else "✗ MISMATCH"
                    print(
                        f"        {marker} {name}: {date} (€{amount/100:.2f})")

    print("\n=== STANDALONE BUDGET PERIODS (no salary_period_id) ===")
    cursor.execute("""
        SELECT id, user_id, start_date, end_date, period_type
        FROM budget_periods
        WHERE salary_period_id IS NULL
        ORDER BY start_date
    """)

    standalone = cursor.fetchall()

    for bp_id, user_id, start_date, end_date, period_type in standalone:
        print(f"\nBudget Period ID: {bp_id}")
        print(f"  Date Range: {start_date} to {end_date}")
        print(f"  Type: {period_type}")
        print(f"  User ID: {user_id}")

finally:
    conn.close()
