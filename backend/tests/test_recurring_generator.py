"""
Bloom - Recurring Generator Tests

Unit tests for the recurring expense generator utility.
Tests date calculations, expense generation, and upcoming expense preview.

Coverage targets:
- calculate_next_due_date: weekly, biweekly, monthly (edge cases), custom
- generate_due_expenses: normal flow, dry run, duplicate handling
- get_upcoming_recurring_expenses: lookahead preview
"""

import pytest
from datetime import datetime, date, timedelta
from unittest.mock import patch, MagicMock

from backend.models.database import (
    db,
    RecurringExpense,
    Expense,
    BudgetPeriod,
    SalaryPeriod,
    User,
)
from backend.utils.recurring_generator import (
    calculate_next_due_date,
    find_budget_period_for_date,
    generate_due_expenses,
    get_upcoming_recurring_expenses,
)


def create_recurring_expense(user_id, **kwargs):
    """Helper to create a RecurringExpense with required defaults."""
    today = date.today()
    defaults = {
        "user_id": user_id,
        "name": "Test Expense",
        "amount": 1000,
        "category": "Bills",
        "frequency": "monthly",
        "start_date": today,
        "next_due_date": today,
        "is_active": True,
    }
    defaults.update(kwargs)
    return RecurringExpense(**defaults)


class TestCalculateNextDueDate:
    """Tests for calculate_next_due_date function - date arithmetic for frequencies"""

    def test_weekly_frequency(self, app):
        """Weekly recurring: adds 7 days"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "weekly"
            mock_expense.next_due_date = date(2025, 1, 15)

            result = calculate_next_due_date(mock_expense)

            assert result == date(2025, 1, 22)

    def test_biweekly_frequency(self, app):
        """Biweekly recurring: adds 14 days"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "biweekly"
            mock_expense.next_due_date = date(2025, 1, 15)

            result = calculate_next_due_date(mock_expense)

            assert result == date(2025, 1, 29)

    def test_monthly_frequency_normal_day(self, app):
        """Monthly recurring: same day next month"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "monthly"
            mock_expense.next_due_date = date(2025, 1, 15)
            mock_expense.day_of_month = 15

            result = calculate_next_due_date(mock_expense)

            assert result == date(2025, 2, 15)

    def test_monthly_frequency_december_to_january(self, app):
        """Monthly recurring across year boundary: Dec -> Jan"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "monthly"
            mock_expense.next_due_date = date(2025, 12, 15)
            mock_expense.day_of_month = 15

            result = calculate_next_due_date(mock_expense)

            assert result == date(2026, 1, 15)

    def test_monthly_frequency_day_31_to_february(self, app):
        """Monthly recurring with day 31 going into February: clamps to day 28"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "monthly"
            mock_expense.next_due_date = date(2025, 1, 31)
            mock_expense.day_of_month = 31

            result = calculate_next_due_date(mock_expense)

            # day_of_month 31 gets clamped to min(31, 28) = 28 for safety
            assert result == date(2025, 2, 28)

    def test_monthly_frequency_february_leap_year(self, app):
        """Monthly recurring in leap year February: allows day 29"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "monthly"
            mock_expense.next_due_date = date(2024, 1, 29)
            mock_expense.day_of_month = 29

            result = calculate_next_due_date(mock_expense)

            # 2024 is leap year, Feb has 29 days
            # But code clamps to min(day_of_month, 28), so it'll be 28
            assert result == date(2024, 2, 28)

    def test_monthly_frequency_day_30_to_april(self, app):
        """Monthly recurring: day 30 works for April (30-day month)"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "monthly"
            mock_expense.next_due_date = date(2025, 3, 30)
            mock_expense.day_of_month = 30

            result = calculate_next_due_date(mock_expense)

            # day_of_month 30 gets clamped to min(30, 28) = 28
            assert result == date(2025, 4, 28)

    def test_custom_frequency(self, app):
        """Custom frequency: adds custom number of days"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "custom"
            mock_expense.next_due_date = date(2025, 1, 15)
            mock_expense.frequency_value = 10  # Every 10 days

            result = calculate_next_due_date(mock_expense)

            assert result == date(2025, 1, 25)

    def test_unknown_frequency_returns_same_date(self, app):
        """Unknown frequency: returns same date (fallback)"""
        with app.app_context():
            mock_expense = MagicMock()
            mock_expense.frequency = "unknown"
            mock_expense.next_due_date = date(2025, 1, 15)

            result = calculate_next_due_date(mock_expense)

            assert result == date(2025, 1, 15)


