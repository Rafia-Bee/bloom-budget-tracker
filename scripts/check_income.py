"""
Check income entries to diagnose Initial Balance creation
"""
import sqlite3

db_path = "instance/bloom.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("\n=== ALL INCOME ENTRIES ===")
    cursor.execute(
        """
        SELECT id, type, amount, scheduled_date, actual_date
        FROM income
        ORDER BY actual_date
    """
    )

    incomes = cursor.fetchall()
    total = 0
    initial_balance_count = 0

    for inc_id, inc_type, amount, sched, actual in incomes:
        print(f"\nID: {inc_id}")
        print(f"  Type: {inc_type}")
        print(f"  Amount: €{amount/100:.2f}")
        print(f"  Scheduled: {sched}")
        print(f"  Actual: {actual}")
        total += amount

        if inc_type == "Initial Balance":
            initial_balance_count += 1

    print(f"\n=== TOTAL INCOME: €{total/100:.2f} ===")
    print(f"=== INITIAL BALANCE COUNT: {initial_balance_count} ===")

finally:
    conn.close()
