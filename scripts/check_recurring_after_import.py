"""
Check recurring expenses and their next_due_date after import
"""
from datetime import datetime, timedelta
from backend.app import create_app
from backend.models.database import db, RecurringExpense, Expense, User
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


app = create_app()

with app.app_context():
    # Get the most recent user (your test account)
    user = User.query.order_by(User.created_at.desc()).first()

    if not user:
        print("No users found")
        exit()

    print(f"Checking user: {user.email} (ID: {user.id})")
    print(f"Created at: {user.created_at}")
    print("=" * 80)

    # Get all recurring expenses for this user
    recurring_expenses = (
        RecurringExpense.query.filter_by(user_id=user.id, is_active=True)
        .order_by(RecurringExpense.name)
        .all()
    )

    print(f"\nFound {len(recurring_expenses)} active recurring expenses:\n")

    today = datetime.now().date()

    for rec in recurring_expenses:
        print(f"Name: {rec.name}")
        print(f"  Amount: €{rec.amount/100:.2f}")
        print(f"  Frequency: {rec.frequency}")
        print(f"  Day of month: {rec.day_of_month}")
        print(f"  Start date: {rec.start_date}")
        print(f"  Next due date: {rec.next_due_date}")
        print(f"  Days until due: {(rec.next_due_date - today).days}")

        # Check if expenses exist for this template
        expenses = (
            Expense.query.filter_by(user_id=user.id, recurring_template_id=rec.id)
            .order_by(Expense.date.desc())
            .all()
        )

        print(f"  Expenses generated: {len(expenses)}")
        if expenses:
            print(
                f"    Most recent: {expenses[0].date} (€{expenses[0].amount/100:.2f})"
            )
            if len(expenses) > 1:
                print(f"    Oldest: {expenses[-1].date}")

        # Check if due for generation (within 60 days)
        future_date = today + timedelta(days=60)
        is_due = rec.next_due_date <= future_date
        print(f"  Due for generation? {is_due} (checks <= {future_date})")
        print()

    # Summary
    print("=" * 80)
    print("\nSUMMARY:")
    due_count = sum(
        1
        for rec in recurring_expenses
        if rec.next_due_date <= today + timedelta(days=60)
    )
    print(f"Total recurring expenses: {len(recurring_expenses)}")
    print(f"Due for generation (next 60 days): {due_count}")
    print(f"Today: {today}")
