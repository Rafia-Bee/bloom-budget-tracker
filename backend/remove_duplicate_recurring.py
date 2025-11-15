"""
Remove duplicate recurring expenses from database.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.models.database import db, RecurringExpense

app = create_app()

with app.app_context():
    # Get all recurring expenses
    all_expenses = RecurringExpense.query.all()

    print(f"Total recurring expenses: {len(all_expenses)}\n")

    # Find duplicates by name and user_id
    seen = {}
    duplicates = []

    for expense in all_expenses:
        key = (expense.user_id, expense.name)
        if key in seen:
            duplicates.append(expense)
            print(f"Duplicate found: {expense.name} (ID: {expense.id})")
        else:
            seen[key] = expense

    if duplicates:
        print(f"\nFound {len(duplicates)} duplicate(s)")
        confirm = input(f"Delete {len(duplicates)} duplicate recurring expenses? (yes/no): ").lower()

        if confirm == 'yes':
            for dup in duplicates:
                db.session.delete(dup)
            db.session.commit()
            print(f"✓ Deleted {len(duplicates)} duplicates")
        else:
            print("✗ Cancelled")
    else:
        print("✓ No duplicates found!")
