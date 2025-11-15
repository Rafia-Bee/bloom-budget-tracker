"""
Bloom - Seed Data Script

Adds sample transactions for testing purposes.
Run this script to populate the database with test data.

Usage:
    python -m backend.seed_data
"""

from datetime import datetime, timedelta
from backend.app import create_app
from backend.models.database import db, User, Expense, Income, BudgetPeriod, Debt

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

        # Clear existing test data for this user only
        print(f"⚠️  Wiping data for user: {user.email}")
        Expense.query.filter_by(user_id=user.id).delete()
        Income.query.filter_by(user_id=user.id).delete()
        BudgetPeriod.query.filter_by(user_id=user.id).delete()
        Debt.query.filter_by(user_id=user.id).delete()
        db.session.commit()
        print("✓ Test user data wiped clean")

        today = datetime.now().date()

        # Create 4 weekly budget periods for November 2025
        november_periods = [
            {'start': datetime(2025, 11, 1).date(), 'end': datetime(2025, 11, 7).date()},    # Week 1: Nov 1-7
            {'start': datetime(2025, 11, 8).date(), 'end': datetime(2025, 11, 14).date()},   # Week 2: Nov 8-14
            {'start': datetime(2025, 11, 15).date(), 'end': datetime(2025, 11, 21).date()},  # Week 3: Nov 15-21
            {'start': datetime(2025, 11, 22).date(), 'end': datetime(2025, 11, 28).date()},  # Week 4: Nov 22-28
        ]

        periods = []
        for period_data in november_periods:
            budget_period = BudgetPeriod(
                user_id=user.id,
                period_type='weekly',
                start_date=period_data['start'],
                end_date=period_data['end']
            )
            db.session.add(budget_period)
            db.session.commit()
            periods.append(budget_period)
            print(f"✓ Created budget period: {budget_period.start_date} to {budget_period.end_date}")

        # Sample Income for each period (weekly salary + extras)
        incomes_data = [
            # Week 1 (Nov 1-7)
            {'type': 'Weekly Salary', 'amount': 62500, 'date': datetime(2025, 11, 1).date(), 'period_idx': 0},
            {'type': 'Freelance', 'amount': 15000, 'date': datetime(2025, 11, 3).date(), 'period_idx': 0},
            {'type': 'Side Gig', 'amount': 8000, 'date': datetime(2025, 11, 5).date(), 'period_idx': 0},

            # Week 2 (Nov 8-14)
            {'type': 'Weekly Salary', 'amount': 62500, 'date': datetime(2025, 11, 8).date(), 'period_idx': 1},
            {'type': 'Bonus', 'amount': 25000, 'date': datetime(2025, 11, 10).date(), 'period_idx': 1},
            {'type': 'Refund', 'amount': 5000, 'date': datetime(2025, 11, 12).date(), 'period_idx': 1},

            # Week 3 (Nov 15-21)
            {'type': 'Weekly Salary', 'amount': 62500, 'date': datetime(2025, 11, 15).date(), 'period_idx': 2},
            {'type': 'Freelance', 'amount': 12000, 'date': datetime(2025, 11, 17).date(), 'period_idx': 2},
            {'type': 'Gift', 'amount': 10000, 'date': datetime(2025, 11, 19).date(), 'period_idx': 2},

            # Week 4 (Nov 22-28)
            {'type': 'Weekly Salary', 'amount': 62500, 'date': datetime(2025, 11, 22).date(), 'period_idx': 3},
            {'type': 'Side Gig', 'amount': 9000, 'date': datetime(2025, 11, 24).date(), 'period_idx': 3},
            {'type': 'Commission', 'amount': 18000, 'date': datetime(2025, 11, 26).date(), 'period_idx': 3},
        ]

        for inc in incomes_data:
            income = Income(
                user_id=user.id,
                budget_period_id=periods[inc['period_idx']].id,
                type=inc['type'],
                amount=inc['amount'],
                scheduled_date=inc['date'],
                actual_date=inc['date']
            )
            db.session.add(income)

        # Extensive Sample Expenses across all 4 weeks (enough for scrolling)
        expenses_data = [
            # Week 1 (Nov 1-7) - 20+ transactions
            {'name': 'Lidl Groceries', 'amount': 6500, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 1).date(), 'period_idx': 0},
            {'name': 'Coffee Shop', 'amount': 450, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 1).date(), 'period_idx': 0},
            {'name': 'Bus Pass', 'amount': 4000, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 2).date(), 'period_idx': 0},
            {'name': 'Netflix', 'amount': 1599, 'category': 'Fixed Expenses', 'subcategory': 'Subscriptions',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 2).date(), 'period_idx': 0},
            {'name': 'Wolt Lunch', 'amount': 1850, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 3).date(), 'period_idx': 0},
            {'name': 'Pharmacy', 'amount': 2500, 'category': 'Flexible Expenses', 'subcategory': 'Health',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 3).date(), 'period_idx': 0},
            {'name': 'Spotify', 'amount': 999, 'category': 'Fixed Expenses', 'subcategory': 'Subscriptions',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 4).date(), 'period_idx': 0},
            {'name': 'Uber', 'amount': 1250, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 4).date(), 'period_idx': 0},
            {'name': 'Bakery', 'amount': 850, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 5).date(), 'period_idx': 0},
            {'name': 'Cinema', 'amount': 1500, 'category': 'Flexible Expenses', 'subcategory': 'Entertainment',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 5).date(), 'period_idx': 0},
            {'name': 'Electricity Bill', 'amount': 8500, 'category': 'Fixed Expenses', 'subcategory': 'Utilities',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 6).date(), 'period_idx': 0},
            {'name': 'H&M', 'amount': 4500, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 6).date(), 'period_idx': 0},
            {'name': 'Starbucks', 'amount': 650, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 7).date(), 'period_idx': 0},
            {'name': 'Supermarket', 'amount': 5200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 7).date(), 'period_idx': 0},
            {'name': 'Student Loan Payment', 'amount': 25000, 'category': 'Debt Payments',
             'subcategory': 'Student Loan', 'payment_method': 'Debit card', 'date': datetime(2025, 11, 5).date(), 'period_idx': 0},

            # Week 2 (Nov 8-14) - 20+ transactions
            {'name': 'Groceries', 'amount': 7200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 8).date(), 'period_idx': 1},
            {'name': 'Gym Membership', 'amount': 3500, 'category': 'Flexible Expenses', 'subcategory': 'Health',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 8).date(), 'period_idx': 1},
            {'name': 'Restaurant', 'amount': 4200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 9).date(), 'period_idx': 1},
            {'name': 'Gas Station', 'amount': 5000, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 9).date(), 'period_idx': 1},
            {'name': 'Amazon Order', 'amount': 3500, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 10).date(), 'period_idx': 1},
            {'name': 'Internet Bill', 'amount': 5500, 'category': 'Fixed Expenses', 'subcategory': 'Utilities',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 10).date(), 'period_idx': 1},
            {'name': 'Lunch', 'amount': 1200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 11).date(), 'period_idx': 1},
            {'name': 'Coffee', 'amount': 400, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 11).date(), 'period_idx': 1},
            {'name': 'Phone Bill', 'amount': 2500, 'category': 'Fixed Expenses', 'subcategory': 'Utilities',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 12).date(), 'period_idx': 1},
            {'name': 'Bookstore', 'amount': 2800, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 12).date(), 'period_idx': 1},
            {'name': 'Taxi', 'amount': 1800, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 13).date(), 'period_idx': 1},
            {'name': 'Dinner', 'amount': 3200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 13).date(), 'period_idx': 1},
            {'name': 'Groceries', 'amount': 4800, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 14).date(), 'period_idx': 1},
            {'name': 'Movie Tickets', 'amount': 2000, 'category': 'Flexible Expenses', 'subcategory': 'Entertainment',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 14).date(), 'period_idx': 1},
            {'name': 'Car Loan Payment', 'amount': 35000, 'category': 'Debt Payments',
             'subcategory': 'Car Loan', 'payment_method': 'Debit card', 'date': datetime(2025, 11, 12).date(), 'period_idx': 1},

            # Week 3 (Nov 15-21) - 20+ transactions
            {'name': 'Weekly Groceries', 'amount': 6800, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 15).date(), 'period_idx': 2},
            {'name': 'Breakfast', 'amount': 950, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 15).date(), 'period_idx': 2},
            {'name': 'Zara', 'amount': 6500, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 16).date(), 'period_idx': 2},
            {'name': 'Fuel', 'amount': 5500, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 16).date(), 'period_idx': 2},
            {'name': 'Lunch Delivery', 'amount': 1650, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 17).date(), 'period_idx': 2},
            {'name': 'Vitamin Supplements', 'amount': 3200, 'category': 'Flexible Expenses', 'subcategory': 'Health',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 17).date(), 'period_idx': 2},
            {'name': 'Steam Games', 'amount': 2500, 'category': 'Flexible Expenses', 'subcategory': 'Entertainment',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 18).date(), 'period_idx': 2},
            {'name': 'Coffee Shop', 'amount': 550, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 18).date(), 'period_idx': 2},
            {'name': 'Parking Fee', 'amount': 800, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 19).date(), 'period_idx': 2},
            {'name': 'Restaurant Dinner', 'amount': 5200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 19).date(), 'period_idx': 2},
            {'name': 'IKEA', 'amount': 8900, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 20).date(), 'period_idx': 2},
            {'name': 'Snacks', 'amount': 1200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 20).date(), 'period_idx': 2},
            {'name': 'Grocery Shopping', 'amount': 5400, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 21).date(), 'period_idx': 2},
            {'name': 'Concert Tickets', 'amount': 4500, 'category': 'Flexible Expenses', 'subcategory': 'Entertainment',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 21).date(), 'period_idx': 2},
            {'name': 'Personal Loan Payment', 'amount': 20000, 'category': 'Debt Payments',
             'subcategory': 'Personal Loan', 'payment_method': 'Debit card', 'date': datetime(2025, 11, 19).date(), 'period_idx': 2},

            # Week 4 (Nov 22-28) - 20+ transactions
            {'name': 'Lidl', 'amount': 7500, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 22).date(), 'period_idx': 3},
            {'name': 'Insurance', 'amount': 15000, 'category': 'Fixed Expenses', 'subcategory': 'Insurance',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 22).date(), 'period_idx': 3},
            {'name': 'Brunch', 'amount': 2800, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 23).date(), 'period_idx': 3},
            {'name': 'Uber Rides', 'amount': 2200, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 23).date(), 'period_idx': 3},
            {'name': 'Nike Store', 'amount': 9500, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 24).date(), 'period_idx': 3},
            {'name': 'Fast Food', 'amount': 1400, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 24).date(), 'period_idx': 3},
            {'name': 'Gas', 'amount': 6000, 'category': 'Flexible Expenses', 'subcategory': 'Transportation',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 25).date(), 'period_idx': 3},
            {'name': 'Electronics Store', 'amount': 12000, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 25).date(), 'period_idx': 3},
            {'name': 'Dinner Out', 'amount': 4800, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 26).date(), 'period_idx': 3},
            {'name': 'Doctor Visit', 'amount': 8000, 'category': 'Flexible Expenses', 'subcategory': 'Health',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 26).date(), 'period_idx': 3},
            {'name': 'Bakery Items', 'amount': 1100, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 27).date(), 'period_idx': 3},
            {'name': 'Books', 'amount': 3500, 'category': 'Flexible Expenses', 'subcategory': 'Shopping',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 27).date(), 'period_idx': 3},
            {'name': 'Supermarket', 'amount': 6200, 'category': 'Flexible Expenses', 'subcategory': 'Food',
             'payment_method': 'Debit card', 'date': datetime(2025, 11, 28).date(), 'period_idx': 3},
            {'name': 'Bar & Drinks', 'amount': 3800, 'category': 'Flexible Expenses', 'subcategory': 'Entertainment',
             'payment_method': 'Credit card', 'date': datetime(2025, 11, 28).date(), 'period_idx': 3},
            {'name': 'Credit Card Payment', 'amount': 50000, 'category': 'Debt Payments',
             'subcategory': 'Credit Card', 'payment_method': 'Debit card', 'date': datetime(2025, 11, 26).date(), 'period_idx': 3},
        ]

        for exp in expenses_data:
            expense = Expense(
                user_id=user.id,
                budget_period_id=periods[exp['period_idx']].id,
                name=exp['name'],
                amount=exp['amount'],
                category=exp['category'],
                subcategory=exp['subcategory'],
                payment_method=exp['payment_method'],
                date=exp['date']
            )
            db.session.add(expense)

        db.session.commit()

        print(f"\n✓ Added {len(incomes_data)} income entries across 4 weekly periods")
        print(f"✓ Added {len(expenses_data)} expense entries for scroll testing")

        # Sample Debts
        debts = [
            {
                'name': 'Student Loan',
                'original_amount': 1500000,  # €15,000
                'current_balance': 875000,   # €8,750
                'monthly_payment': 25000     # €250
            },
            {
                'name': 'Car Loan',
                'original_amount': 1200000,  # €12,000
                'current_balance': 650000,   # €6,500
                'monthly_payment': 35000     # €350
            },
            {
                'name': 'Personal Loan',
                'original_amount': 500000,   # €5,000
                'current_balance': 275000,   # €2,750
                'monthly_payment': 20000     # €200
            }
        ]

        for debt_data in debts:
            debt = Debt(
                user_id=user.id,
                name=debt_data['name'],
                original_amount=debt_data['original_amount'],
                current_balance=debt_data['current_balance'],
                monthly_payment=debt_data['monthly_payment']
            )
            db.session.add(debt)

        db.session.commit()

        print(f"✓ Added {len(debts)} debt entries")
        print("\nSample data seeded successfully!")
        print("\nLogin credentials:")
        print("  Email: test@bloom.com")
        print("  Password: password123")

        # Calculate totals for Week 3 (current active period)
        week3_incomes = [i for i in incomes_data if i['period_idx'] == 2]
        week3_expenses = [e for e in expenses_data if e['period_idx'] == 2]

        total_income = sum(i['amount'] for i in week3_incomes) / 100
        credit_expenses = sum(e['amount'] for e in week3_expenses if e['payment_method'] == 'Credit card') / 100
        debit_expenses = sum(e['amount'] for e in week3_expenses
                           if e['payment_method'] == 'Debit card'
                           and e['category'] != 'Debt Payments') / 100
        total_debt = sum(d['current_balance'] for d in debts) / 100
        total_monthly_debt_payment = sum(d['monthly_payment'] for d in debts) / 100

        print(f"\nWeek 3 Summary (Nov 15-21):")
        print(f"  Total Income: €{total_income:.2f}")
        print(f"  Credit Card Spent: €{credit_expenses:.2f}")
        print(f"  Debit Card Spent: €{debit_expenses:.2f}")
        print(f"\nOverall Debt Summary:")
        print(f"  Total Debt: €{total_debt:.2f}")
        print(f"  Monthly Debt Payments: €{total_monthly_debt_payment:.2f}")
        print(f"\nData Distribution:")
        print(f"  Week 1 (Nov 1-7): {len([e for e in expenses_data if e['period_idx'] == 0])} transactions")
        print(f"  Week 2 (Nov 8-14): {len([e for e in expenses_data if e['period_idx'] == 1])} transactions")
        print(f"  Week 3 (Nov 15-21): {len([e for e in expenses_data if e['period_idx'] == 2])} transactions")
        print(f"  Week 4 (Nov 22-28): {len([e for e in expenses_data if e['period_idx'] == 3])} transactions")

if __name__ == '__main__':
    seed_data()
