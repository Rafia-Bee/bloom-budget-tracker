"""
Test the generate_due_expenses function to see what's happening

⚠️ WARNING: Uses actual database configured in app
Ensure you're using development/test database, not production!
"""
from datetime import datetime, timedelta
from backend.utils.recurring_generator import generate_due_expenses
from backend.app import create_app
from backend.models.database import db, RecurringExpense, Expense, User
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


app = create_app()

with app.app_context():
    # Get the most recent user
    user = User.query.order_by(User.created_at.desc()).first()

    print(f"Testing generate for user: {user.email} (ID: {user.id})")
    print("=" * 80)

    # Run in dry-run mode first
    print("\n1. DRY RUN (preview):")
    result = generate_due_expenses(
        user_id=user.id, dry_run=True, days_ahead=60)

    print(f"\nTemplates processed: {result['templates_processed']}")
    print(f"Would generate: {result['generated_count']}")
    print(f"Dry run: {result['dry_run']}")

    if result['templates']:
        print("\nTemplates:")
        for template in result['templates']:
            print(f"  - {template['name']}: {template['action']}")
            if 'date' in template:
                print(
                    f"    Date: {template['date']}, Amount: €{template['amount']}")

    if result['errors']:
        print("\nErrors:")
        for error in result['errors']:
            print(f"  - {error['name']}: {error['error']}")

    # Now run for real
    print("\n" + "=" * 80)
    print("\n2. ACTUAL GENERATION:")
    result = generate_due_expenses(
        user_id=user.id, dry_run=False, days_ahead=60)

    print(f"\nTemplates processed: {result['templates_processed']}")
    print(f"Generated: {result['generated_count']}")

    if result['templates']:
        print("\nTemplates:")
        for template in result['templates']:
            print(f"  - {template['name']}: {template['action']}")
            if 'date' in template:
                print(
                    f"    Date: {template['date']}, Amount: €{template['amount']}")

    if result['errors']:
        print("\nErrors:")
        for error in result['errors']:
            print(f"  - {error['name']}: {error['error']}")
