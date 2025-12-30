"""
Bloom - Debts API Tests

Test debt management CRUD operations and payment tracking.
"""


from datetime import date, timedelta


class TestDebtsCRUD:
    """Test debt CRUD operations"""

    def test_create_debt_success(self, client, auth_headers):
        """Should create debt with valid data"""
        response = client.post(
            "/api/v1/debts",
            json={
                "name": "Credit Card Debt",
                "original_amount": 100000,  # €1000
                "current_balance": 100000,
                "monthly_payment": 2500,  # €25
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["debt"]["name"] == "Credit Card Debt"
        assert response.json["debt"]["original_amount"] == 100000

    def test_create_debt_minimal_fields(self, client, auth_headers):
        """Should create debt with only required fields"""
        response = client.post(
            "/api/v1/debts",
            json={
                "name": "Personal Loan",
                "current_balance": 500000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201

    def test_create_debt_missing_name(self, client, auth_headers):
        """Should reject debt without name"""
        response = client.post(
            "/api/v1/debts",
            json={
                "current_balance": 10000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 400

    def test_get_all_debts(self, client, auth_headers):
        """Should retrieve all user debts"""
        # Create debts
        client.post(
            "/api/v1/debts",
            json={
                "name": "Debt 1",
                "current_balance": 10000,
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/debts",
            json={
                "name": "Debt 2",
                "current_balance": 20000,
            },
            headers=auth_headers,
        )

        response = client.get("/api/v1/debts", headers=auth_headers)

        assert response.status_code == 200
        # API returns list directly, not {"debts": [...]}
        assert isinstance(response.json, list)
        assert len(response.json) >= 2

    def test_get_single_debt(self, client, auth_headers):
        """Should retrieve specific debt"""
        # Create debt
        create_response = client.post(
            "/api/v1/debts",
            json={
                "name": "Specific Debt",
                "current_balance": 15000,
            },
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        response = client.get(f"/api/v1/debts/{debt_id}", headers=auth_headers)

        assert response.status_code == 200
        # Single debt returns directly, not {"debt": {...}}
        assert response.json["name"] == "Specific Debt"

    def test_update_debt(self, client, auth_headers):
        """Should update debt successfully"""
        # Create debt
        create_response = client.post(
            "/api/v1/debts",
            json={
                "name": "Original",
                "current_balance": 10000,
            },
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        # Update debt
        response = client.put(
            f"/api/v1/debts/{debt_id}",
            json={
                "name": "Updated",
                "current_balance": 8000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify update
        get_response = client.get(f"/api/v1/debts/{debt_id}", headers=auth_headers)
        assert get_response.json["name"] == "Updated"
        assert get_response.json["current_balance"] == 8000

    def test_delete_debt(self, client, auth_headers):
        """Should delete debt"""
        # Create debt
        create_response = client.post(
            "/api/v1/debts",
            json={
                "name": "To Delete",
                "current_balance": 5000,
            },
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        # Delete it
        response = client.delete(f"/api/v1/debts/{debt_id}", headers=auth_headers)

        assert response.status_code == 200

        # Verify it's gone
        get_response = client.get(f"/api/v1/debts/{debt_id}", headers=auth_headers)
        assert get_response.status_code == 404


class TestDebtArchiving:
    """Test debt archiving functionality"""

    def test_debt_archived_when_balance_zero(self, client, auth_headers):
        """Should archive debt when balance set to zero"""
        # Create debt
        create_response = client.post(
            "/api/v1/debts",
            json={
                "name": "Almost Paid",
                "current_balance": 1000,
            },
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        # Set balance to zero
        client.put(
            f"/api/v1/debts/{debt_id}",
            json={"current_balance": 0},
            headers=auth_headers,
        )

        # Check if archived - should not appear in regular list
        list_response = client.get("/api/v1/debts", headers=auth_headers)
        debt_ids = [d["id"] for d in list_response.json]
        assert debt_id not in debt_ids

        # Should appear in archived list
        archived_response = client.get(
            "/api/v1/debts?archived=true", headers=auth_headers
        )
        archived_ids = [d["id"] for d in archived_response.json]
        assert debt_id in archived_ids

    def test_manual_archive(self, client, auth_headers):
        """Should allow manual archiving"""
        # Create debt
        create_response = client.post(
            "/api/v1/debts",
            json={
                "name": "Manual Archive",
                "current_balance": 5000,
            },
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        # Archive manually
        client.put(
            f"/api/v1/debts/{debt_id}",
            json={"archived": True},
            headers=auth_headers,
        )

        # Should not appear in regular list
        list_response = client.get("/api/v1/debts", headers=auth_headers)
        debt_ids = [d["id"] for d in list_response.json]
        assert debt_id not in debt_ids


class TestDebtPayment:
    """Test debt payment functionality"""

    def test_make_payment_reduces_balance(self, client, auth_headers, salary_period):
        """Making a payment should reduce the debt balance"""
        # Create debt
        create_response = client.post(
            "/api/v1/debts",
            json={"name": "Payment Test", "current_balance": 100000},
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]
        today = __import__("datetime").date.today()

        response = client.post(
            "/api/v1/debts/pay",
            json={"debt_id": debt_id, "amount": 20000, "date": today.isoformat()},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["new_balance"] == 80000

    def test_payment_creates_expense(self, client, auth_headers, salary_period):
        """Making a payment should create a Debt Payments expense"""
        create_response = client.post(
            "/api/v1/debts",
            json={"name": "Student Loan", "current_balance": 50000},
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]
        today = __import__("datetime").date.today()

        response = client.post(
            "/api/v1/debts/pay",
            json={"debt_id": debt_id, "amount": 15000, "date": today.isoformat()},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "expense_id" in response.json

    def test_payment_requires_debt_id(self, client, auth_headers):
        """Payment should fail without debt_id"""
        response = client.post(
            "/api/v1/debts/pay",
            json={"amount": 1000},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Missing required fields" in response.json["error"]

    def test_payment_requires_amount(self, client, auth_headers):
        """Payment should fail without amount"""
        create_response = client.post(
            "/api/v1/debts",
            json={"name": "Test", "current_balance": 10000},
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        response = client.post(
            "/api/v1/debts/pay",
            json={"debt_id": debt_id},
            headers=auth_headers,
        )

        assert response.status_code == 400

    def test_payment_rejects_zero_amount(self, client, auth_headers):
        """Payment should reject zero amount"""
        create_response = client.post(
            "/api/v1/debts",
            json={"name": "Test", "current_balance": 10000},
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        response = client.post(
            "/api/v1/debts/pay",
            json={"debt_id": debt_id, "amount": 0},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "must be positive" in response.json["error"]

    def test_payment_rejects_amount_exceeding_balance(
        self, client, auth_headers, salary_period
    ):
        """Payment should reject amount greater than current balance"""
        create_response = client.post(
            "/api/v1/debts",
            json={"name": "Small Debt", "current_balance": 10000},
            headers=auth_headers,
        )
        debt_id = create_response.json["debt"]["id"]

        response = client.post(
            "/api/v1/debts/pay",
            json={"debt_id": debt_id, "amount": 15000},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "exceeds current balance" in response.json["error"]

    def test_payment_to_nonexistent_debt(self, client, auth_headers):
        """Payment to non-existent debt should return 404"""
        response = client.post(
            "/api/v1/debts/pay",
            json={"debt_id": 99999, "amount": 1000},
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestDebtValidation:
    """Test debt input validation"""

    def test_create_debt_rejects_negative_balance(self, client, auth_headers):
        """Should reject negative balance"""
        response = client.post(
            "/api/v1/debts",
            json={"name": "Test", "current_balance": -5000},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "cannot be negative" in response.json["error"]

    def test_create_debt_rejects_negative_monthly_payment(self, client, auth_headers):
        """Should reject negative monthly payment"""
        response = client.post(
            "/api/v1/debts",
            json={"name": "Test", "current_balance": 5000, "monthly_payment": -100},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "cannot be negative" in response.json["error"]

    def test_get_nonexistent_debt_returns_404(self, client, auth_headers):
        """Should return 404 for non-existent debt"""
        response = client.get("/api/v1/debts/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_update_nonexistent_debt_returns_404(self, client, auth_headers):
        """Should return 404 when updating non-existent debt"""
        response = client.put(
            "/api/v1/debts/99999",
            json={"name": "Test"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_delete_nonexistent_debt_returns_404(self, client, auth_headers):
        """Should return 404 when deleting non-existent debt"""
        response = client.delete("/api/v1/debts/99999", headers=auth_headers)
        assert response.status_code == 404


class TestDebtExportImport:
    """Test debt export and import functionality"""

    def test_export_debts(self, client, auth_headers):
        """Should export all debts as JSON"""
        client.post(
            "/api/v1/debts",
            json={"name": "Export Test", "current_balance": 50000},
            headers=auth_headers,
        )

        response = client.get("/api/v1/debts/export", headers=auth_headers)

        assert response.status_code == 200
        data = response.json
        assert "debts" in data
        assert "count" in data
        assert data["count"] >= 1

    def test_import_debts(self, client, auth_headers):
        """Should import debts from JSON"""
        import_data = {
            "debts": [
                {
                    "name": "Imported Debt 1",
                    "original_amount": 100000,
                    "current_balance": 80000,
                    "monthly_payment": 5000,
                    "archived": False,
                },
                {
                    "name": "Imported Debt 2",
                    "original_amount": 50000,
                    "current_balance": 50000,
                    "monthly_payment": 2500,
                    "archived": False,
                },
            ]
        }

        response = client.post(
            "/api/v1/debts/import",
            json=import_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert "Successfully imported 2" in response.json["message"]

    def test_import_without_debts_array_fails(self, client, auth_headers):
        """Import should fail if debts array is missing"""
        response = client.post(
            "/api/v1/debts/import",
            json={"something_else": []},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Missing debts array" in response.json["error"]


class TestDebtAuthentication:
    """Test that authentication is required for all endpoints"""

    def test_get_all_requires_auth(self, client):
        """GET /debts requires authentication"""
        response = client.get("/api/v1/debts")
        assert response.status_code == 401

    def test_get_single_requires_auth(self, client):
        """GET /debts/:id requires authentication"""
        response = client.get("/api/v1/debts/1")
        assert response.status_code == 401

    def test_create_requires_auth(self, client):
        """POST /debts requires authentication"""
        response = client.post("/api/v1/debts", json={})
        assert response.status_code == 401

    def test_update_requires_auth(self, client):
        """PUT /debts/:id requires authentication"""
        response = client.put("/api/v1/debts/1", json={})
        assert response.status_code == 401

    def test_delete_requires_auth(self, client):
        """DELETE /debts/:id requires authentication"""
        response = client.delete("/api/v1/debts/1")
        assert response.status_code == 401

    def test_pay_requires_auth(self, client):
        """POST /debts/pay requires authentication"""
        response = client.post("/api/v1/debts/pay", json={})
        assert response.status_code == 401

    def test_export_requires_auth(self, client):
        """GET /debts/export requires authentication"""
        response = client.get("/api/v1/debts/export")
        assert response.status_code == 401

    def test_import_requires_auth(self, client):
        """POST /debts/import requires authentication"""
        response = client.post("/api/v1/debts/import", json={})
        assert response.status_code == 401
