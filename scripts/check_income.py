"""
Check income entries to diagnose the €1769.20 issue
"""
import sqlite3

db_path = 'instance/bloom.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("\n=== ALL INCOME ENTRIES ===")
    cursor.execute("""
        SELECT id, type, amount, scheduled_date, actual_date, budget_period_id
        FROM income
        ORDER BY scheduled_date
    """)

    incomes = cursor.fetchall()
    total = 0

    for inc_id, inc_type, amount, sched, actual, bp_id in incomes:
        print(f"\nID: {inc_id}")
        print(f"  Type: {inc_type}")
        print(f"  Amount: €{amount/100:.2f}")
        print(f"  Scheduled: {sched}")
        print(f"  Actual: {actual}")
        print(f"  Budget Period ID: {bp_id}")
        total += amount

    print(f"\n=== TOTAL INCOME: €{total/100:.2f} ===")

    if total == 176920:  # 1769.20 in cents
        print("⚠️ This matches the incorrect amount shown!")

finally:
    conn.close()
