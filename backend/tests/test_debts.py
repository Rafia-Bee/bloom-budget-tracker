"""
Bloom - Debts API Tests

Test debt management CRUD operations and payment tracking.
"""

import pytest
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
