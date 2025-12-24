"""
Bloom - Export/Import API Tests

Test data export and import functionality.
"""

import pytest
import json
from datetime import date, timedelta


class TestDataExport:
    """Test data export functionality"""

    def test_export_user_data(self, client, auth_headers, salary_period):
        """Should export selected user data"""
        # Create some data first
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Test Expense",
                "amount": 5000,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "payment_method": "Debit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        # Export is a POST that requires types to export
        response = client.post(
            "/api/v1/data/export",
            json={"types": ["salary_periods", "debts", "recurring_expenses"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "data" in response.json

    def test_export_requires_types(self, client, auth_headers):
        """Should require export types to be specified"""
        response = client.post(
            "/api/v1/data/export",
            json={"types": []},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "types" in response.json["error"].lower()

    def test_export_includes_salary_periods(self, client, auth_headers, salary_period):
        """Should include salary periods when requested"""
        response = client.post(
            "/api/v1/data/export",
            json={"types": ["salary_periods"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "salary_periods" in data

    def test_export_includes_debts(self, client, auth_headers):
        """Should include debts when requested"""
        # Create a debt first
        client.post(
            "/api/v1/debts",
            json={"name": "Test Debt", "current_balance": 5000},
            headers=auth_headers,
        )

        response = client.post(
            "/api/v1/data/export",
            json={"types": ["debts"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "debts" in data


class TestDataImport:
    """Test data import functionality"""

    def test_import_requires_auth(self, client):
        """Should require authentication for import"""
        response = client.post(
            "/api/v1/data/import",
            json={"debts": []},
        )

        assert response.status_code == 401

    def test_import_debts(self, client, auth_headers):
        """Should import debts from JSON"""
        import_data = {
            "version": "2.0",
            "data": {
                "debts": [
                    {
                        "name": "Imported Debt",
                        "original_amount": 50000,
                        "current_balance": 25000,
                        "monthly_payment": 1000,
                    }
                ]
            },
        }

        response = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )

        assert response.status_code in [200, 201]

    def test_import_recurring_expenses(self, client, auth_headers):
        """Should import recurring expenses from JSON"""
        import_data = {
            "version": "2.0",
            "data": {
                "recurring_expenses": [
                    {
                        "name": "Netflix",
                        "amount": 1599,
                        "category": "Fixed Expenses",
                        "subcategory": "Subscriptions",
                        "payment_method": "Debit card",
                        "frequency": "monthly",
                        "frequency_value": 1,
                        "day_of_month": 15,
                        "start_date": "2025-01-01",
                        "is_fixed_bill": True,
                    }
                ]
            },
        }

        response = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )

        assert response.status_code in [200, 201]


class TestBankImport:
    """Test bank statement import functionality"""

    def test_preview_bank_transactions_requires_auth(self, client):
        """Should require authentication for bank preview"""
        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": []},
        )

        assert response.status_code == 401

    def test_import_bank_transactions_requires_auth(self, client):
        """Should require authentication for bank import"""
        response = client.post(
            "/api/v1/data/import-bank-transactions",
            json={"transactions": []},
        )

        assert response.status_code == 401
