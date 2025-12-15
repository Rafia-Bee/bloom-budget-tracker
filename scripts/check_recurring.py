"""
Check recurring expenses and their next_due_date values
"""
import sqlite3
from datetime import datetime

# Connect to database
db_path = "instance/bloom.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("\n=== RECURRING EXPENSES ===")
    cursor.execute(
        """
        SELECT id, user_id, name, amount, frequency, day_of_month,
               next_due_date, start_date, is_active
        FROM recurring_expenses
        WHERE is_active = 1
        ORDER BY next_due_date
    """
    )

    recurring = cursor.fetchall()

    if not recurring:
        print("No active recurring expenses found")
    else:
        for (
            rec_id,
            user_id,
            name,
            amount,
            freq,
            day_of_month,
            next_due,
            start_date,
            is_active,
        ) in recurring:
            print(f"\nID: {rec_id}")
            print(f"  Name: {name}")
            print(f"  Amount: €{amount/100:.2f}")
            print(f"  Frequency: {freq}")
            print(f"  Day of Month: {day_of_month}")
            print(f"  Start Date: {start_date}")
            print(f"  Next Due Date: {next_due}")
            print(f"  Active: {is_active}")

            # Check if next_due_date matches day_of_month
            if freq == "monthly" and day_of_month:
                next_due_date = datetime.strptime(next_due, "%Y-%m-%d").date()
                if next_due_date.day != day_of_month:
                    print(
                        f"  ⚠️ MISMATCH: next_due_date day ({next_due_date.day}) != day_of_month ({day_of_month})"
                    )
                else:
                    print(f"  ✓ next_due_date matches day_of_month")

finally:
    conn.close()
