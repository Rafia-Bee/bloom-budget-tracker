"""
Fix mismatched expense: Move Credit card repayment from Week 2 to Week 1
"""
import sqlite3

conn = sqlite3.connect("instance/bloom.db")
cursor = conn.cursor()

try:
    # Find the mismatched expense
    cursor.execute(
        """
        SELECT id, name, date, amount, budget_period_id
        FROM expenses
        WHERE name = 'Credit card repayment'
        AND date = '2025-11-20'
        AND budget_period_id = 6
    """
    )

    expense = cursor.fetchone()

    if expense:
        exp_id, name, date, amount, old_period_id = expense
        print(f"Found mismatched expense:")
        print(f"  ID: {exp_id}")
        print(f"  Name: {name}")
        print(f"  Date: {date}")
        print(f"  Amount: €{amount/100:.2f}")
        print(
            f"  Current budget_period_id: {old_period_id} (Week 2: 2025-11-27 to 2025-12-03)"
        )
        print(f"  Should be budget_period_id: 5 (Week 1: 2025-11-20 to 2025-11-26)")

        # Update to correct period
        cursor.execute(
            """
            UPDATE expenses
            SET budget_period_id = 5
            WHERE id = ?
        """,
            (exp_id,),
        )

        conn.commit()
        print(f"\n✓ Fixed: Moved expense to Week 1")
    else:
        print("No mismatched expense found (may have already been fixed)")

finally:
    conn.close()
