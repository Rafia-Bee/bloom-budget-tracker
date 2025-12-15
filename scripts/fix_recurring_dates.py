"""
Fix recurring expenses with incorrect next_due_date values
"""
import sqlite3
from datetime import datetime

# Connect to database
db_path = "instance/bloom.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("\n=== FIXING RECURRING EXPENSES ===")

    # Find all monthly recurring expenses where next_due_date doesn't match day_of_month
    cursor.execute(
        """
        SELECT id, name, day_of_month, next_due_date
        FROM recurring_expenses
        WHERE is_active = 1
        AND frequency = 'monthly'
        AND day_of_month IS NOT NULL
    """
    )

    recurring = cursor.fetchall()
    fixed_count = 0

    for rec_id, name, day_of_month, next_due_str in recurring:
        next_due = datetime.strptime(next_due_str, "%Y-%m-%d").date()

        # Check if the day doesn't match
        if next_due.day != day_of_month:
            # Calculate correct next_due_date
            today = datetime.now().date()

            # If the day of month hasn't passed this month, use this month
            if today.day < day_of_month:
                correct_date = datetime(today.year, today.month, day_of_month).date()
            else:
                # Otherwise use next month
                next_month = today.month + 1
                next_year = today.year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                correct_date = datetime(next_year, next_month, day_of_month).date()

            print(f"Fixing: {name}")
            print(f"  Current next_due_date: {next_due}")
            print(f"  Correct next_due_date: {correct_date}")

            cursor.execute(
                """
                UPDATE recurring_expenses
                SET next_due_date = ?
                WHERE id = ?
            """,
                (correct_date.isoformat(), rec_id),
            )

            fixed_count += 1

    if fixed_count > 0:
        conn.commit()
        print(f"\n✓ Fixed {fixed_count} recurring expense(s)")
    else:
        print("\n✓ All recurring expenses have correct next_due_date values")

finally:
    conn.close()
