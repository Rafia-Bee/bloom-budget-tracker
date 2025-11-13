"""
Bloom - Seed Data Script

Adds sample transactions for testing purposes.
Run this script to populate the database with test data.

Usage:
    python -m backend.seed_data
"""

from datetime import datetime, timedelta
from backend.app import create_app
from backend.models.database import db, User, Expense, Income, BudgetPeriod

def seed_data():
    app = create_app()

    with app.app_context():
        # Check if test user exists
        user = User.query.filter_by(email='test@bloom.com').first()

        if not user:
            print("Creating test user: test@bloom.com / password123")
            user = User(email='test@bloom.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
        else:
            print(f"Using existing user: {user.email}")

        # Clear existing test data for this user
        Expense.query.filter_by(user_id=user.id).delete()
        Income.query.filter_by(user_id=user.id).delete()
        BudgetPeriod.query.filter_by(user_id=user.id).delete()
        db.session.commit()

        today = datetime.now().date()

        # Create a budget period for the test data (monthly period covering today)
        budget_period = BudgetPeriod(
            user_id=user.id,
            period_type='monthly',
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=19)  # 30-day period
        )
        db.session.add(budget_period)
        db.session.commit()

        print(f"✓ Created budget period: {budget_period.start_date} to {budget_period.end_date}")

        # Sample Income
        incomes = [
            {'type': 'Salary', 'amount': 250000, 'date': today - timedelta(days=5)},  # €2500
            {'type': 'Freelance', 'amount': 50000, 'date': today - timedelta(days=2)},  # €500
            {'type': 'Side Gig', 'amount': 30000, 'date': today},  # €300 (today)
            {'type': 'Bonus', 'amount': 100000, 'date': today + timedelta(days=3)},  # €1000
            {'type': 'Refund', 'amount': 7500, 'date': today + timedelta(days=1)},  # €75 (tomorrow)
        ]

        for inc in incomes:
            income = Income(
                user_id=user.id,
                budget_period_id=budget_period.id,
                type=inc['type'],
                amount=inc['amount'],
                scheduled_date=inc['date'],
                actual_date=inc['date']
            )
            db.session.add(income)

        # Sample Expenses
        expenses = [
            # Credit Card Expenses
            {'name': 'Wolt', 'amount': 2850, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': today - timedelta(days=7)},
            {'name': 'Netflix', 'amount': 1599, 'category': 'Fixed Expenses', 'subcategory': 'Subscriptions',
             'payment_method': 'Credit card', 'date': today - timedelta(days=6)},
            {'name': 'H&M', 'amount': 4500, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': today - timedelta(days=5)},
            {'name': 'Uber', 'amount': 1250, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Credit card', 'date': today - timedelta(days=4)},
            {'name': 'Cinema', 'amount': 1500, 'category': 'Flexible Expenses', 'subcategory': 'Entertainment',
             'payment_method': 'Credit card', 'date': today - timedelta(days=3)},
            {'name': 'Spotify', 'amount': 999, 'category': 'Fixed Expenses', 'subcategory': 'Subscriptions',
             'payment_method': 'Credit card', 'date': today - timedelta(days=2)},
            {'name': 'Starbucks', 'amount': 650, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': today - timedelta(days=1)},
            {'name': 'Amazon', 'amount': 3500, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': today},  # Today
            {'name': 'Gas Station', 'amount': 5000, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Credit card', 'date': today + timedelta(days=1)},  # Tomorrow
            {'name': 'Restaurant', 'amount': 4200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': today + timedelta(days=2)},  # Day after

            # Debit Card Expenses
            {'name': 'Lidl Groceries', 'amount': 6500, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': today - timedelta(days=6)},
            {'name': 'Bus Pass', 'amount': 4000, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Debit card', 'date': today - timedelta(days=5)},
            {'name': 'Pharmacy', 'amount': 2500, 'category': 'Flexible Expenses', 'subcategory': 'Health',
             'payment_method': 'Debit card', 'date': today - timedelta(days=4)},
            {'name': 'Electricity Bill', 'amount': 8500, 'category': 'Fixed Expenses', 'subcategory': 'Utilities',
             'payment_method': 'Debit card', 'date': today - timedelta(days=3)},
            {'name': 'Coffee Shop', 'amount': 850, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': today - timedelta(days=1)},
            {'name': 'Bakery', 'amount': 1200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': today},  # Today
            {'name': 'Internet Bill', 'amount': 5500, 'category': 'Fixed Expenses', 'subcategory': 'Utilities',
             'payment_method': 'Debit card', 'date': today + timedelta(days=1)},  # Tomorrow
            {'name': 'Gym Membership', 'amount': 3500, 'category': 'Flexible Expenses', 'subcategory': 'Health',
             'payment_method': 'Debit card', 'date': today + timedelta(days=2)},  # Day after

            # Credit Card Payment (reduces credit balance)
            {'name': 'Credit Card Payment', 'amount': 50000, 'category': 'Debt Payments',
             'subcategory': 'Credit Card', 'payment_method': 'Debit card', 'date': today - timedelta(days=7)},

            # Future Expenses
            {'name': 'Rent', 'amount': 95000, 'category': 'Fixed Expenses', 'subcategory': 'Rent',
             'payment_method': 'Debit card', 'date': today + timedelta(days=5)},
            {'name': 'Insurance', 'amount': 15000, 'category': 'Fixed Expenses', 'subcategory': 'Insurance',
             'payment_method': 'Debit card', 'date': today + timedelta(days=8)},
            {'name': 'Phone Bill', 'amount': 2500, 'category': 'Fixed Expenses', 'subcategory': 'Utilities',
             'payment_method': 'Debit card', 'date': today + timedelta(days=7)},
        ]

        for exp in expenses:
            expense = Expense(
                user_id=user.id,
                budget_period_id=budget_period.id,
                name=exp['name'],
                amount=exp['amount'],
                category=exp['category'],
                subcategory=exp['subcategory'],
                payment_method=exp['payment_method'],
                date=exp['date']
            )
            db.session.add(expense)

        db.session.commit()

        print(f"\n✓ Added {len(incomes)} income entries")
        print(f"✓ Added {len(expenses)} expense entries")
        print("\nSample data seeded successfully!")
        print("\nLogin credentials:")
        print("  Email: test@bloom.com")
        print("  Password: password123")

        # Calculate totals
        total_income = sum(i['amount'] for i in incomes) / 100
        credit_expenses = sum(e['amount'] for e in expenses if e['payment_method'] == 'Credit card') / 100
        debit_expenses = sum(e['amount'] for e in expenses
                           if e['payment_method'] == 'Debit card'
                           and not (e['category'] == 'Debt Payments' and e['subcategory'] == 'Credit Card')) / 100
        credit_payment = 500.00  # The credit card payment

        print(f"\nTest Data Summary:")
        print(f"  Total Income: €{total_income:.2f}")
        print(f"  Credit Card Spent: €{credit_expenses:.2f}")
        print(f"  Credit Card Payment: €{credit_payment:.2f}")
        print(f"  Net Credit Balance: €{credit_expenses - credit_payment:.2f}")
        print(f"  Debit Card Spent: €{debit_expenses + credit_payment:.2f}")
        print(f"  Debit Available: €{total_income - (debit_expenses + credit_payment):.2f}")

if __name__ == '__main__':
    seed_data()
