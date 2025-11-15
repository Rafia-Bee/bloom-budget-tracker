"""
Bloom - Cleanup Script for Recurring Expenses

Removes expenses that were generated from recurring templates
but don't have a budget_period_id assigned.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.models.database import db, Expense
from datetime import datetime

app = create_app()

with app.app_context():
    print(f"\n{'='*60}")
    print(f"Bloom Recurring Expense Cleanup")
    print(f"Running at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Find expenses with recurring_template_id but no budget_period_id
    orphaned_expenses = Expense.query.filter(
        Expense.recurring_template_id.isnot(None),
        Expense.budget_period_id.is_(None)
    ).all()

    if not orphaned_expenses:
        print("✓ No orphaned recurring expenses found. Database is clean!")
    else:
        print(f"Found {len(orphaned_expenses)} orphaned recurring expenses:\n")

        for expense in orphaned_expenses:
            print(f"  • {expense.name} - €{expense.amount/100:.2f} on {expense.date}")

        confirm = input(f"\nDelete these {len(orphaned_expenses)} expenses? (yes/no): ").lower()

        if confirm == 'yes':
            for expense in orphaned_expenses:
                db.session.delete(expense)

            db.session.commit()
            print(f"\n✓ Deleted {len(orphaned_expenses)} orphaned expenses")
        else:
            print("\n✗ Cleanup cancelled")

    print(f"\n{'='*60}")
    print(f"Cleanup complete!")
    print(f"{'='*60}\n")
