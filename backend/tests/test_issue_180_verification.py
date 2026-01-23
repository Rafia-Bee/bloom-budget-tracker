"""
Issue #180 Verification Tests

These tests verify whether the bugs described in Issue #180 are still present.
They test specific edge cases that were reported as bugs.

Issue #180: Restore unpushed bug fixes from 2026-01-19 session
"""

import pytest
from datetime import date, timedelta
from backend.models.database import (
    db,
    User,
    SalaryPeriod,
    BudgetPeriod,
    Expense,
    Income,
    RecurringExpense,
    RecurringIncome,
)


class TestIssue180Verification:
    """Tests to verify if Issue #180 bugs are still present."""

    # ========================================================================
    # Issue 3: Null anchor_date Comparisons
    # Test: TypeError: '<' not supported between 'datetime.date' and 'NoneType'
    # ========================================================================

    def test_balance_service_handles_null_anchor_date(self, app, client, auth_headers):
        """
        Issue #180 Bug #3: Null anchor_date comparisons cause TypeError.

        When user.balance_start_date is None and there's a salary period,
        the balance service should handle the comparison gracefully.
        """
        from backend.services.balance_service import get_display_balances

        with app.app_context():
            # The test user is always ID 1 in test database (created fresh each test)
            user = db.session.get(User, 1)
            assert user is not None, "Test user not found"
            user_id = user.id

            # Ensure user has no balance_start_date (None)
            user.balance_start_date = None
            user.user_initial_debit_balance = 100000  # Has a balance but no start date
            db.session.commit()

            # Create a salary period
            today = date.today()
            salary_period = SalaryPeriod(
                user_id=user_id,
                initial_debit_balance=100000,
                initial_credit_balance=50000,
                credit_limit=150000,
                credit_budget_allowance=0,
                total_budget_amount=100000,
                remaining_amount=100000,
                weekly_budget=25000,
                weekly_debit_budget=25000,
                num_sub_periods=4,
                start_date=today,
                end_date=today + timedelta(days=27),
            )
            db.session.add(salary_period)
            db.session.commit()

            # This should NOT raise TypeError
            # If bug exists: TypeError: '<' not supported between 'datetime.date' and 'NoneType'
            try:
                result = get_display_balances(salary_period.id, user_id)
                assert "debit_balance" in result
                assert "credit_available" in result
            except TypeError as e:
                if "'<' not supported between" in str(e) and "NoneType" in str(e):
                    pytest.fail(
                        f"Issue #180 Bug #3 STILL EXISTS: Null anchor_date comparison error: {e}"
                    )
                raise

    # ========================================================================
    # Issue 5: Recurring Income Export/Import Support
    # ========================================================================

    def test_export_includes_recurring_income(self, client, auth_headers, app):
        """
        Issue #180 Bug #5: Export should include recurring_income data.

        Recurring income templates should be exportable for data backup.
        """
        with app.app_context():
            # The test user is always ID 1 in test database
            user = db.session.get(User, 1)
            assert user is not None, "Test user not found"
            user_id = user.id

            # Create a recurring income
            today = date.today()
            recurring_income = RecurringIncome(
                user_id=user_id,
                name="Monthly Salary",
                amount=500000,  # €5000
                income_type="Salary",
                frequency="monthly",
                day_of_month=25,
                start_date=today,
                next_due_date=(
                    today.replace(day=25)
                    if today.day < 25
                    else (today.replace(day=1) + timedelta(days=32)).replace(day=25)
                ),
                is_active=True,
            )
            db.session.add(recurring_income)
            db.session.commit()

        # Try to export recurring_income
        response = client.post(
            "/api/v1/data/export",
            json={"types": ["recurring_income"]},
            headers=auth_headers,
        )

        # If bug exists, either:
        # 1. The type is not recognized (400 error)
        # 2. The data is empty even though we created a record
        if response.status_code == 400:
            if (
                "invalid" in response.json.get("error", "").lower()
                or "type" in response.json.get("error", "").lower()
            ):
                pytest.fail(
                    "Issue #180 Bug #5 STILL EXISTS: recurring_income export type not supported"
                )

        # Check if the data is actually included
        if response.status_code == 200:
            data = response.json.get("data", {})
            if "recurring_income" not in data:
                pytest.fail(
                    "Issue #180 Bug #5 STILL EXISTS: recurring_income not included in export"
                )

    def test_import_recurring_income(self, client, auth_headers, app):
        """
        Issue #180 Bug #5: Import should handle recurring_income data.

        Recurring income templates should be importable from backup.
        """
        today = date.today()
        import_data = {
            "data": {
                "recurring_income": [
                    {
                        "name": "Imported Monthly Salary",
                        "amount": 450000,
                        "income_type": "Salary",
                        "frequency": "monthly",
                        "day_of_month": 1,
                        "start_date": today.isoformat(),
                        "next_due_date": today.isoformat(),
                        "is_active": True,
                    }
                ]
            }
        }

        response = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )

        # Check if import was processed
        if response.status_code != 200:
            pytest.fail(
                f"Issue #180 Bug #5 STILL EXISTS: recurring_income import failed: {response.json}"
            )

        # Check if the record was actually created
        imported = response.json.get("imported", {})
        if "recurring_income" not in imported:
            pytest.fail(
                "Issue #180 Bug #5 STILL EXISTS: recurring_income not processed during import"
            )

        # Check if count shows at least one was imported
        if imported.get("recurring_income", 0) == 0:
            pytest.fail(
                f"Issue #180 Bug #5 STILL EXISTS: recurring_income imported count is 0. Full response: {response.json}"
            )

    # ========================================================================
    # Issue 6: Delete-All Missing Recurring Income
    # ========================================================================

    def test_delete_all_includes_recurring_income(self, app, client, auth_headers):
        """
        Issue #180 Bug #6: Delete-all should clear recurring income.

        When user deletes all their data, recurring income should also be deleted.
        """
        with app.app_context():
            # The test user is always ID 1 in test database
            user = db.session.get(User, 1)
            assert user is not None, "Test user not found"
            user_id = user.id

            # Create a recurring income
            today = date.today()
            recurring_income = RecurringIncome(
                user_id=user_id,
                name="Test Salary",
                amount=300000,
                income_type="Salary",
                frequency="monthly",
                day_of_month=15,
                start_date=today,
                next_due_date=today,
                is_active=True,
            )
            db.session.add(recurring_income)
            db.session.commit()

            # Verify it was created
            count_before = RecurringIncome.query.filter_by(user_id=user_id).count()
            assert count_before >= 1, "Test setup failed - recurring income not created"

        # Delete all user data
        response = client.post(
            "/api/v1/user-data/delete-all",
            json={"confirmation": "Delete everything"},
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Check if recurring income was deleted
        with app.app_context():
            count_after = RecurringIncome.query.filter_by(user_id=user_id).count()

            if count_after > 0:
                pytest.fail(
                    f"Issue #180 Bug #6 STILL EXISTS: Delete-all did not clear recurring income. "
                    f"Before: {count_before}, After: {count_after}"
                )

    # ========================================================================
    # Issue 2: Expected Income Not Sent to Create Endpoint
    # (This is now fixed per PR 182, but let's verify)
    # ========================================================================

    def test_salary_period_create_uses_expected_income(self, app, client, auth_headers):
        """
        Issue #180 Bug #2: Expected income should be included in budget calculation.

        When creating a salary period with expected income, the budget should
        include that income amount.
        """
        with app.app_context():
            # The test user is always ID 1 in test database
            user = db.session.get(User, 1)
            assert user is not None, "Test user not found"
            user_id = user.id

            # Create a recurring income that will be auto-detected
            today = date.today()
            recurring_income = RecurringIncome(
                user_id=user_id,
                name="Expected Salary",
                amount=200000,  # €2000
                income_type="Salary",
                frequency="monthly",
                day_of_month=15,
                start_date=today,
                next_due_date=today + timedelta(days=5),
                is_active=True,
            )
            db.session.add(recurring_income)
            db.session.commit()
            rec_income_id = recurring_income.id

        # Create a salary period
        today = date.today()
        end_date = today + timedelta(days=27)
        response = client.post(
            "/api/v1/salary-periods",
            json={
                "debit_balance": 50000,  # €500
                "credit_balance": 100000,  # €1000 available
                "credit_limit": 150000,
                "credit_allowance": 0,
                "start_date": today.isoformat(),
                "end_date": end_date.isoformat(),
                "num_sub_periods": 4,
                "expected_income": [
                    {"id": rec_income_id, "name": "Expected Salary", "amount": 200000}
                ],
            },
            headers=auth_headers,
        )

        # Budget should be: 50000 (debit) + 200000 (expected income) = 250000
        # With 4 sub-periods: weekly_budget should be ~62500 each
        assert response.status_code == 201, f"Create failed: {response.json}"

        # Get the created period ID from response
        period_id = response.json.get("id")
        assert period_id is not None, "No period ID in response"

        # Fetch the created salary period to verify total_budget_amount
        with app.app_context():
            sp = db.session.get(SalaryPeriod, period_id)
            assert sp is not None, f"Salary period {period_id} not found"
            total_budget = sp.total_budget_amount

        # If bug exists, budget would be only 50000 (without expected income)
        if total_budget < 100000:  # Significantly less than expected
            pytest.fail(
                f"Issue #180 Bug #2 MIGHT EXIST: Budget ({total_budget}) doesn't seem to "
                f"include expected income. Expected ~250000 or close."
            )


class TestIssue180AdditionalChecks:
    """Additional verification checks for Issue #180 related functionality."""

    def test_recurring_income_model_exists(self, app):
        """Verify RecurringIncome model is properly defined."""
        with app.app_context():
            # This import should work
            from backend.models.database import RecurringIncome

            # Model should have expected attributes
            assert hasattr(RecurringIncome, "user_id")
            assert hasattr(RecurringIncome, "name")
            assert hasattr(RecurringIncome, "amount")
            assert hasattr(RecurringIncome, "income_type")
            assert hasattr(RecurringIncome, "is_active")

    def test_income_has_recurring_income_id_field(self, app):
        """Verify Income model has recurring_income_id for linking."""
        with app.app_context():
            from backend.models.database import Income

            # Income should have field to link to recurring income template
            assert hasattr(Income, "recurring_income_id"), (
                "Income model missing recurring_income_id field - "
                "needed for Issue #180 Bug #7 (recurring badge)"
            )
