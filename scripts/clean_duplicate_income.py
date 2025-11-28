"""
Clean up duplicate income entries
"""
import sqlite3

db_path = 'instance/bloom.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("\n=== CLEANING UP DUPLICATE INCOME ENTRIES ===")

    # Find duplicate "Initial Balance" entries
    print("\n1. Initial Balance entries:")
    cursor.execute("""
        SELECT id, amount, scheduled_date
        FROM income
        WHERE type = 'Initial Balance'
        ORDER BY id
    """)

    initial_balances = cursor.fetchall()
    for inc_id, amount, sched_date in initial_balances:
        print(f"  ID {inc_id}: €{amount/100:.2f} on {sched_date}")

    # Keep only the most recent Initial Balance entry (ID 20)
    if len(initial_balances) > 1:
        keep_id = max(inc_id for inc_id, _, _ in initial_balances)
        delete_ids = [inc_id for inc_id, _,
                      _ in initial_balances if inc_id != keep_id]

        print(f"\n  Keeping ID {keep_id}, deleting: {delete_ids}")
        cursor.execute(f"""
            DELETE FROM income
            WHERE id IN ({','.join('?' * len(delete_ids))})
        """, delete_ids)
        print(
            f"  ✓ Deleted {len(delete_ids)} duplicate Initial Balance entries")

    # Find duplicate "Other" entries
    print("\n2. Other income entries:")
    cursor.execute("""
        SELECT id, amount, scheduled_date, budget_period_id
        FROM income
        WHERE type = 'Other'
        ORDER BY scheduled_date, id
    """)

    other_incomes = cursor.fetchall()
    for inc_id, amount, sched_date, bp_id in other_incomes:
        print(f"  ID {inc_id}: €{amount/100:.2f} on {sched_date}, BP:{bp_id}")

    # Group by date and amount to find duplicates
    seen = {}
    duplicates_to_delete = []

    for inc_id, amount, sched_date, bp_id in other_incomes:
        key = (sched_date, amount)
        if key in seen:
            # This is a duplicate, mark for deletion
            duplicates_to_delete.append(inc_id)
            print(f"  Marking ID {inc_id} as duplicate of ID {seen[key]}")
        else:
            seen[key] = inc_id

    if duplicates_to_delete:
        cursor.execute(f"""
            DELETE FROM income
            WHERE id IN ({','.join('?' * len(duplicates_to_delete))})
        """, duplicates_to_delete)
        print(
            f"  ✓ Deleted {len(duplicates_to_delete)} duplicate Other entries")

    conn.commit()

    # Show final state
    print("\n=== FINAL INCOME ENTRIES ===")
    cursor.execute("""
        SELECT type, SUM(amount), COUNT(*)
        FROM income
        GROUP BY type
        ORDER BY type
    """)

    for inc_type, total, count in cursor.fetchall():
        print(f"  {inc_type}: {count} entries, €{total/100:.2f}")

    cursor.execute("SELECT SUM(amount) FROM income")
    total = cursor.fetchone()[0] or 0
    print(f"\n  TOTAL: €{total/100:.2f}")

finally:
    conn.close()
