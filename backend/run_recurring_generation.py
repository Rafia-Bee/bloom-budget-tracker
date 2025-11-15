"""
Bloom - Recurring Expense Scheduler

Scheduled task to automatically generate recurring expenses.
Run this script daily via cron job or task scheduler.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.utils.recurring_generator import generate_due_expenses
from datetime import datetime

app = create_app()

with app.app_context():
    print(f"\n{'='*60}")
    print(f"Bloom Recurring Expense Generator")
    print(f"Running at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Generate expenses for all users
    result = generate_due_expenses()

    print(f"\n📊 Generation Summary:")
    print(f"  - Templates processed: {result['templates_processed']}")
    print(f"  - Expenses generated: {result['generated_count']}")
    print(f"  - Errors: {len(result['errors'])}")

    if result['templates']:
        print(f"\n📝 Details:")
        for template in result['templates']:
            action = template.get('action', 'unknown')
            name = template.get('name', 'Unknown')
            if action == 'generated':
                amount = template.get('amount', 0)
                date = template.get('date', 'unknown')
                print(f"  ✓ Generated: {name} - ${amount:.2f} on {date}")
            elif action == 'skipped (already exists)':
                print(f"  ⊘ Skipped: {name} (already exists)")

    if result['errors']:
        print(f"\n❌ Errors:")
        for error in result['errors']:
            print(f"  - {error['name']}: {error['error']}")

    print(f"\n{'='*60}")
    print(f"✓ Generation complete!")
    print(f"{'='*60}\n")
