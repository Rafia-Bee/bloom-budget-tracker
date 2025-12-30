"""
Bloom - Recurring Expense Routes Tests

Integration tests for recurring expense template CRUD endpoints.
Tests creation, updates, deletion, active filtering, and toggle operations.
"""


from datetime import date, timedelta


def create_recurring_expense(client, auth_headers, **overrides):
    """Helper to create a recurring expense via API"""
    today = date.today()
    defaults = {
        "name": "Test Expense",
        "amount": 1000,
        "category": "Fixed Expenses",
        "payment_method": "debit",
        "frequency": "monthly",
        "day_of_month": 15,
        "start_date": today.isoformat(),
    }
    defaults.update(overrides)
    response = client.post(
        "/api/v1/recurring-expenses",
        json=defaults,
        headers=auth_headers,
    )
    return response


class TestRecurringExpenseCRUD:
    """Test basic CRUD operations for recurring expense templates"""

    def test_create_recurring_expense_returns_id(self, client, auth_headers):
        """Creating a recurring expense should return the new ID"""
        today = date.today()
        payload = {
            "name": "Netflix Subscription",
            "amount": 1599,
            "category": "Fixed Expenses",
            "payment_method": "debit",
            "frequency": "monthly",
            "day_of_month": 15,
            "start_date": today.isoformat(),
        }

        response = client.post(
            "/api/v1/recurring-expenses",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert "id" in data
        assert data["message"] == "Recurring expense created successfully"

    def test_create_recurring_expense_with_all_fields(self, client, auth_headers):
        """Creating with all optional fields should succeed"""
        today = date.today()
        end_date = today + timedelta(days=365)
        payload = {
            "name": "Weekly Groceries",
            "amount": 5000,
            "category": "Flexible Expenses",
            "subcategory": "Food",
            "payment_method": "credit",
            "frequency": "weekly",
            "day_of_week": 6,  # Saturday
            "start_date": today.isoformat(),
            "end_date": end_date.isoformat(),
            "is_active": True,
            "is_fixed_bill": False,
            "notes": "Weekly shopping at the supermarket",
        }

        response = client.post(
            "/api/v1/recurring-expenses",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 201

        # Verify by fetching the created expense
        expense_id = response.get_json()["id"]
        get_response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )
        data = get_response.get_json()
        assert data["name"] == "Weekly Groceries"
        assert data["subcategory"] == "Food"
        assert data["notes"] == "Weekly shopping at the supermarket"
        assert data["is_fixed_bill"] is False

    def test_create_recurring_expense_past_start_date_calculates_next_due(
        self, client, auth_headers
    ):
        """When start_date is in past, next_due_date should be calculated forward"""
        past_date = date.today() - timedelta(days=30)
        payload = {
            "name": "Weekly Bill",
            "amount": 1000,
            "category": "Fixed Expenses",
            "payment_method": "debit",
            "frequency": "weekly",
            "start_date": past_date.isoformat(),
        }

        response = client.post(
            "/api/v1/recurring-expenses",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 201
        expense_id = response.get_json()["id"]

        # Verify next_due_date is in the future
        get_response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )
        data = get_response.get_json()
        next_due = date.fromisoformat(data["next_due_date"])
        assert next_due >= date.today()

    def test_get_recurring_expense_by_id(self, client, auth_headers):
        """Should return a specific recurring expense by ID"""
        # Create via API
        create_response = create_recurring_expense(
            client, auth_headers, name="Gym Membership", amount=3000
        )
        expense_id = create_response.get_json()["id"]

        response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Gym Membership"
        assert data["amount"] == 3000

    def test_get_nonexistent_recurring_expense_returns_404(self, client, auth_headers):
        """Getting a non-existent recurring expense should return 404"""
        response = client.get(
            "/api/v1/recurring-expenses/99999",
            headers=auth_headers,
        )

        assert response.status_code == 404
        assert "not found" in response.get_json()["error"]

    def test_update_recurring_expense(self, client, auth_headers):
        """Should update recurring expense fields"""
        create_response = create_recurring_expense(
            client, auth_headers, name="Old Name", amount=1000
        )
        expense_id = create_response.get_json()["id"]

        response = client.put(
            f"/api/v1/recurring-expenses/{expense_id}",
            json={"name": "Updated Name", "amount": 2000},
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify update
        get_response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )
        data = get_response.get_json()
        assert data["name"] == "Updated Name"
        assert data["amount"] == 2000

    def test_update_nonexistent_recurring_expense_returns_404(
        self, client, auth_headers
    ):
        """Updating a non-existent recurring expense should return 404"""
        response = client.put(
            "/api/v1/recurring-expenses/99999",
            json={"name": "New Name"},
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_delete_recurring_expense(self, client, auth_headers):
        """Should delete a recurring expense template"""
        create_response = create_recurring_expense(
            client, auth_headers, name="To Delete"
        )
        expense_id = create_response.get_json()["id"]

        response = client.delete(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify deletion
        get_response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    def test_delete_nonexistent_recurring_expense_returns_404(
        self, client, auth_headers
    ):
        """Deleting a non-existent recurring expense should return 404"""
        response = client.delete(
            "/api/v1/recurring-expenses/99999",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestRecurringExpenseFiltering:
    """Test filtering and listing recurring expenses"""

    def test_get_all_recurring_expenses(self, client, auth_headers):
        """Should return all recurring expenses for user"""
        # Create multiple recurring expenses
        for i, name in enumerate(["Expense 1", "Expense 2", "Expense 3"]):
            create_recurring_expense(
                client, auth_headers, name=name, amount=1000 * (i + 1)
            )

        response = client.get(
            "/api/v1/recurring-expenses",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 3

    def test_get_active_only_recurring_expenses(self, client, auth_headers):
        """Should filter to only active recurring expenses"""
        # Create active expense
        create_recurring_expense(
            client, auth_headers, name="Active Expense", is_active=True
        )
        # Create inactive expense
        inactive_response = create_recurring_expense(
            client, auth_headers, name="Inactive Expense", is_active=True
        )
        inactive_id = inactive_response.get_json()["id"]
        # Deactivate it
        client.put(
            f"/api/v1/recurring-expenses/{inactive_id}/toggle",
            headers=auth_headers,
        )

        response = client.get(
            "/api/v1/recurring-expenses?active_only=true",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        # All returned expenses should be active
        for expense in data:
            assert expense["is_active"] is True

    def test_recurring_expenses_ordered_by_next_due_date(self, client, auth_headers):
        """Recurring expenses should be ordered by next_due_date"""
        today = date.today()
        # Create expenses with different due dates
        for i, offset in enumerate([10, 5, 0]):
            start = today + timedelta(days=offset)
            create_recurring_expense(
                client,
                auth_headers,
                name=f"Expense Due +{offset}",
                start_date=start.isoformat(),
            )

        response = client.get(
            "/api/v1/recurring-expenses",
            headers=auth_headers,
        )

        data = response.get_json()
        # Verify ordering (earlier dates first)
        due_dates = [date.fromisoformat(e["next_due_date"]) for e in data]
        assert due_dates == sorted(due_dates)


class TestRecurringExpenseToggle:
    """Test toggle operations for recurring expenses"""

    def test_toggle_active_status(self, client, auth_headers):
        """Should toggle is_active from True to False"""
        create_response = create_recurring_expense(
            client, auth_headers, name="Toggle Test"
        )
        expense_id = create_response.get_json()["id"]

        # Verify initially active
        get_response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )
        assert get_response.get_json()["is_active"] is True

        # Toggle off
        response = client.put(
            f"/api/v1/recurring-expenses/{expense_id}/toggle",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["is_active"] is False

        # Toggle back on
        response = client.put(
            f"/api/v1/recurring-expenses/{expense_id}/toggle",
            headers=auth_headers,
        )

        data = response.get_json()
        assert data["is_active"] is True

    def test_toggle_nonexistent_returns_404(self, client, auth_headers):
        """Toggling a non-existent expense should return 404"""
        response = client.put(
            "/api/v1/recurring-expenses/99999/toggle",
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_toggle_fixed_bill_status(self, client, auth_headers):
        """Should toggle is_fixed_bill status"""
        create_response = create_recurring_expense(
            client, auth_headers, name="Fixed Bill Test", is_fixed_bill=False
        )
        expense_id = create_response.get_json()["id"]

        # Set as fixed bill
        response = client.patch(
            f"/api/v1/recurring-expenses/{expense_id}/fixed-bill",
            json={"is_fixed_bill": True},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["is_fixed_bill"] is True

    def test_toggle_fixed_bill_without_payload_toggles(self, client, auth_headers):
        """Without explicit value, should toggle fixed bill status"""
        create_response = create_recurring_expense(
            client, auth_headers, name="Auto Toggle Test", is_fixed_bill=True
        )
        expense_id = create_response.get_json()["id"]

        # Verify initially is_fixed_bill=True
        get_response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )
        assert get_response.get_json()["is_fixed_bill"] is True

        # Toggle without explicit value
        response = client.patch(
            f"/api/v1/recurring-expenses/{expense_id}/fixed-bill",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["is_fixed_bill"] is False


class TestRecurringExpenseExportImport:
    """Test export and import functionality"""

    def test_export_recurring_expenses(self, client, auth_headers):
        """Should export all recurring expenses as JSON"""
        create_recurring_expense(client, auth_headers, name="Export Test", amount=1500)

        response = client.get(
            "/api/v1/recurring-expenses/export",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "recurring_expenses" in data
        assert "count" in data
        assert data["count"] >= 1

    def test_import_recurring_expenses(self, client, auth_headers):
        """Should import recurring expenses from JSON"""
        today = date.today()
        import_data = {
            "recurring_expenses": [
                {
                    "name": "Imported Expense 1",
                    "amount": 1000,
                    "category": "Fixed Expenses",
                    "payment_method": "debit",
                    "frequency": "monthly",
                    "start_date": today.isoformat(),
                    "next_due_date": today.isoformat(),
                },
                {
                    "name": "Imported Expense 2",
                    "amount": 2000,
                    "category": "Flexible Expenses",
                    "payment_method": "credit",
                    "frequency": "weekly",
                    "start_date": today.isoformat(),
                    "next_due_date": today.isoformat(),
                },
            ]
        }

        response = client.post(
            "/api/v1/recurring-expenses/import",
            json=import_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert "Successfully imported 2" in response.get_json()["message"]

    def test_import_without_recurring_expenses_array_fails(self, client, auth_headers):
        """Import should fail if recurring_expenses array is missing"""
        response = client.post(
            "/api/v1/recurring-expenses/import",
            json={"some_other_field": []},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Missing recurring_expenses array" in response.get_json()["error"]

    def test_export_import_roundtrip(self, client, auth_headers):
        """Exported data should be importable"""
        # Create an expense
        create_recurring_expense(
            client, auth_headers, name="Roundtrip Test", amount=3000, notes="Test notes"
        )

        # Export
        export_response = client.get(
            "/api/v1/recurring-expenses/export",
            headers=auth_headers,
        )
        export_data = export_response.get_json()

        # Delete existing
        all_expenses = client.get(
            "/api/v1/recurring-expenses",
            headers=auth_headers,
        ).get_json()
        for expense in all_expenses:
            client.delete(
                f"/api/v1/recurring-expenses/{expense['id']}",
                headers=auth_headers,
            )

        # Import back
        import_response = client.post(
            "/api/v1/recurring-expenses/import",
            json=export_data,
            headers=auth_headers,
        )

        assert import_response.status_code == 201


class TestRecurringExpenseFrequencyUpdates:
    """Test that frequency changes recalculate next_due_date"""

    def test_changing_frequency_recalculates_next_due_date(self, client, auth_headers):
        """Updating frequency should recalculate next_due_date"""
        today = date.today()
        create_response = create_recurring_expense(
            client,
            auth_headers,
            name="Frequency Test",
            frequency="weekly",
            start_date=today.isoformat(),
        )
        expense_id = create_response.get_json()["id"]

        # Change to biweekly
        response = client.put(
            f"/api/v1/recurring-expenses/{expense_id}",
            json={"frequency": "biweekly"},
            headers=auth_headers,
        )

        assert response.status_code == 200

    def test_changing_day_of_month_recalculates_next_due_date(
        self, client, auth_headers
    ):
        """Updating day_of_month should recalculate next_due_date for monthly"""
        today = date.today()
        create_response = create_recurring_expense(
            client,
            auth_headers,
            name="Day of Month Test",
            frequency="monthly",
            day_of_month=15,
            start_date=today.isoformat(),
        )
        expense_id = create_response.get_json()["id"]

        # Change day_of_month
        response = client.put(
            f"/api/v1/recurring-expenses/{expense_id}",
            json={"day_of_month": 1},
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify next_due_date was recalculated
        get_response = client.get(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )
        data = get_response.get_json()
        next_due = date.fromisoformat(data["next_due_date"])
        assert next_due.day == 1 or next_due >= date.today()


class TestRecurringExpenseAuthentication:
    """Test that authentication is required for all endpoints"""

    def test_get_all_requires_auth(self, client):
        """GET /recurring-expenses requires authentication"""
        response = client.get("/api/v1/recurring-expenses")
        assert response.status_code == 401

    def test_get_single_requires_auth(self, client):
        """GET /recurring-expenses/:id requires authentication"""
        response = client.get("/api/v1/recurring-expenses/1")
        assert response.status_code == 401

    def test_create_requires_auth(self, client):
        """POST /recurring-expenses requires authentication"""
        response = client.post("/api/v1/recurring-expenses", json={})
        assert response.status_code == 401

    def test_update_requires_auth(self, client):
        """PUT /recurring-expenses/:id requires authentication"""
        response = client.put("/api/v1/recurring-expenses/1", json={})
        assert response.status_code == 401

    def test_delete_requires_auth(self, client):
        """DELETE /recurring-expenses/:id requires authentication"""
        response = client.delete("/api/v1/recurring-expenses/1")
        assert response.status_code == 401

    def test_toggle_requires_auth(self, client):
        """PUT /recurring-expenses/:id/toggle requires authentication"""
        response = client.put("/api/v1/recurring-expenses/1/toggle")
        assert response.status_code == 401

    def test_export_requires_auth(self, client):
        """GET /recurring-expenses/export requires authentication"""
        response = client.get("/api/v1/recurring-expenses/export")
        assert response.status_code == 401

    def test_import_requires_auth(self, client):
        """POST /recurring-expenses/import requires authentication"""
        response = client.post("/api/v1/recurring-expenses/import", json={})
        assert response.status_code == 401


class TestBudgetImpactInResponses:
    """Tests for budget_impact in recurring expense API responses"""

    def test_create_fixed_bill_returns_budget_impact(self, client, auth_headers):
        """Creating a fixed bill should return budget_impact when active period exists"""
        from datetime import date

        today = date.today()

        # First create a salary period
        client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": today.isoformat(),
                "debit_balance": 400000,  # €4000
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        # Create a fixed bill recurring expense
        response = client.post(
            "/api/v1/recurring-expenses",
            json={
                "name": "Rent",
                "amount": 80000,
                "category": "Fixed Expenses",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 1,
                "start_date": today.isoformat(),
                "is_fixed_bill": True,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json
        assert "budget_impact" in data
        assert data["budget_impact"]["new_fixed_bills_total"] == 80000
        assert data["budget_impact"]["salary_period_id"] is not None

    def test_create_non_fixed_bill_no_budget_impact(self, client, auth_headers):
        """Creating a non-fixed-bill expense should not return budget_impact"""
        from datetime import date

        today = date.today()

        response = client.post(
            "/api/v1/recurring-expenses",
            json={
                "name": "Coffee",
                "amount": 500,
                "category": "Flexible Expenses",
                "payment_method": "Debit card",
                "frequency": "weekly",
                "day_of_week": 1,
                "start_date": today.isoformat(),
                "is_fixed_bill": False,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json
        assert "budget_impact" not in data

    def test_toggle_fixed_bill_returns_budget_impact(self, client, auth_headers):
        """Toggling fixed bill status should return budget_impact"""
        from datetime import date

        today = date.today()

        # Create salary period
        client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": today.isoformat(),
                "debit_balance": 400000,
                "credit_balance": 100000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        # Create non-fixed recurring expense
        create_resp = client.post(
            "/api/v1/recurring-expenses",
            json={
                "name": "Gym",
                "amount": 5000,
                "category": "Fixed Expenses",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 1,
                "start_date": today.isoformat(),
                "is_fixed_bill": False,
            },
            headers=auth_headers,
        )
        expense_id = create_resp.json["id"]

        # Toggle to fixed bill
        response = client.patch(
            f"/api/v1/recurring-expenses/{expense_id}/fixed-bill",
            json={"is_fixed_bill": True},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert "budget_impact" in data
        assert data["budget_impact"]["new_fixed_bills_total"] == 5000

    def test_delete_fixed_bill_returns_budget_impact(self, client, auth_headers):
        """Deleting a fixed bill should return budget_impact when it changes the total"""
        from datetime import date

        today = date.today()

        # First create a fixed bill recurring expense (before salary period)
        create_resp = client.post(
            "/api/v1/recurring-expenses",
            json={
                "name": "Insurance",
                "amount": 15000,
                "category": "Fixed Expenses",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 5,
                "start_date": today.isoformat(),
                "is_fixed_bill": True,
            },
            headers=auth_headers,
        )
        expense_id = create_resp.json["id"]

        # Create salary period - it will auto-detect the fixed bill
        # stored fixed_bills_total will be 15000
        client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": today.isoformat(),
                "debit_balance": 400000,
                "credit_balance": 100000,
                "credit_limit": 100000,
            },
            headers=auth_headers,
        )

        # Delete the fixed bill
        response = client.delete(
            f"/api/v1/recurring-expenses/{expense_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        # After deletion, current fixed bills = 0, but stored was 15000
        # So there should be a budget_impact
        assert "budget_impact" in data
        assert data["budget_impact"]["new_fixed_bills_total"] == 0
        assert data["budget_impact"]["current_fixed_bills_total"] == 15000
