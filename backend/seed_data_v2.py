"""
Bloom - Seed Data Script (Production-like Structure)

Creates realistic test data matching production structure but with fewer transactions.
Based on actual Finnish expenses, debts, and billing patterns.

Usage:
    python -m backend.seed_data_v2
"""

from datetime import datetime, timedelta
from backend.app import create_app
from backend.models.database import (
    db,
    User,
    Expense,
    Income,
    SalaryPeriod,
    Debt,
    RecurringExpense,
)


def seed_data():
    app = create_app()

    with app.app_context():
        # Check if test user exists
        user = User.query.filter_by(email="test@bloom.com").first()

        if not user:
            print("Creating test user: test@bloom.com / password123")
            user = User(email="test@bloom.com")
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
        else:
            print(f"Using existing user: {user.email}")

        # Clear existing test data for this user only
        print(f"⚠️  Wiping data for user: {user.email}")
        Expense.query.filter_by(user_id=user.id).delete()
        Income.query.filter_by(user_id=user.id).delete()
        SalaryPeriod.query.filter_by(user_id=user.id).delete()
        Debt.query.filter_by(user_id=user.id).delete()
        RecurringExpense.query.filter_by(user_id=user.id).delete()
        db.session.commit()
        print("✓ Test user data wiped clean")

        # ============================================
        # DEBTS (Finnish installment loans)
        # ============================================
        debts_data = [
            {
                "name": "Klarna Turkish Airlines Old",
                "original_amount": 205855,  # €2058.55
                "current_balance": 47206,  # €472.06
                "monthly_payment": 10500,  # €105.00
            },
            {
                "name": "Klarna Turkish Airlines New",
                "original_amount": 110883,  # €1108.83
                "current_balance": 89450,  # €894.50
                "monthly_payment": 10291,  # €102.91
            },
            {
                "name": "Klarna Gigantti",
                "original_amount": 58590,  # €585.90
                "current_balance": 54448,  # €544.48
                "monthly_payment": 5323,  # €53.23
            },
            {
                "name": "Elisa (Phone)",
                "original_amount": 84840,  # €848.40
                "current_balance": 67165,  # €671.65
                "monthly_payment": 3535,  # €35.35
            },
            {
                "name": "Telia Rahoitus",
                "original_amount": 100000,  # €1000.00
                "current_balance": 80001,  # €800.01
                "monthly_payment": 4546,  # €45.46
            },
        ]

        print("\n📊 Creating debts...")
        for debt_info in debts_data:
            debt = Debt(
                user_id=user.id,
                name=debt_info["name"],
                original_amount=debt_info["original_amount"],
                current_balance=debt_info["current_balance"],
                monthly_payment=debt_info["monthly_payment"],
            )
            db.session.add(debt)
        db.session.commit()
        print(f"✓ Created {len(debts_data)} debts")

        # ============================================
        # RECURRING EXPENSES (Finnish bills)
        # ============================================
        recurring_data = [
            # Debt payments (day 20 of month)
            {
                "name": "Telia",
                "amount": 4546,
                "category": "Debt Payments",
                "subcategory": "Telia Rahoitus",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            {
                "name": "Elisa",
                "amount": 3535,
                "category": "Debt Payments",
                "subcategory": "Elisa (Phone)",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            {
                "name": "Klarna Gigantti",
                "amount": 5323,
                "category": "Debt Payments",
                "subcategory": "Klarna Gigantti",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            {
                "name": "Klarna Turkish Airlines New",
                "amount": 10291,
                "category": "Debt Payments",
                "subcategory": "Klarna Turkish Airlines New",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            {
                "name": "Klarna Turkish Airlines Old",
                "amount": 10080,
                "category": "Debt Payments",
                "subcategory": "Klarna Turkish Airlines Old",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            # Fixed expenses (day 20 of month)
            {
                "name": "Rent",
                "amount": 94718,
                "category": "Fixed Expenses",
                "subcategory": "Rent",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            {
                "name": "Fortum",
                "amount": 2651,
                "category": "Fixed Expenses",
                "subcategory": "Utilities",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            {
                "name": "DNA",
                "amount": 3490,
                "category": "Fixed Expenses",
                "subcategory": "Subscriptions",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            {
                "name": "Credit card repayment",
                "amount": 99104,
                "category": "Debt Payments",
                "subcategory": "Credit Card",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 20,
                "is_fixed_bill": True,
            },
            # Other recurring (different dates)
            {
                "name": "Insinööriliitto",
                "amount": 3525,
                "category": "Fixed Expenses",
                "subcategory": "Insurance",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 15,
                "is_fixed_bill": True,
            },
            {
                "name": "Telia Dot",
                "amount": 810,
                "category": "Fixed Expenses",
                "subcategory": "Subscriptions",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 15,
                "is_fixed_bill": True,
            },
            {
                "name": "YouTube Premium",
                "amount": 1499,
                "category": "Flexible Expenses",
                "subcategory": "Entertainment",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 30,
                "is_fixed_bill": False,
            },
            {
                "name": "Caruna (Quarterly)",
                "amount": 4583,
                "category": "Fixed Expenses",
                "subcategory": "Utilities",
                "payment_method": "Debit card",
                "frequency": "custom",
                "frequency_value": 90,  # Every 90 days
                "is_fixed_bill": True,
            },
        ]

        print("\n🔁 Creating recurring expenses...")
        start_date = datetime(2025, 11, 20).date()
        for rec_info in recurring_data:
            recurring = RecurringExpense(
                user_id=user.id,
                name=rec_info["name"],
                amount=rec_info["amount"],
                category=rec_info["category"],
                subcategory=rec_info["subcategory"],
                payment_method=rec_info["payment_method"],
                frequency=rec_info["frequency"],
                day_of_month=rec_info.get("day_of_month"),
                frequency_value=rec_info.get("frequency_value"),
                is_fixed_bill=rec_info["is_fixed_bill"],
                start_date=start_date,
                is_active=True,
            )
            db.session.add(recurring)
        db.session.commit()
        print(f"✓ Created {len(recurring_data)} recurring expenses")

        # ============================================
        # SALARY PERIOD (Nov 20 - Dec 19, 2025)
        # ============================================
        print("\n💼 Creating salary period...")

        # Calculate fixed bills total
        fixed_bills_total = sum(
            r["amount"]
            for r in recurring_data
            if r["is_fixed_bill"] and r.get("day_of_month") == 20
        )

        initial_debit = 307200  # €3072.00
        initial_credit = 8942  # €89.42
        credit_limit = 150000  # €1500.00
        credit_allowance = 0  # Not using credit for budget

        total_budget = initial_debit + credit_allowance - fixed_bills_total
        weekly_budget = total_budget // 4

        salary_period = SalaryPeriod(
            user_id=user.id,
            initial_debit_balance=initial_debit,
            initial_credit_balance=initial_credit,
            credit_limit=credit_limit,
            credit_budget_allowance=credit_allowance,
            total_budget_amount=total_budget,
            fixed_bills_total=fixed_bills_total,
            remaining_amount=total_budget,
            weekly_budget=weekly_budget,
            weekly_debit_budget=weekly_budget,
            weekly_credit_budget=0,
            start_date=datetime(2025, 11, 20).date(),
            end_date=datetime(2025, 12, 19).date(),
            is_active=True,
        )
        db.session.add(salary_period)
        db.session.flush()

        print(f"✓ Created salary period (Nov 20 - Dec 19)")
        print(f"  Fixed bills: €{fixed_bills_total/100:.2f}")
        print(f"  Weekly budget: €{weekly_budget/100:.2f}")

        # ============================================
        # INCOME
        # ============================================
        print("\n💰 Creating income...")
        income_entries = [
            {
                "type": "Initial Balance",
                "amount": initial_debit,
                "date": "2025-11-20",
            },
            {
                "type": "Freelance",
                "amount": 30350,  # €303.50
                "date": "2025-11-27",
            },
        ]

        for inc in income_entries:
            income = Income(
                user_id=user.id,
                type=inc["type"],
                amount=inc["amount"],
                scheduled_date=datetime.strptime(inc["date"], "%Y-%m-%d").date(),
                actual_date=datetime.strptime(inc["date"], "%Y-%m-%d").date(),
            )
            db.session.add(income)
        db.session.commit()
        print(f"✓ Created {len(income_entries)} income entries")

        # ============================================
        # EXPENSES (Realistic Finnish purchases)
        # ============================================
        print("\n🛒 Creating expenses...")

        expenses_data = [
            # Week 1: Nov 20-26 (Initial credit card debt + flexible expenses)
            {
                "name": "Pre-existing Credit Card Debt",
                "amount": 141058,
                "category": "Debt",
                "subcategory": "Credit Card",
                "payment_method": "Credit card",
                "date": "2025-11-19",
                "notes": "Existing credit card balance at budget period start",
            },
            {
                "name": "Credit card repayment",
                "amount": 99104,
                "category": "Debt Payments",
                "subcategory": "Credit Card",
                "payment_method": "Debit card",
                "date": "2025-11-20",
                "is_fixed_bill": True,
            },
            {
                "name": "Wolt",
                "amount": 2614,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Credit card",
                "date": "2025-11-21",
            },
            {
                "name": "K-Market Itäkeskus",
                "amount": 4523,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-11-22",
            },
            {
                "name": "Uber",
                "amount": 1854,
                "category": "Flexible Expenses",
                "subcategory": "Transportation",
                "payment_method": "Credit card",
                "date": "2025-11-23",
            },
            {
                "name": "HSL",
                "amount": 320,
                "category": "Flexible Expenses",
                "subcategory": "Transportation",
                "payment_method": "Debit card",
                "date": "2025-11-24",
            },
            {
                "name": "Verkkokauppa.com",
                "amount": 8590,
                "category": "Flexible Expenses",
                "subcategory": "Shopping",
                "payment_method": "Debit card",
                "date": "2025-11-25",
            },
            {
                "name": "Gigantti",
                "amount": 6767,
                "category": "Flexible Expenses",
                "subcategory": "Shopping",
                "payment_method": "Credit card",
                "date": "2025-11-26",
            },
            {
                "name": "Extra Klarna Payment",
                "amount": 4112,
                "category": "Debt Payments",
                "subcategory": "Klarna Turkish Airlines Old",
                "payment_method": "Debit card",
                "date": "2025-11-26",
            },
            # Week 2: Nov 27 - Dec 3 (Fixed bills day + flexible)
            {
                "name": "Rent",
                "amount": 94718,
                "category": "Fixed Expenses",
                "subcategory": "Rent",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "DNA",
                "amount": 3490,
                "category": "Fixed Expenses",
                "subcategory": "Subscriptions",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Fortum",
                "amount": 2651,
                "category": "Fixed Expenses",
                "subcategory": "Utilities",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Telia",
                "amount": 4546,
                "category": "Debt Payments",
                "subcategory": "Telia Rahoitus",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Elisa",
                "amount": 3535,
                "category": "Debt Payments",
                "subcategory": "Elisa (Phone)",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Klarna Gigantti",
                "amount": 5323,
                "category": "Debt Payments",
                "subcategory": "Klarna Gigantti",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Klarna Turkish Airlines New",
                "amount": 10291,
                "category": "Debt Payments",
                "subcategory": "Klarna Turkish Airlines New",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Klarna Turkish Airlines Old",
                "amount": 10080,
                "category": "Debt Payments",
                "subcategory": "Klarna Turkish Airlines Old",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Insinööriliitto",
                "amount": 3525,
                "category": "Fixed Expenses",
                "subcategory": "Insurance",
                "payment_method": "Debit card",
                "date": "2025-11-28",
                "is_fixed_bill": True,
            },
            {
                "name": "Disney+",
                "amount": 1099,
                "category": "Fixed Expenses",
                "subcategory": "Subscriptions",
                "payment_method": "Debit card",
                "date": "2025-11-28",
            },
            {
                "name": "Uber",
                "amount": 2059,
                "category": "Flexible Expenses",
                "subcategory": "Transportation",
                "payment_method": "Credit card",
                "date": "2025-11-27",
            },
            {
                "name": "Wolt",
                "amount": 5004,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-11-30",
            },
            {
                "name": "YouTube Premium",
                "amount": 1499,
                "category": "Flexible Expenses",
                "subcategory": "Entertainment",
                "payment_method": "Debit card",
                "date": "2025-11-30",
            },
            {
                "name": "Wolt",
                "amount": 1478,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-02",
            },
            {
                "name": "Wolt",
                "amount": 3356,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-03",
            },
            # Week 3: Dec 4-10 (Just flexible expenses)
            {
                "name": "Wolt",
                "amount": 6212,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-04",
            },
            {
                "name": "Wolt",
                "amount": 3294,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-04",
            },
            {
                "name": "S-Market",
                "amount": 2424,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-05",
            },
            {
                "name": "Wolt",
                "amount": 3271,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Credit card",
                "date": "2025-12-06",
            },
            {
                "name": "Uber",
                "amount": 1304,
                "category": "Flexible Expenses",
                "subcategory": "Transportation",
                "payment_method": "Debit card",
                "date": "2025-12-07",
            },
            {
                "name": "Wolt",
                "amount": 2840,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-07",
            },
            {
                "name": "Nordea",
                "amount": 465,
                "category": "Fixed Expenses",
                "subcategory": "Subscriptions",
                "payment_method": "Debit card",
                "date": "2025-12-10",
            },
            {
                "name": "Prisma",
                "amount": 3054,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-10",
            },
            # Week 4: Dec 11-17 (Some expenses, not full week yet)
            {
                "name": "Uber",
                "amount": 912,
                "category": "Flexible Expenses",
                "subcategory": "Transportation",
                "payment_method": "Debit card",
                "date": "2025-12-11",
            },
            {
                "name": "Sodexo Nokia",
                "amount": 860,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-11",
            },
            {
                "name": "HSL",
                "amount": 320,
                "category": "Flexible Expenses",
                "subcategory": "Transportation",
                "payment_method": "Debit card",
                "date": "2025-12-11",
            },
            {
                "name": "Wolt",
                "amount": 1626,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-12-12",
            },
            {
                "name": "Telia Dot",
                "amount": 810,
                "category": "Fixed Expenses",
                "subcategory": "Subscriptions",
                "payment_method": "Debit card",
                "date": "2025-12-15",
                "is_fixed_bill": True,
            },
            {
                "name": "Prime Video",
                "amount": 699,
                "category": "Flexible Expenses",
                "subcategory": "Entertainment",
                "payment_method": "Debit card",
                "date": "2025-12-15",
            },
        ]

        for exp in expenses_data:
            expense = Expense(
                user_id=user.id,
                name=exp["name"],
                amount=exp["amount"],
                category=exp["category"],
                subcategory=exp["subcategory"],
                payment_method=exp["payment_method"],
                date=datetime.strptime(exp["date"], "%Y-%m-%d").date(),
                is_fixed_bill=exp.get("is_fixed_bill", False),
                notes=exp.get("notes"),
            )
            db.session.add(expense)

        db.session.commit()
        print(f"✓ Created {len(expenses_data)} expenses")

        # ============================================
        # SUMMARY
        # ============================================
        print("\n" + "=" * 50)
        print("✅ Seed data created successfully!")
        print("=" * 50)
        print("\nLogin credentials:")
        print("  Email: test@bloom.com")
        print("  Password: password123")
        print("\nData created:")
        print(f"  📊 {len(debts_data)} debts")
        print(f"  🔁 {len(recurring_data)} recurring expenses")
        print(f"  💼 1 salary period (Nov 20 - Dec 19)")
        print(f"  💰 {len(income_entries)} income entries")
        print(f"  🛒 {len(expenses_data)} expenses")
        print("\n📅 Salary Period Details:")
        print(f"  Initial debit: €{initial_debit/100:.2f}")
        print(f"  Credit available: €{(credit_limit - initial_credit)/100:.2f}")
        print(f"  Fixed bills: €{fixed_bills_total/100:.2f}")
        print(f"  Weekly budget: €{weekly_budget/100:.2f}")

        # Calculate week spending
        week_ranges = [
            ("Week 1", "2025-11-20", "2025-11-26"),
            ("Week 2", "2025-11-27", "2025-12-03"),
            ("Week 3", "2025-12-04", "2025-12-10"),
            ("Week 4", "2025-12-11", "2025-12-17"),
        ]

        print("\n📊 Week-by-week breakdown:")
        for week_name, start, end in week_ranges:
            week_expenses = [
                e
                for e in expenses_data
                if start <= e["date"] <= end and e.get("category") != "Debt"
            ]
            week_total = sum(e["amount"] for e in week_expenses)
            fixed_count = sum(1 for e in week_expenses if e.get("is_fixed_bill"))
            flexible_count = len(week_expenses) - fixed_count
            print(
                f"  {week_name} ({start} to {end}): €{week_total/100:.2f} ({fixed_count} fixed, {flexible_count} flexible)"
            )


if __name__ == "__main__":
    seed_data()
