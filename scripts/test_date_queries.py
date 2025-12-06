"""
Test script to verify date-based queries work correctly.
Tests the Phase 1 implementation where date ranges replace budget_period_id filters.
"""

from backend.app import create_app
from backend.models.database import db, User, BudgetPeriod, Expense
from sqlalchemy import and_, func
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def test_date_based_queries():
    app = create_app()

    with app.app_context():
        print("\n" + "=" * 60)
        print("Testing Date-Based Queries (Phase 1)")
        print("=" * 60)

        # Get test user
        user = User.query.filter_by(email="test@bloom.com").first()
        if not user:
            print("❌ Test user not found. Run seed_data.py first.")
            return

        print(f"✓ Found test user: {user.email}")

        # Get all budget periods for the user
        weeks = (
            BudgetPeriod.query.filter_by(user_id=user.id)
            .order_by(BudgetPeriod.start_date)
            .all()
        )

        if not weeks:
            print("❌ No budget periods found.")
            return

        print(f"✓ Found {len(weeks)} budget periods\n")

        # Test date-based queries vs period_id queries for each week
        all_match = True
        for i, week in enumerate(weeks, 1):
            week_label = (
                f"Week {week.week_number}" if week.week_number else f"Period {i}"
            )
            print(f"{week_label}: {week.start_date} to {week.end_date}")

            # OLD METHOD: Query by budget_period_id
            old_query_total = (
                db.session.query(func.sum(Expense.amount))
                .filter(
                    and_(
                        Expense.user_id == user.id,
                        Expense.budget_period_id == week.id,
                        Expense.is_fixed_bill == False,
                    )
                )
                .scalar()
                or 0
            )

            # NEW METHOD: Query by date range
            new_query_total = (
                db.session.query(func.sum(Expense.amount))
                .filter(
                    and_(
                        Expense.user_id == user.id,
                        Expense.date >= week.start_date,
                        Expense.date <= week.end_date,
                        Expense.is_fixed_bill == False,
                    )
                )
                .scalar()
                or 0
            )

            # Get count of expenses for debugging
            old_count = Expense.query.filter(
                and_(
                    Expense.user_id == user.id,
                    Expense.budget_period_id == week.id,
                    Expense.is_fixed_bill == False,
                )
            ).count()

            new_count = Expense.query.filter(
                and_(
                    Expense.user_id == user.id,
                    Expense.date >= week.start_date,
                    Expense.date <= week.end_date,
                    Expense.is_fixed_bill == False,
                )
            ).count()

            match = old_query_total == new_query_total
            status = "✓" if match else "✗"

            print(
                f"  {status} Old method (period_id): {old_count} expenses, €{old_query_total/100:.2f}"
            )
            print(
                f"  {status} New method (date range): {new_count} expenses, €{new_query_total/100:.2f}"
            )

            if not match:
                print(f"  ⚠️  MISMATCH DETECTED!")
                all_match = False

                # Show expenses that differ
                old_expenses = set(
                    e.id
                    for e in Expense.query.filter(
                        and_(
                            Expense.user_id == user.id,
                            Expense.budget_period_id == week.id,
                            Expense.is_fixed_bill == False,
                        )
                    ).all()
                )

                new_expenses = set(
                    e.id
                    for e in Expense.query.filter(
                        and_(
                            Expense.user_id == user.id,
                            Expense.date >= week.start_date,
                            Expense.date <= week.end_date,
                            Expense.is_fixed_bill == False,
                        )
                    ).all()
                )

                only_in_old = old_expenses - new_expenses
                only_in_new = new_expenses - old_expenses

                if only_in_old:
                    print(f"  Only in old query: {only_in_old}")
                if only_in_new:
                    print(f"  Only in new query: {only_in_new}")

            print()

        print("=" * 60)
        if all_match:
            print("✅ SUCCESS: All date-based queries match period_id queries!")
        else:
            print("❌ FAILURE: Some queries don't match. Check details above.")
        print("=" * 60 + "\n")


if __name__ == "__main__":
    test_date_based_queries()