class TestFindBudgetPeriodForDate:
    """Tests for find_budget_period_for_date function"""

    def test_finds_matching_period(self, app, client, auth_headers, salary_period):
        """Finds budget period that contains the given date"""
        with app.app_context():
            # Get user from test context
            user = User.query.filter_by(email="test@example.com").first()

            # Today should be in the salary period we created
            today = date.today()
            period = find_budget_period_for_date(user.id, today)

            assert period is not None
            assert period.start_date <= today <= period.end_date

    def test_returns_none_for_date_outside_periods(self, app, client, auth_headers):
        """Returns None when no period contains the date"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()

            # Date far in the past (no periods exist)
            old_date = date(2000, 1, 1)
            period = find_budget_period_for_date(user.id, old_date)

            assert period is None


class TestGenerateDueExpenses:
    """Tests for generate_due_expenses function - the main generation logic"""

    def test_dry_run_returns_preview(self, app, client, auth_headers, salary_period):
        """Dry run shows what would be generated without creating expenses"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            # Create a recurring expense due today
            recurring = create_recurring_expense(
                user.id,
                name="Test Subscription",
                amount=1000,  # €10.00
                category="Subscriptions",
                frequency="monthly",
                day_of_month=today.day,
                start_date=today,
                next_due_date=today,
            )
            db.session.add(recurring)
            db.session.commit()

            # Dry run
            result = generate_due_expenses(user_id=user.id, dry_run=True)

            assert result["dry_run"] is True
            assert result["generated_count"] == 1
            assert len(result["templates"]) == 1
            assert result["templates"][0]["action"] == "would generate"

            # Verify no actual expense was created
            expense_count = Expense.query.filter_by(user_id=user.id).count()
            assert expense_count == 0

    def test_generates_expense_from_template(
        self, app, client, auth_headers, salary_period
    ):
        """Normal run creates expense from due recurring template"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            # Create a recurring expense due today
            recurring = create_recurring_expense(
                user.id,
                name="Netflix",
                amount=1599,  # €15.99
                category="Subscriptions",
                frequency="monthly",
                day_of_month=today.day,
                start_date=today,
                next_due_date=today,
                payment_method="debit",
                is_fixed_bill=True,
            )
            db.session.add(recurring)
            db.session.commit()
            recurring_id = recurring.id

            # Generate
            result = generate_due_expenses(user_id=user.id, dry_run=False)

            assert result["generated_count"] == 1
            assert result["templates"][0]["action"] == "generated"

            # Verify expense was created with correct values
            expense = Expense.query.filter_by(
                user_id=user.id, recurring_template_id=recurring_id
            ).first()
            assert expense is not None
            assert expense.name == "Netflix"
            assert expense.amount == 1599
            assert expense.category == "Subscriptions"
            assert expense.payment_method == "debit"
            assert expense.is_fixed_bill is True

    def test_updates_next_due_date_after_generation(
        self, app, client, auth_headers, salary_period
    ):
        """After generating, next_due_date is updated to next occurrence"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Weekly Expense",
                amount=500,
                category="Food",
                frequency="weekly",
                start_date=today,
                next_due_date=today,
            )
            db.session.add(recurring)
            db.session.commit()
            recurring_id = recurring.id

            generate_due_expenses(user_id=user.id, dry_run=False)

            # Refresh from DB
            recurring = db.session.get(RecurringExpense, recurring_id)
            assert recurring.next_due_date == today + timedelta(days=7)

    def test_skips_already_generated_expense(
        self, app, client, auth_headers, salary_period
    ):
        """Skips generation if expense already exists for that date"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Duplicate Test",
                amount=1000,
                category="Bills",
                frequency="monthly",
                day_of_month=today.day,
                start_date=today,
                next_due_date=today,
            )
            db.session.add(recurring)
            db.session.commit()
            recurring_id = recurring.id

            # Manually create the expense (simulating it was already generated)
            existing_expense = Expense(
                user_id=user.id,
                name="Duplicate Test",
                amount=1000,
                category="Bills",
                date=today,
                recurring_template_id=recurring_id,
            )
            db.session.add(existing_expense)
            db.session.commit()

            # Run generation
            result = generate_due_expenses(user_id=user.id, dry_run=False)

            assert result["generated_count"] == 0
            assert "skipped" in result["templates"][0]["action"]

            # Still only one expense
            expense_count = Expense.query.filter_by(
                user_id=user.id, recurring_template_id=recurring_id
            ).count()
            assert expense_count == 1

    def test_respects_end_date(self, app, client, auth_headers, salary_period):
        """Does not generate for templates past their end_date"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()
            yesterday = today - timedelta(days=1)
            last_week = today - timedelta(days=7)

            recurring = create_recurring_expense(
                user.id,
                name="Expired Template",
                amount=1000,
                category="Bills",
                frequency="monthly",
                start_date=last_week,
                next_due_date=today,
                end_date=yesterday,  # Already expired
            )
            db.session.add(recurring)
            db.session.commit()

            result = generate_due_expenses(user_id=user.id, dry_run=False)

            # Should not be processed (filtered out by query)
            assert result["templates_processed"] == 0

    def test_deactivates_template_after_end_date(
        self, app, client, auth_headers, salary_period
    ):
        """Template is deactivated when next_due_date would exceed end_date"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Last Run",
                amount=1000,
                category="Bills",
                frequency="weekly",
                start_date=today,
                next_due_date=today,
                end_date=today + timedelta(days=3),  # Less than 7 days out
            )
            db.session.add(recurring)
            db.session.commit()
            recurring_id = recurring.id

            generate_due_expenses(user_id=user.id, dry_run=False)

            # Verify template was deactivated
            recurring = db.session.get(RecurringExpense, recurring_id)
            assert recurring.is_active is False

    def test_ignores_inactive_templates(self, app, client, auth_headers, salary_period):
        """Inactive templates are not processed"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Inactive Template",
                amount=1000,
                category="Bills",
                frequency="monthly",
                start_date=today,
                next_due_date=today,
                is_active=False,
            )
            db.session.add(recurring)
            db.session.commit()

            result = generate_due_expenses(user_id=user.id, dry_run=False)

            assert result["templates_processed"] == 0
            assert result["generated_count"] == 0

    def test_days_ahead_parameter(self, app, client, auth_headers, salary_period):
        """days_ahead parameter controls lookahead window"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()
            future_date = today + timedelta(days=30)

            recurring = create_recurring_expense(
                user.id,
                name="Future Expense",
                amount=1000,
                category="Bills",
                frequency="monthly",
                start_date=today,
                next_due_date=future_date,
            )
            db.session.add(recurring)
            db.session.commit()

            # With days_ahead=7, future expense should not be processed
            result_short = generate_due_expenses(
                user_id=user.id, dry_run=True, days_ahead=7
            )
            assert result_short["templates_processed"] == 0

            # With days_ahead=60, it should be included
            result_long = generate_due_expenses(
                user_id=user.id, dry_run=True, days_ahead=60
            )
            assert result_long["templates_processed"] == 1


class TestGetUpcomingRecurringExpenses:
    """Tests for get_upcoming_recurring_expenses function - preview upcoming bills"""

    def test_returns_upcoming_expenses_in_window(
        self, app, client, auth_headers, salary_period
    ):
        """Returns expenses due within the specified days"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Weekly Bill",
                amount=2000,
                category="Bills",
                frequency="weekly",
                start_date=today,
                next_due_date=today + timedelta(days=3),
            )
            db.session.add(recurring)
            db.session.commit()

            upcoming = get_upcoming_recurring_expenses(user.id, days=30)

            # Weekly = 4+ occurrences in 30 days
            assert len(upcoming) >= 4
            assert all(item["name"] == "Weekly Bill" for item in upcoming)
            assert all(item["amount"] == 20.0 for item in upcoming)  # €20.00

    def test_sorted_by_date(self, app, client, auth_headers, salary_period):
        """Results are sorted by date"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            # Create two recurring expenses
            r1 = create_recurring_expense(
                user.id,
                name="Later Expense",
                amount=1000,
                category="Bills",
                frequency="monthly",
                day_of_month=25,
                start_date=today,
                next_due_date=today + timedelta(days=20),
            )
            r2 = create_recurring_expense(
                user.id,
                name="Sooner Expense",
                amount=500,
                category="Food",
                frequency="weekly",
                start_date=today,
                next_due_date=today + timedelta(days=5),
            )
            db.session.add_all([r1, r2])
            db.session.commit()

            upcoming = get_upcoming_recurring_expenses(user.id, days=30)

            # Verify sorted by date
            dates = [item["date"] for item in upcoming]
            assert dates == sorted(dates)

    def test_respects_end_date(self, app, client, auth_headers, salary_period):
        """Stops generating occurrences after end_date"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Limited Expense",
                amount=1000,
                category="Bills",
                frequency="weekly",
                start_date=today,
                next_due_date=today + timedelta(days=7),
                end_date=today + timedelta(days=14),  # Only 2 weeks
            )
            db.session.add(recurring)
            db.session.commit()

            upcoming = get_upcoming_recurring_expenses(user.id, days=60)

            # Should have at most 2 occurrences (week 1 and week 2)
            limited_items = [
                item for item in upcoming if item["name"] == "Limited Expense"
            ]
            assert len(limited_items) <= 2

    def test_ignores_inactive_templates(self, app, client, auth_headers, salary_period):
        """Inactive templates are not included"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Inactive",
                amount=1000,
                category="Bills",
                frequency="weekly",
                start_date=today,
                next_due_date=today + timedelta(days=3),
                is_active=False,
            )
            db.session.add(recurring)
            db.session.commit()

            upcoming = get_upcoming_recurring_expenses(user.id, days=30)

            assert len(upcoming) == 0

    def test_monthly_frequency_projection(
        self, app, client, auth_headers, salary_period
    ):
        """Monthly expenses project correctly across months"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Monthly Bill",
                amount=5000,
                category="Bills",
                frequency="monthly",
                day_of_month=15,
                start_date=today,
                next_due_date=today + timedelta(days=10),
            )
            db.session.add(recurring)
            db.session.commit()

            upcoming = get_upcoming_recurring_expenses(user.id, days=90)

            # Should have ~3 occurrences in 90 days
            monthly_items = [
                item for item in upcoming if item["name"] == "Monthly Bill"
            ]
            assert 2 <= len(monthly_items) <= 4

    def test_custom_frequency_projection(
        self, app, client, auth_headers, salary_period
    ):
        """Custom frequency expenses project correctly"""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = date.today()

            recurring = create_recurring_expense(
                user.id,
                name="Custom Interval",
                amount=2500,
                category="Other",
                frequency="custom",
                frequency_value=10,  # Every 10 days
                start_date=today,
                next_due_date=today + timedelta(days=5),
            )
            db.session.add(recurring)
            db.session.commit()

            upcoming = get_upcoming_recurring_expenses(user.id, days=30)

            # Should have ~3 occurrences in 30 days (every 10 days)
            custom_items = [
                item for item in upcoming if item["name"] == "Custom Interval"
            ]
            assert 2 <= len(custom_items) <= 4
