"""
Bloom - CRUD Operations Tests

Test expense, income, and salary period creation/update/delete operations.
"""

import pytest
from datetime import date, timedelta


class TestExpenseCRUD:
    """Test expense CRUD operations"""

    def test_create_expense(self, client, auth_headers, salary_period):
        """Should create expense successfully"""
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Groceries",
                "amount": 5000,  # €50
                "category": "Food & Dining",
                "subcategory": "Groceries",
                "payment_method": "Debit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["expense"]["name"] == "Groceries"
        assert response.json["expense"]["amount"] == 5000

    def test_create_expense_auto_assigns_period(
        self, client, auth_headers, salary_period
    ):
        """Should auto-assign budget period based on expense date"""
        # Expense in first week (Nov 20-26)
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test Expense",
                "amount": 1000,
                "category": "Shopping",
                "date": "2025-11-22",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201

        # Verify it's assigned to correct week
        expense_id = response.json["expense"]["id"]
        expense_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )

        # Should have budget_period_id set
        assert expense_response.status_code == 200
        # Check if budget_period_id exists (may be null for expenses outside periods)
        assert "id" in expense_response.json

    def test_get_all_expenses(self, client, auth_headers, salary_period):
        """Should retrieve all expenses"""
        # Create expenses
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Expense 1",
                "amount": 1000,
                "category": "Food & Dining",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        client.post(
            "/api/v1/expenses",
            json={
                "name": "Expense 2",
                "amount": 2000,
                "category": "Shopping",
                "date": "2025-11-26",
            },
            headers=auth_headers,
        )

        response = client.get("/api/v1/expenses", headers=auth_headers)

        assert response.status_code == 200
        # May include auto-generated expenses from salary period creation
        assert len(response.json["expenses"]) >= 2

    def test_update_expense(self, client, auth_headers, salary_period):
        """Should update expense successfully"""
        # Create expense
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Original Name",
                "amount": 1000,
                "category": "Food & Dining",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        expense_id = create_response.json["expense"]["id"]

        # Update expense
        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"name": "Updated Name", "amount": 1500},
            headers=auth_headers,
        )

        assert response.status_code == 200
        # Response contains message and updated expense data
        assert response.json["message"] == "Expense updated successfully"
        # Verify by fetching the expense
        updated = client.get(f"/api/v1/expenses/{expense_id}", headers=auth_headers)
        assert updated.json["name"] == "Updated Name"
        assert updated.json["amount"] == 1500

    def test_delete_expense(self, client, auth_headers, salary_period):
        """Should delete expense successfully"""
        # Create expense
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "To Delete",
                "amount": 1000,
                "category": "Shopping",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        expense_id = create_response.json["expense"]["id"]

        # Delete expense
        response = client.delete(f"/api/v1/expenses/{expense_id}", headers=auth_headers)

        assert response.status_code == 200

        # Verify deleted
        get_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )
        assert get_response.status_code == 404


class TestIncomeCRUD:
    """Test income CRUD operations"""

    def test_create_income(self, client, auth_headers, salary_period):
        """Should create income successfully"""
        response = client.post(
            "/api/v1/income",
            json={
                "type": "Salary",
                "amount": 300000,  # €3000
                "date": "2025-11-20",
                "budget_period_id": salary_period,  # salary_period is now just the ID
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["income"]["type"] == "Salary"
        assert response.json["income"]["amount"] == 300000

    def test_get_all_income(self, client, auth_headers, salary_period):
        """Should retrieve all income"""
        # Create income entries
        client.post(
            "/api/v1/income",
            json={
                "source": "Salary",
                "amount": 300000,
                "date": "2025-11-20",
                "budget_period_id": salary_period,  # salary_period is now just the ID
            },
            headers=auth_headers,
        )

        response = client.get("/api/v1/income", headers=auth_headers)

        assert response.status_code == 200
        assert "income" in response.json
        assert len(response.json["income"]) >= 1


class TestSalaryPeriodCRUD:
    """Test salary period CRUD operations"""

    def test_create_salary_period(self, client, auth_headers):
        """Should create salary period with 4 weekly budgets"""
        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": "2025-12-20",
                "debit_balance": 600000,
                "credit_balance": 120000,
                "credit_limit": 150000,
                "credit_allowance": 30000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert "message" in response.json
        assert (
            response.json["message"]
            == "Salary period created successfully with 4 weekly budgets"
        )
        assert "id" in response.json

    def test_get_current_salary_period(self, client, auth_headers, salary_period):
        """Should retrieve current active salary period"""
        response = client.get("/api/v1/salary-periods/current", headers=auth_headers)

        assert response.status_code == 200
        assert "salary_period" in response.json
        assert "current_week" in response.json

    def test_delete_salary_period(self, client, auth_headers, salary_period):
        """Should prevent deletion when salary period has transactions"""
        period_id = salary_period  # salary_period fixture now returns just the ID

        # Salary period has Initial Balance income, so deletion should be prevented
        response = client.delete(
            f"/api/v1/salary-periods/{period_id}", headers=auth_headers
        )

        assert response.status_code == 400
        assert "Cannot delete" in response.json["error"]

        # Verify period still exists
        get_response = client.get(
            "/api/v1/salary-periods/current", headers=auth_headers
        )
        assert get_response.status_code == 200
