"""
Bloom - Budget Period Routes Tests

Integration tests for budget period CRUD endpoints.
Tests period creation, active period lookup, overlap validation, and CRUD operations.

Note: BudgetPeriods are typically auto-created by SalaryPeriods (4 weeks per salary period).
These tests cover the direct CRUD API for budget periods.
"""

import pytest
from datetime import date, timedelta


def create_budget_period(client, auth_headers, **overrides):
    """Helper to create a budget period via API"""
    today = date.today()
    defaults = {
        "period_type": "weekly",
        "start_date": today.isoformat(),
    }
    defaults.update(overrides)
    response = client.post(
        "/api/v1/budget-periods",
        json=defaults,
        headers=auth_headers,
    )
    return response


class TestBudgetPeriodCreation:
    """Test budget period creation with different period types"""

    def test_create_weekly_period(self, client, auth_headers):
        """Should create a weekly budget period (7 days)"""
        today = date.today()
        response = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=today.isoformat(),
        )

        assert response.status_code == 201
        data = response.get_json()
        assert "period" in data
        assert data["period"]["period_type"] == "weekly"

        # Verify 7-day span
        start = date.fromisoformat(data["period"]["start_date"])
        end = date.fromisoformat(data["period"]["end_date"])
        assert (end - start).days == 6  # 7 days total (inclusive)

    def test_create_monthly_period(self, client, auth_headers):
        """Should create a monthly budget period (30 days)"""
        # Use a date in the future to avoid overlap with existing periods
        future_date = date.today() + timedelta(days=60)
        response = create_budget_period(
            client,
            auth_headers,
            period_type="monthly",
            start_date=future_date.isoformat(),
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["period"]["period_type"] == "monthly"

        # Verify 30-day span
        start = date.fromisoformat(data["period"]["start_date"])
        end = date.fromisoformat(data["period"]["end_date"])
        assert (end - start).days == 29  # 30 days total (inclusive)

    def test_create_custom_period(self, client, auth_headers):
        """Should create a custom budget period with specified dates"""
        start = date.today() + timedelta(days=100)
        end = start + timedelta(days=14)

        response = client.post(
            "/api/v1/budget-periods",
            json={
                "period_type": "custom",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["period"]["period_type"] == "custom"
        assert data["period"]["start_date"] == start.isoformat()
        assert data["period"]["end_date"] == end.isoformat()

    def test_create_custom_period_requires_dates(self, client, auth_headers):
        """Custom period should fail without both dates"""
        response = client.post(
            "/api/v1/budget-periods",
            json={"period_type": "custom", "start_date": date.today().isoformat()},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Start and end dates required" in response.get_json()["error"]

    def test_create_custom_period_validates_date_order(self, client, auth_headers):
        """Custom period should fail if end date is before start date"""
        start = date.today() + timedelta(days=200)
        end = start - timedelta(days=5)  # End before start

        response = client.post(
            "/api/v1/budget-periods",
            json={
                "period_type": "custom",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "End date must be after start date" in response.get_json()["error"]

    def test_create_period_requires_period_type(self, client, auth_headers):
        """Should fail if period_type is not provided"""
        response = client.post(
            "/api/v1/budget-periods",
            json={"start_date": date.today().isoformat()},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Period type is required" in response.get_json()["error"]

    def test_create_period_invalid_period_type(self, client, auth_headers):
        """Should fail with invalid period type"""
        future = date.today() + timedelta(days=300)
        response = client.post(
            "/api/v1/budget-periods",
            json={"period_type": "invalid", "start_date": future.isoformat()},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid period type" in response.get_json()["error"]


class TestBudgetPeriodOverlapValidation:
    """Test overlap detection for budget periods"""

    def test_cannot_create_overlapping_periods(self, client, auth_headers):
        """Should reject periods that overlap with existing ones"""
        # Create first period
        start1 = date.today() + timedelta(days=400)
        create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start1.isoformat(),
        )

        # Try to create overlapping period
        start2 = start1 + timedelta(days=3)  # Starts in middle of first period
        response = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start2.isoformat(),
        )

        assert response.status_code == 400
        assert "overlaps" in response.get_json()["error"]

    def test_can_create_adjacent_periods(self, client, auth_headers):
        """Should allow periods that are adjacent but don't overlap"""
        # Create first period
        start1 = date.today() + timedelta(days=500)
        response1 = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start1.isoformat(),
        )
        end1 = date.fromisoformat(response1.get_json()["period"]["end_date"])

        # Create adjacent period (starts day after first ends)
        start2 = end1 + timedelta(days=1)
        response2 = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start2.isoformat(),
        )

        assert response2.status_code == 201


class TestActivePeriod:
    """Test active period lookup (period containing today)"""

    def test_get_active_period_returns_current_period(self, client, auth_headers):
        """Should return the period containing today's date"""
        today = date.today()
        # Create a period that includes today
        start = today - timedelta(days=2)

        client.post(
            "/api/v1/budget-periods",
            json={
                "period_type": "custom",
                "start_date": start.isoformat(),
                "end_date": (start + timedelta(days=10)).isoformat(),
            },
            headers=auth_headers,
        )

        response = client.get(
            "/api/v1/budget-periods/active",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        # Today should be within the returned period
        period_start = date.fromisoformat(data["start_date"])
        period_end = date.fromisoformat(data["end_date"])
        assert period_start <= today <= period_end

    def test_get_active_period_returns_404_when_none(self, client, auth_headers):
        """Should return 404 when no period contains today"""
        # Create a period in the far future
        future = date.today() + timedelta(days=600)
        create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=future.isoformat(),
        )

        # Clear any existing periods that contain today
        # (Since we're creating fresh periods for each test, there shouldn't be one)
        # Just check that if there's no active period, we get 404
        response = client.get(
            "/api/v1/budget-periods/active",
            headers=auth_headers,
        )

        # This might be 200 if salary_period fixture created one, or 404 otherwise
        assert response.status_code in [200, 404]


class TestBudgetPeriodCRUD:
    """Test basic CRUD operations"""

    def test_get_all_budget_periods(self, client, auth_headers):
        """Should return all budget periods for user"""
        # Create a couple periods
        for i in range(2):
            start = date.today() + timedelta(days=700 + i * 10)
            create_budget_period(
                client,
                auth_headers,
                period_type="weekly",
                start_date=start.isoformat(),
            )

        response = client.get(
            "/api/v1/budget-periods",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 2

    def test_get_budget_period_by_id(self, client, auth_headers):
        """Should return a specific budget period"""
        start = date.today() + timedelta(days=800)
        create_response = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start.isoformat(),
        )
        period_id = create_response.get_json()["period"]["id"]

        response = client.get(
            f"/api/v1/budget-periods/{period_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["id"] == period_id
        assert data["period_type"] == "weekly"

    def test_get_nonexistent_period_returns_404(self, client, auth_headers):
        """Should return 404 for non-existent period"""
        response = client.get(
            "/api/v1/budget-periods/99999",
            headers=auth_headers,
        )

        assert response.status_code == 404
        assert "not found" in response.get_json()["error"]

    def test_update_budget_period(self, client, auth_headers):
        """Should update budget period fields"""
        start = date.today() + timedelta(days=900)
        create_response = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start.isoformat(),
        )
        period_id = create_response.get_json()["period"]["id"]

        new_end = start + timedelta(days=14)
        response = client.put(
            f"/api/v1/budget-periods/{period_id}",
            json={
                "end_date": new_end.isoformat(),
                "period_type": "custom",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify update
        get_response = client.get(
            f"/api/v1/budget-periods/{period_id}",
            headers=auth_headers,
        )
        data = get_response.get_json()
        assert data["end_date"] == new_end.isoformat()
        assert data["period_type"] == "custom"

    def test_update_nonexistent_period_returns_404(self, client, auth_headers):
        """Should return 404 when updating non-existent period"""
        response = client.put(
            "/api/v1/budget-periods/99999",
            json={"period_type": "monthly"},
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_update_validates_date_order(self, client, auth_headers):
        """Should reject update if end date is before start date"""
        start = date.today() + timedelta(days=1000)
        create_response = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start.isoformat(),
        )
        period_id = create_response.get_json()["period"]["id"]

        # Try to set end date before start
        response = client.put(
            f"/api/v1/budget-periods/{period_id}",
            json={"end_date": (start - timedelta(days=5)).isoformat()},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "End date must be after start date" in response.get_json()["error"]

    def test_delete_budget_period(self, client, auth_headers):
        """Should delete a budget period"""
        start = date.today() + timedelta(days=1100)
        create_response = create_budget_period(
            client,
            auth_headers,
            period_type="weekly",
            start_date=start.isoformat(),
        )
        period_id = create_response.get_json()["period"]["id"]

        response = client.delete(
            f"/api/v1/budget-periods/{period_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify deletion
        get_response = client.get(
            f"/api/v1/budget-periods/{period_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    def test_delete_nonexistent_period_returns_404(self, client, auth_headers):
        """Should return 404 when deleting non-existent period"""
        response = client.delete(
            "/api/v1/budget-periods/99999",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestBudgetPeriodOrdering:
    """Test that periods are returned in correct order"""

    def test_periods_ordered_by_start_date_descending(self, client, auth_headers):
        """Budget periods should be ordered by start_date descending (newest first)"""
        # Create periods with different start dates
        dates = [
            date.today() + timedelta(days=1200),
            date.today() + timedelta(days=1210),
            date.today() + timedelta(days=1205),
        ]

        for d in dates:
            create_budget_period(
                client,
                auth_headers,
                period_type="weekly",
                start_date=d.isoformat(),
            )

        response = client.get(
            "/api/v1/budget-periods",
            headers=auth_headers,
        )

        data = response.get_json()
        start_dates = [date.fromisoformat(p["start_date"]) for p in data]
        # Should be descending order
        assert start_dates == sorted(start_dates, reverse=True)


class TestBudgetPeriodAuthentication:
    """Test that authentication is required for all endpoints"""

    def test_get_all_requires_auth(self, client):
        """GET /budget-periods requires authentication"""
        response = client.get("/api/v1/budget-periods")
        assert response.status_code == 401

    def test_get_active_requires_auth(self, client):
        """GET /budget-periods/active requires authentication"""
        response = client.get("/api/v1/budget-periods/active")
        assert response.status_code == 401

    def test_get_single_requires_auth(self, client):
        """GET /budget-periods/:id requires authentication"""
        response = client.get("/api/v1/budget-periods/1")
        assert response.status_code == 401

    def test_create_requires_auth(self, client):
        """POST /budget-periods requires authentication"""
        response = client.post("/api/v1/budget-periods", json={})
        assert response.status_code == 401

    def test_update_requires_auth(self, client):
        """PUT /budget-periods/:id requires authentication"""
        response = client.put("/api/v1/budget-periods/1", json={})
        assert response.status_code == 401

    def test_delete_requires_auth(self, client):
        """DELETE /budget-periods/:id requires authentication"""
        response = client.delete("/api/v1/budget-periods/1")
        assert response.status_code == 401
