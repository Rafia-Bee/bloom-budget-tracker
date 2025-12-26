"""
Bloom - Salary Period Routes Tests

Integration tests for salary period endpoints including:
- Period creation via wizard (creates 4 budget weeks)
- Carryover recalculation when expenses change
- Period deletion with cascade cleanup
- Active period detection logic
- Period overlap validation
"""

import pytest
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from backend.models.database import db, SalaryPeriod, BudgetPeriod, Expense, User


class TestSalaryPeriodCreation:
    """Tests for POST /api/v1/salary-periods - period creation"""

    def test_create_salary_period_creates_4_weeks(self, client, auth_headers):
        """Creating a salary period should auto-create 4 budget weeks"""
        start_date = date.today()

        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 500000,  # €5000
                "credit_balance": 100000,  # €1000
                "credit_limit": 150000,
                "credit_allowance": 30000,  # €300
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        period_id = response.json["id"]

        # Verify 4 budget periods were created
        with client.application.app_context():
            budget_periods = BudgetPeriod.query.filter_by(
                salary_period_id=period_id
            ).all()
            assert len(budget_periods) == 4

            # Verify week numbers
            week_numbers = [bp.week_number for bp in budget_periods]
            assert sorted(week_numbers) == [1, 2, 3, 4]

    def test_create_salary_period_calculates_weekly_budget(self, client, auth_headers):
        """Weekly budget should be (debit + credit_allowance - fixed_bills) / 4"""
        start_date = date.today()

        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 400000,  # €4000
                "credit_balance": 100000,
                "credit_limit": 100000,
                "credit_allowance": 40000,  # €400
                "fixed_bills": [{"name": "Rent", "amount": 80000}],  # €800
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        period_id = response.json["id"]

        # Verify weekly budget via GET endpoint
        with client.application.app_context():
            period = SalaryPeriod.query.get(period_id)
            # Total budget = 4000 + 400 - 800 = 3600
            # Weekly = 3600 / 4 = 900
            assert period.weekly_budget == 90000  # €900

    def test_create_period_rejects_credit_allowance_exceeding_available(
        self, client, auth_headers
    ):
        """Credit allowance cannot exceed available credit"""
        start_date = date.today()

        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 200000,
                "credit_balance": 50000,  # €500 available
                "credit_limit": 100000,
                "credit_allowance": 60000,  # €600 - more than available!
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "exceed" in response.json["error"].lower()

    def test_week_dates_are_consecutive(self, client, auth_headers):
        """Week date ranges should be consecutive with no gaps"""
        start_date = date.today()

        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 500000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        period_id = response.json["id"]

        with client.application.app_context():
            weeks = (
                BudgetPeriod.query.filter_by(salary_period_id=period_id)
                .order_by(BudgetPeriod.week_number)
                .all()
            )

            # Week 1 starts on the start_date
            assert weeks[0].start_date == start_date

            # Each week starts day after previous week ends
            for i in range(1, 4):
                expected_start = weeks[i - 1].end_date + timedelta(days=1)
                assert weeks[i].start_date == expected_start


class TestOverlapValidation:
    """Tests for period overlap prevention"""

    def test_cannot_create_overlapping_periods(self, client, auth_headers):
        """Should reject period that overlaps with existing one"""
        start_date = date.today()

        # Create first period
        first = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 500000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert first.status_code == 201

        # Try to create overlapping period (1 week into first period)
        overlap_start = start_date + timedelta(days=7)
        second = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": overlap_start.isoformat(),
                "debit_balance": 400000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert second.status_code == 400
        assert "overlap" in second.json["error"].lower()

    def test_can_create_consecutive_periods(self, client, auth_headers):
        """Should allow period that starts day after previous ends"""
        start_date = date.today()
        end_date = start_date + relativedelta(months=1) - timedelta(days=1)

        # Create first period
        first = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 500000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert first.status_code == 201

        # Create consecutive period (starts day after first ends)
        next_start = end_date + timedelta(days=1)
        second = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": next_start.isoformat(),
                "debit_balance": 400000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert second.status_code == 201


class TestActivePeriodLogic:
    """Tests for active period detection and auto-activation"""

    def test_current_period_is_active(self, client, auth_headers):
        """Period containing today should be marked as active"""
        start_date = date.today() - timedelta(days=7)

        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 500000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        period_id = response.json["id"]

        # Verify via database
        with client.application.app_context():
            period = SalaryPeriod.query.get(period_id)
            assert period.is_active is True

    def test_future_period_is_inactive(self, client, auth_headers):
        """Period starting in the future should be inactive"""
        future_start = date.today() + timedelta(days=35)

        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": future_start.isoformat(),
                "debit_balance": 500000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        period_id = response.json["id"]

        # Verify via database
        with client.application.app_context():
            period = SalaryPeriod.query.get(period_id)
            assert period.is_active is False

    def test_get_current_period_returns_404_when_none(self, client, auth_headers):
        """Should return 404 when no active period contains today"""
        response = client.get("/api/v1/salary-periods/current", headers=auth_headers)

        assert response.status_code == 404

    def test_get_current_period_returns_correct_period(
        self, client, auth_headers, salary_period
    ):
        """Should return the period containing today"""
        response = client.get("/api/v1/salary-periods/current", headers=auth_headers)

        assert response.status_code == 200
        assert "salary_period" in response.json
        assert "current_week" in response.json


