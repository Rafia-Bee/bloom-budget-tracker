"""
Bloom - User Data Routes Tests

Tests for user settings management and data deletion endpoints.
"""

import pytest
from backend.models.database import (
    db,
    User,
    Expense,
    Income,
    Debt,
    RecurringExpense,
    Goal,
    Subcategory,
    SalaryPeriod,
    BudgetPeriod,
)
from datetime import date, timedelta


@pytest.fixture(scope="function")
def user_id(client, auth_headers):
    """Get the logged-in user's ID"""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    return response.json["id"]


@pytest.fixture(scope="function")
def populate_user_data(client, auth_headers, user_id):
    """Create various user data for deletion tests"""
    # Create expense
    expense = Expense(
        user_id=user_id,
        name="Test Expense",
        amount=1000,
        category="Food",
        date=date.today(),
    )
    db.session.add(expense)

    # Create income
    income = Income(
        user_id=user_id,
        type="Salary",
        amount=100000,
        scheduled_date=date.today(),
    )
    db.session.add(income)

    # Create debt
    debt = Debt(
        user_id=user_id,
        name="Test Debt",
        original_amount=5000,
        current_balance=5000,
        monthly_payment=500,
    )
    db.session.add(debt)

    # Create recurring expense
    recurring = RecurringExpense(
        user_id=user_id,
        name="Test Recurring",
        amount=500,
        category="Bills",
        frequency="monthly",
        start_date=date.today(),
        next_due_date=date.today() + timedelta(days=30),
    )
    db.session.add(recurring)

    # Create goal
    goal = Goal(
        user_id=user_id,
        name="Test Goal",
        target_amount=10000,
        initial_amount=0,
        subcategory_name="Emergency Fund",
    )
    db.session.add(goal)

    # Create subcategory
    subcategory = Subcategory(
        user_id=user_id,
        category="Food",
        name="Test Subcategory",
    )
    db.session.add(subcategory)

    db.session.commit()

    return {
        "expense_id": expense.id,
        "income_id": income.id,
        "debt_id": debt.id,
        "recurring_id": recurring.id,
        "goal_id": goal.id,
        "subcategory_id": subcategory.id,
    }


