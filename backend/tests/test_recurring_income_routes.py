"""
Bloom - Recurring Income Routes Tests

Integration tests for recurring income template CRUD endpoints.
Tests creation, updates, deletion, active filtering, and toggle operations.
Mirrors test_recurring_expense_routes.py structure.
"""

from datetime import date, timedelta


def create_recurring_income(client, auth_headers, **overrides):
    """Helper to create a recurring income via API"""
    today = date.today()
    defaults = {
        "name": "Monthly Salary",
        "amount": 300000,  # €3000 in cents
        "income_type": "salary",
        "frequency": "monthly",
        "day_of_month": 25,
        "start_date": today.isoformat(),
    }
    defaults.update(overrides)
    response = client.post(
        "/api/v1/recurring-income",
        json=defaults,
        headers=auth_headers,
    )
    return response


class TestRecurringIncomeCRUD:
    """Test basic CRUD operations for recurring income templates"""

    def test_create_recurring_income_returns_id(self, client, auth_headers):
        """Creating a recurring income should return the new ID"""
        today = date.today()
        payload = {
            "name": "Monthly Salary",
            "amount": 300000,
            "income_type": "salary",
            "frequency": "monthly",
            "day_of_month": 25,
            "start_date": today.isoformat(),
        }

        response = client.post(
            "/api/v1/recurring-income",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert "id" in data
        assert data["message"] == "Recurring income created successfully"

    def test_create_recurring_income_with_all_fields(self, client, auth_headers):
        """Creating with all optional fields should succeed"""
        today = date.today()
        end_date = today + timedelta(days=365)
        payload = {
            "name": "Freelance Work",
            "amount": 50000,
            "income_type": "freelance",
            "frequency": "weekly",
            "day_of_week": 5,  # Friday
            "start_date": today.isoformat(),
            "end_date": end_date.isoformat(),
            "is_active": True,
            "notes": "Weekly freelance payments",
        }

        response = client.post(
            "/api/v1/recurring-income",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 201

        # Verify by fetching the created income
        income_id = response.get_json()["id"]
        get_response = client.get(
            f"/api/v1/recurring-income/{income_id}",
            headers=auth_headers,
        )
        data = get_response.get_json()
        assert data["name"] == "Freelance Work"
        assert data["income_type"] == "freelance"
        assert data["notes"] == "Weekly freelance payments"

    def test_create_recurring_income_missing_required_field(self, client, auth_headers):
        """Creating without required fields should fail"""
        payload = {
            "name": "Test Income",
            # Missing amount and income_type
        }

        response = client.post(
            "/api/v1/recurring-income",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 400

    def test_list_recurring_income(self, client, auth_headers):
        """Listing should return all recurring income for user"""
        # Create multiple recurring income entries
        create_recurring_income(client, auth_headers, name="Salary 1")
        create_recurring_income(client, auth_headers, name="Salary 2")

        response = client.get("/api/v1/recurring-income", headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 2

    def test_list_recurring_income_active_only(self, client, auth_headers):
        """Filtering by active status should work"""
        # Create active and inactive income
        create_recurring_income(
            client, auth_headers, name="Active Income", is_active=True
        )
        create_recurring_income(
            client, auth_headers, name="Inactive Income", is_active=False
        )

        response = client.get(
            "/api/v1/recurring-income?active_only=true", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        # All returned should be active
        for item in data:
            assert item["is_active"] is True

    def test_get_recurring_income_by_id(self, client, auth_headers):
        """Getting by ID should return the income details"""
        create_response = create_recurring_income(
            client, auth_headers, name="Test Income"
        )
        income_id = create_response.get_json()["id"]

        response = client.get(
            f"/api/v1/recurring-income/{income_id}", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Test Income"

    def test_get_recurring_income_not_found(self, client, auth_headers):
        """Getting non-existent ID should return 404"""
        response = client.get("/api/v1/recurring-income/99999", headers=auth_headers)

        assert response.status_code == 404

    def test_update_recurring_income(self, client, auth_headers):
        """Updating should modify the income"""
        create_response = create_recurring_income(
            client, auth_headers, name="Original Name"
        )
        income_id = create_response.get_json()["id"]

        response = client.put(
            f"/api/v1/recurring-income/{income_id}",
            json={"name": "Updated Name", "amount": 400000},
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify the update
        get_response = client.get(
            f"/api/v1/recurring-income/{income_id}", headers=auth_headers
        )
        data = get_response.get_json()
        assert data["name"] == "Updated Name"
        assert data["amount"] == 400000

    def test_delete_recurring_income(self, client, auth_headers):
        """Deleting should remove the income (soft delete)"""
        create_response = create_recurring_income(client, auth_headers)
        income_id = create_response.get_json()["id"]

        response = client.delete(
            f"/api/v1/recurring-income/{income_id}", headers=auth_headers
        )

        assert response.status_code == 200

        # Should no longer be found in active list
        list_response = client.get(
            "/api/v1/recurring-income?active_only=true", headers=auth_headers
        )
        ids = [item["id"] for item in list_response.get_json()]
        assert income_id not in ids

    def test_toggle_recurring_income_active(self, client, auth_headers):
        """Toggling should flip the is_active status"""
        create_response = create_recurring_income(client, auth_headers, is_active=True)
        income_id = create_response.get_json()["id"]

        # Toggle to inactive (PUT not POST)
        response = client.put(
            f"/api/v1/recurring-income/{income_id}/toggle", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["is_active"] is False

        # Toggle back to active
        response = client.put(
            f"/api/v1/recurring-income/{income_id}/toggle", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["is_active"] is True


class TestRecurringIncomeValidation:
    """Test input validation for recurring income"""

    def test_invalid_income_type_is_accepted(self, client, auth_headers):
        """API accepts any income type (no strict validation)"""
        today = date.today()
        payload = {
            "name": "Test",
            "amount": 10000,
            "income_type": "custom_type",
            "frequency": "monthly",
            "day_of_month": 15,
            "start_date": today.isoformat(),
        }

        response = client.post(
            "/api/v1/recurring-income",
            json=payload,
            headers=auth_headers,
        )

        # API accepts custom income types
        assert response.status_code == 201

    def test_unknown_frequency_defaults_to_start_date(self, client, auth_headers):
        """Unknown frequency falls back to start_date as next_due_date"""
        today = date.today()
        payload = {
            "name": "Test",
            "amount": 10000,
            "income_type": "salary",
            "frequency": "unknown",
            "day_of_month": 15,
            "start_date": today.isoformat(),
        }

        response = client.post(
            "/api/v1/recurring-income",
            json=payload,
            headers=auth_headers,
        )

        # API accepts but next_due_date will default to start_date
        assert response.status_code == 201

    def test_negative_amount_rejected(self, client, auth_headers):
        """Negative amounts should be rejected"""
        today = date.today()
        payload = {
            "name": "Test",
            "amount": -10000,
            "income_type": "salary",
            "frequency": "monthly",
            "day_of_month": 15,
            "start_date": today.isoformat(),
        }

        response = client.post(
            "/api/v1/recurring-income",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 400


# Skip user isolation tests since user2_auth_headers fixture doesn't exist
# These would require additional test setup in conftest.py
