"""Test recurring expense generation"""
from backend.app import create_app
from backend.models.database import db, Expense
from backend.utils.recurring_generator import generate_due_expenses

app = create_app()

with app.app_context():
    before = Expense.query.count()
    print(f"Expenses before: {before}")

    result = generate_due_expenses(days_ahead=60)

    print(f'\nGenerated: {result["generated_count"]} expenses')

    after = Expense.query.count()
    print(f"Expenses after: {after}")
    print(f"New expenses created: {after - before}")

    # Show what was generated
    print("\nGenerated expenses:")
    for item in result["templates"]:
        if "generated" in item.get("action", ""):
            print(
                f"  ✓ {item['name']} - €{item.get('amount', 0):.2f} on {item['date']}"
            )