class TestDeleteAllUserData:
    """Tests for POST /api/v1/user-data/delete-all"""

    def test_delete_all_requires_auth(self, client):
        """Should require authentication"""
        response = client.post("/api/v1/user-data/delete-all")
        assert response.status_code == 401

    def test_delete_all_requires_confirmation(self, client, auth_headers):
        """Should reject without proper confirmation text"""
        response = client.post(
            "/api/v1/user-data/delete-all",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid confirmation text" in response.json["error"]

    def test_delete_all_wrong_confirmation(self, client, auth_headers):
        """Should reject with wrong confirmation text"""
        response = client.post(
            "/api/v1/user-data/delete-all",
            json={"confirmation": "delete"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid confirmation text" in response.json["error"]

    def test_delete_all_success(
        self, client, auth_headers, user_id, populate_user_data
    ):
        """Should delete all user data with correct confirmation"""
        response = client.post(
            "/api/v1/user-data/delete-all",
            json={"confirmation": "Delete everything"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True
        assert "deleted_records" in data

        # Verify data was deleted
        assert Expense.query.filter_by(user_id=user_id).count() == 0
        assert Income.query.filter_by(user_id=user_id).count() == 0
        assert Debt.query.filter_by(user_id=user_id).count() == 0
        assert RecurringExpense.query.filter_by(user_id=user_id).count() == 0
        assert Goal.query.filter_by(user_id=user_id).count() == 0
        assert Subcategory.query.filter_by(user_id=user_id).count() == 0

    def test_delete_all_returns_counts(
        self, client, auth_headers, user_id, populate_user_data
    ):
        """Should return counts of deleted records"""
        response = client.post(
            "/api/v1/user-data/delete-all",
            json={"confirmation": "Delete everything"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        deleted = response.json["deleted_records"]
        assert deleted["expenses"] >= 1
        assert deleted["income"] >= 1
        assert deleted["debts"] >= 1
        assert deleted["recurring_expenses"] >= 1
        assert deleted["goals"] >= 1
        assert deleted["subcategories"] >= 1
        assert deleted["total"] >= 6


class TestRecurringLookahead:
    """Tests for recurring lookahead settings endpoints"""

    def test_get_lookahead_requires_auth(self, client):
        """Should require authentication"""
        response = client.get("/api/v1/user-data/settings/recurring-lookahead")
        assert response.status_code == 401

    def test_get_lookahead_default(self, client, auth_headers):
        """Should return default lookahead (14 days)"""
        response = client.get(
            "/api/v1/user-data/settings/recurring-lookahead",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["recurring_lookahead_days"] == 14  # Default value

    def test_update_lookahead_requires_auth(self, client):
        """Should require authentication"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": 30},
        )
        assert response.status_code == 401

    def test_update_lookahead_success(self, client, auth_headers):
        """Should update lookahead days"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": 30},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["recurring_lookahead_days"] == 30

        # Verify change persisted
        get_response = client.get(
            "/api/v1/user-data/settings/recurring-lookahead",
            headers=auth_headers,
        )
        assert get_response.json["recurring_lookahead_days"] == 30

    def test_update_lookahead_missing_field(self, client, auth_headers):
        """Should reject without required field"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "required" in response.json["error"]

    def test_update_lookahead_invalid_type(self, client, auth_headers):
        """Should reject non-numeric value"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": "thirty"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "number" in response.json["error"]

    def test_update_lookahead_too_low(self, client, auth_headers):
        """Should reject value below 7"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": 5},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "between 7 and 90" in response.json["error"]

    def test_update_lookahead_too_high(self, client, auth_headers):
        """Should reject value above 90"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": 100},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "between 7 and 90" in response.json["error"]

    def test_update_lookahead_boundary_min(self, client, auth_headers):
        """Should accept minimum value of 7"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": 7},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["recurring_lookahead_days"] == 7

    def test_update_lookahead_boundary_max(self, client, auth_headers):
        """Should accept maximum value of 90"""
        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": 90},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["recurring_lookahead_days"] == 90


class TestDefaultCurrency:
    """Tests for default currency settings endpoints"""

    def test_get_currency_requires_auth(self, client):
        """Should require authentication"""
        response = client.get("/api/v1/user-data/settings/default-currency")
        assert response.status_code == 401

    def test_get_currency_default(self, client, auth_headers):
        """Should return default currency (EUR)"""
        response = client.get(
            "/api/v1/user-data/settings/default-currency",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["default_currency"] == "EUR"

    def test_update_currency_requires_auth(self, client):
        """Should require authentication"""
        response = client.put(
            "/api/v1/user-data/settings/default-currency",
            json={"default_currency": "USD"},
        )
        assert response.status_code == 401

    def test_update_currency_success(self, client, auth_headers):
        """Should update default currency"""
        response = client.put(
            "/api/v1/user-data/settings/default-currency",
            json={"default_currency": "USD"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["default_currency"] == "USD"

        # Verify change persisted
        get_response = client.get(
            "/api/v1/user-data/settings/default-currency",
            headers=auth_headers,
        )
        assert get_response.json["default_currency"] == "USD"

    def test_update_currency_lowercase(self, client, auth_headers):
        """Should accept lowercase and convert to uppercase"""
        response = client.put(
            "/api/v1/user-data/settings/default-currency",
            json={"default_currency": "gbp"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["default_currency"] == "GBP"

    def test_update_currency_missing_field(self, client, auth_headers):
        """Should reject without required field"""
        response = client.put(
            "/api/v1/user-data/settings/default-currency",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "required" in response.json["error"]

    def test_update_currency_invalid(self, client, auth_headers):
        """Should reject invalid currency code"""
        response = client.put(
            "/api/v1/user-data/settings/default-currency",
            json={"default_currency": "XYZ"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid currency" in response.json["error"]


class TestUserNotFound:
    """Edge case: user not found in database"""

    def test_get_lookahead_user_not_found(self, client, app):
        """Should return 404 if user not found"""
        from flask_jwt_extended import create_access_token

        with app.app_context():
            token = create_access_token(identity="99999")
            client.set_cookie("access_token_cookie", token)

        response = client.get("/api/v1/user-data/settings/recurring-lookahead")

        assert response.status_code == 404
        assert "User not found" in response.json["error"]

    def test_update_lookahead_user_not_found(self, client, app):
        """Should return 404 if user not found"""
        from flask_jwt_extended import create_access_token

        with app.app_context():
            token = create_access_token(identity="99999")
            client.set_cookie("access_token_cookie", token)

        response = client.put(
            "/api/v1/user-data/settings/recurring-lookahead",
            json={"recurring_lookahead_days": 30},
        )

        assert response.status_code == 404
        assert "User not found" in response.json["error"]

    def test_get_currency_user_not_found(self, client, app):
        """Should return 404 if user not found"""
        from flask_jwt_extended import create_access_token

        with app.app_context():
            token = create_access_token(identity="99999")
            client.set_cookie("access_token_cookie", token)

        response = client.get("/api/v1/user-data/settings/default-currency")

        assert response.status_code == 404
        assert "User not found" in response.json["error"]

    def test_update_currency_user_not_found(self, client, app):
        """Should return 404 if user not found"""
        from flask_jwt_extended import create_access_token

        with app.app_context():
            token = create_access_token(identity="99999")
            client.set_cookie("access_token_cookie", token)

        response = client.put(
            "/api/v1/user-data/settings/default-currency",
            json={"default_currency": "USD"},
        )

        assert response.status_code == 404
        assert "User not found" in response.json["error"]


class TestBalanceMode:
    """Tests for balance mode settings endpoints (Issue #165)"""

    def test_get_balance_mode_requires_auth(self, client):
        """Should require authentication"""
        response = client.get("/api/v1/user-data/settings/balance-mode")
        assert response.status_code == 401

    def test_get_balance_mode_default(self, client, auth_headers):
        """Should return default balance mode (sync)"""
        response = client.get(
            "/api/v1/user-data/settings/balance-mode",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["balance_mode"] == "sync"

    def test_update_balance_mode_requires_auth(self, client):
        """Should require authentication"""
        response = client.put(
            "/api/v1/user-data/settings/balance-mode",
            json={"balance_mode": "budget"},
        )
        assert response.status_code == 401

    def test_update_balance_mode_to_budget(self, client, auth_headers):
        """Should update balance mode to budget"""
        response = client.put(
            "/api/v1/user-data/settings/balance-mode",
            json={"balance_mode": "budget"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["balance_mode"] == "budget"

        # Verify change persisted
        get_response = client.get(
            "/api/v1/user-data/settings/balance-mode",
            headers=auth_headers,
        )
        assert get_response.json["balance_mode"] == "budget"

    def test_update_balance_mode_to_sync(self, client, auth_headers):
        """Should update balance mode to sync"""
        # First set to budget
        client.put(
            "/api/v1/user-data/settings/balance-mode",
            json={"balance_mode": "budget"},
            headers=auth_headers,
        )

        # Then back to sync
        response = client.put(
            "/api/v1/user-data/settings/balance-mode",
            json={"balance_mode": "sync"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["balance_mode"] == "sync"

    def test_update_balance_mode_missing_field(self, client, auth_headers):
        """Should reject without required field"""
        response = client.put(
            "/api/v1/user-data/settings/balance-mode",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "required" in response.json["error"]

    def test_update_balance_mode_invalid(self, client, auth_headers):
        """Should reject invalid balance mode"""
        response = client.put(
            "/api/v1/user-data/settings/balance-mode",
            json={"balance_mode": "invalid_mode"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid balance mode" in response.json["error"]
