"""
Test script for weekly budget breakdown in export functionality.
Validates carryover calculations, fixed/flexible expense separation, and data accuracy.
"""
import json
from datetime import datetime, timedelta
from sqlalchemy import and_
from backend.models.database import db, User, SalaryPeriod, BudgetPeriod, Expense
from backend.app import create_app
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


app = create_app()

with app.app_context():
    # Get a test user
    user = User.query.filter_by(email="test@bloom.com").first()
    if not user:
        print("❌ Test user not found. Run seed_data.py first.")
        sys.exit(1)

    print(f"✓ Testing export for user: {user.email} (ID: {user.id})")

    # Create a salary period if one doesn't exist
    salary_periods = SalaryPeriod.query.filter_by(user_id=user.id, is_active=True).all()

    if not salary_periods:
        print("⚠️  No salary period found. Creating test salary period...")

        # Create a salary period covering November 2025
        start_date = datetime(2025, 11, 1).date()
        end_date = datetime(2025, 11, 28).date()

        salary_period = SalaryPeriod(
            user_id=user.id,
            initial_debit_balance=500000,  # €5000
            initial_credit_balance=100000,  # €1000
            credit_limit=200000,  # €2000
            credit_budget_allowance=50000,  # €500
            salary_amount=300000,  # €3000
            total_budget_amount=550000,  # €5500
            fixed_bills_total=150000,  # €1500
            remaining_amount=400000,  # €4000
            weekly_budget=100000,  # €1000
            weekly_debit_budget=90000,  # €900
            weekly_credit_budget=10000,  # €100
            start_date=start_date,
            end_date=end_date,
            is_active=True,
        )
        db.session.add(salary_period)
        db.session.commit()

        # Create 4 weekly budget periods
        for week_num in range(1, 5):
            week_start = start_date + timedelta(days=(week_num - 1) * 7)
            week_end = week_start + timedelta(days=6)

            budget_period = BudgetPeriod(
                user_id=user.id,
                salary_period_id=salary_period.id,
                week_number=week_num,
                budget_amount=100000,  # €1000 per week
                start_date=week_start,
                end_date=week_end,
                period_type="weekly",  # Add required period_type field
            )
            db.session.add(budget_period)

        db.session.commit()

        # Update existing expenses to link to the new budget periods
        expenses = Expense.query.filter_by(user_id=user.id).all()
        for expense in expenses:
            # Find the budget period that contains this expense date
            matching_period = BudgetPeriod.query.filter(
                and_(
                    BudgetPeriod.user_id == user.id,
                    BudgetPeriod.start_date <= expense.date,
                    BudgetPeriod.end_date >= expense.date,
                )
            ).first()

            if matching_period:
                expense.budget_period_id = matching_period.id

        db.session.commit()

        salary_periods = [salary_period]
        print(f"✓ Created salary period with 4 weeks")

    print(f"✓ Found {len(salary_periods)} active salary period(s)")

    if not salary_periods:
        print("❌ No salary periods found. Create one first.")
        sys.exit(1)

    # Import the breakdown function
    from backend.routes.export_import import generate_weekly_budget_breakdown

    # Generate breakdown
    breakdown = generate_weekly_budget_breakdown(user.id)

    print(f"\n{'='*80}")
    print("WEEKLY BUDGET BREAKDOWN EXPORT TEST")
    print(f"{'='*80}\n")

    for period_data in breakdown:
        print(
            f"📅 Salary Period {period_data['salary_period_id']}: {period_data['salary_period_dates']}"
        )
        print(f"{'─'*80}")

        for week in period_data["weeks"]:
            print(f"\n  Week {week['week_number']}: {week['date_range']}")
            print(f"  Base Budget:     €{week['base_budget']/100:.2f}")
            print(f"  Carryover:       €{week['carryover']/100:.2f}")
            print(f"  Adjusted Budget: €{week['adjusted_budget']/100:.2f}")
            print(f"  Flexible Spent:  €{week['spent']['flexible_expenses']/100:.2f}")
            print(f"  Fixed Spent:     €{week['spent']['fixed_expenses']/100:.2f}")
            print(f"  Total Spent:     €{week['spent']['total']/100:.2f}")
            print(f"  Remaining:       €{week['remaining']/100:.2f}")

            # Show expense breakdown
            if week["expense_breakdown"]["flexible"]:
                print(
                    f"\n  Flexible Expenses ({len(week['expense_breakdown']['flexible'])}):"
                )
                for exp in week["expense_breakdown"]["flexible"][:5]:  # Show first 5
                    print(
                        f"    • {exp['name']}: €{exp['amount']/100:.2f} ({exp['category']})"
                    )
                if len(week["expense_breakdown"]["flexible"]) > 5:
                    print(
                        f"    ... and {len(week['expense_breakdown']['flexible']) - 5} more"
                    )

            if week["expense_breakdown"]["fixed"]:
                print(
                    f"\n  Fixed Expenses ({len(week['expense_breakdown']['fixed'])}):"
                )
                for exp in week["expense_breakdown"]["fixed"][:3]:  # Show first 3
                    print(
                        f"    • {exp['name']}: €{exp['amount']/100:.2f} ({exp['category']})"
                    )
                if len(week["expense_breakdown"]["fixed"]) > 3:
                    print(
                        f"    ... and {len(week['expense_breakdown']['fixed']) - 3} more"
                    )

        # Show summary
        summary = period_data["summary"]
        print(f"\n  {'─'*76}")
        print(f"  Period Summary:")
        print(f"  Total Budget Allocated: €{summary['total_budget_allocated']/100:.2f}")
        print(f"  Total Flexible Spent:   €{summary['total_flexible_spent']/100:.2f}")
        print(f"  Total Fixed Spent:      €{summary['total_fixed_spent']/100:.2f}")
        print(f"  Final Remaining:        €{summary['final_remaining']/100:.2f}")
        print(f"  {'─'*76}\n")

    # Validate data structure
    print(f"\n{'='*80}")
    print("VALIDATION CHECKS")
    print(f"{'='*80}\n")

    validation_passed = True

    for period_data in breakdown:
        period_id = period_data["salary_period_id"]

        # Check weeks are in order
        week_numbers = [w["week_number"] for w in period_data["weeks"]]
        if week_numbers != sorted(week_numbers):
            print(f"❌ Period {period_id}: Weeks not in order")
            validation_passed = False
        else:
            print(f"✓ Period {period_id}: Weeks in correct order")

        # Check carryover logic
        for i, week in enumerate(period_data["weeks"]):
            expected_adjusted = week["base_budget"] + week["carryover"]
            if week["adjusted_budget"] != expected_adjusted:
                print(
                    f"❌ Period {period_id}, Week {week['week_number']}: Adjusted budget calculation error"
                )
                validation_passed = False
            else:
                print(
                    f"✓ Period {period_id}, Week {week['week_number']}: Carryover calculation correct"
                )

            # Check remaining calculation
            expected_remaining = (
                week["adjusted_budget"] - week["spent"]["flexible_expenses"]
            )
            if week["remaining"] != expected_remaining:
                print(
                    f"❌ Period {period_id}, Week {week['week_number']}: Remaining calculation error"
                )
                validation_passed = False

        # Check summary totals
        total_budget = sum(w["base_budget"] for w in period_data["weeks"])
        if period_data["summary"]["total_budget_allocated"] != total_budget:
            print(f"❌ Period {period_id}: Summary total budget mismatch")
            validation_passed = False
        else:
            print(f"✓ Period {period_id}: Summary totals correct")

    print(f"\n{'='*80}")
    if validation_passed:
        print("✅ ALL VALIDATION CHECKS PASSED")
    else:
        print("❌ SOME VALIDATION CHECKS FAILED")
    print(f"{'='*80}\n")

    # Test full export endpoint structure
    print("Testing full export data structure...")
    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "data": {"weekly_budget_breakdown": breakdown},
    }

    # Verify JSON serializable
    try:
        json_str = json.dumps(export_data, indent=2)
        print(f"✓ Export data is JSON serializable ({len(json_str)} bytes)")
    except Exception as e:
        print(f"❌ Export data is NOT JSON serializable: {e}")
        validation_passed = False

    if validation_passed:
        print("\n✅ Weekly budget breakdown export feature is working correctly!")
    else:
        print("\n❌ Issues found in weekly budget breakdown export")
        sys.exit(1)