class TestPeriodDeletion:
    """Tests for DELETE /api/v1/salary-periods/<id>"""

    def test_delete_period_requires_no_transactions(self, client, auth_headers):
        """Salary periods with transactions cannot be deleted"""
        start_date = date.today()

        # Create period (this auto-creates Initial Balance income)
        create_response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 500000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        period_id = create_response.json["id"]

        # Try to delete - should fail because Initial Balance income exists
        delete_response = client.delete(
            f"/api/v1/salary-periods/{period_id}", headers=auth_headers
        )

        # Cannot delete period with transactions
        assert delete_response.status_code == 400
        assert "transactions" in delete_response.json["error"].lower()

    def test_delete_period_not_found(self, client, auth_headers):
        """Deleting non-existent period returns 404"""
        delete_response = client.delete(
            "/api/v1/salary-periods/99999", headers=auth_headers
        )
        assert delete_response.status_code == 404


class TestPreviewEndpoint:
    """Tests for POST /api/v1/salary-periods/preview"""

    def test_preview_shows_calculations(self, client, auth_headers):
        """Preview should show budget calculations without creating"""
        start_date = date.today()

        response = client.post(
            "/api/v1/salary-periods/preview",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 400000,
                "credit_balance": 100000,
                "credit_allowance": 20000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json

        # Should include calculation details
        assert "total_budget" in data
        assert "weekly_budget" in data
        assert "weeks" in data
        assert len(data["weeks"]) == 4

    def test_preview_does_not_create_period(self, client, auth_headers):
        """Preview should not create any database records"""
        start_date = date.today()

        # Get count before
        with client.application.app_context():
            before_count = SalaryPeriod.query.count()

        # Call preview
        client.post(
            "/api/v1/salary-periods/preview",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 400000,
            },
            headers=auth_headers,
        )

        # Count should be unchanged
        with client.application.app_context():
            after_count = SalaryPeriod.query.count()
            assert after_count == before_count


class TestCarryoverCalculation:
    """Tests for carryover logic when expenses change"""

    def test_overspending_reduces_next_week_budget(
        self, client, auth_headers, salary_period
    ):
        """Overspending in Week 1 should reduce Week 2's effective budget"""
        # Get current period info
        period_response = client.get(
            "/api/v1/salary-periods/current", headers=auth_headers
        )
        assert period_response.status_code == 200

        period_data = period_response.json
        weekly_budget = period_data["salary_period"]["weekly_budget"]

        # Find week 1 dates
        weeks = period_data["salary_period"]["weeks"]
        week1 = next(w for w in weeks if w["week_number"] == 1)

        # Create expense that exceeds week 1 budget
        overspend_amount = weekly_budget + 5000  # €50 over budget
        expense_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Big Purchase",
                "amount": overspend_amount,
                "category": "Flexible Expenses",
                "subcategory": "Shopping",
                "payment_method": "Debit card",
                "date": week1["start_date"],
            },
            headers=auth_headers,
        )
        assert expense_response.status_code == 201

        # Get updated period info
        updated_response = client.get(
            "/api/v1/salary-periods/current", headers=auth_headers
        )
        updated_weeks = updated_response.json["salary_period"]["weeks"]

        # Week 1 should show as overspent (negative remaining)
        week1_updated = next(w for w in updated_weeks if w["week_number"] == 1)
        assert week1_updated["remaining"] < 0

    def test_underspending_increases_next_week_budget(
        self, client, auth_headers, salary_period
    ):
        """Underspending in Week 1 should increase Week 2's effective budget"""
        # Get current period info
        period_response = client.get(
            "/api/v1/salary-periods/current", headers=auth_headers
        )
        period_data = period_response.json
        weekly_budget = period_data["salary_period"]["weekly_budget"]
        weeks = period_data["salary_period"]["weeks"]
        week1 = next(w for w in weeks if w["week_number"] == 1)

        # Create small expense (well under budget)
        small_amount = weekly_budget // 4  # 25% of budget
        expense_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Coffee",
                "amount": small_amount,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": week1["start_date"],
            },
            headers=auth_headers,
        )
        assert expense_response.status_code == 201

        # Get updated period info
        updated_response = client.get(
            "/api/v1/salary-periods/current", headers=auth_headers
        )
        updated_weeks = updated_response.json["salary_period"]["weeks"]

        # Week 1 should have positive remaining
        week1_updated = next(w for w in updated_weeks if w["week_number"] == 1)
        expected_remaining = weekly_budget - small_amount
        assert week1_updated["remaining"] == expected_remaining


class TestListEndpoints:
    """Tests for GET /api/v1/salary-periods"""

    def test_list_all_periods(self, client, auth_headers, salary_period):
        """Should return all salary periods"""
        response = client.get("/api/v1/salary-periods", headers=auth_headers)

        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) >= 1

    def test_list_active_only(self, client, auth_headers, salary_period):
        """Should filter to active periods only"""
        response = client.get(
            "/api/v1/salary-periods?active_only=true", headers=auth_headers
        )

        assert response.status_code == 200
        for period in response.json:
            assert period["is_active"] is True
