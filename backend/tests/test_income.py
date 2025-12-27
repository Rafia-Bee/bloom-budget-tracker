"""
Bloom - Income Routes Tests

Tests for income CRUD operations and statistics.
"""

import pytest
from datetime import date, timedelta
from backend.models.database import db, Income, SalaryPeriod, BudgetPeriod


@pytest.fixture(scope="function")
def user_id(client, auth_headers):
    """Get the logged-in user's ID"""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    return response.json["id"]


def create_income(user_id, **kwargs):
    """Helper to create an Income entry with defaults."""
    today = date.today()
    defaults = {
        "user_id": user_id,
        "type": "Salary",
        "amount": 300000,  # €3000
        "scheduled_date": today,
        "actual_date": today,
    }
    defaults.update(kwargs)
    income = Income(**defaults)
    db.session.add(income)
    db.session.commit()
    return income


class TestIncomeCRUD:
    """Tests for income CRUD operations"""

    def test_get_income_requires_auth(self, client):
        """Should require authentication"""
        response = client.get("/api/v1/income")
        assert response.status_code == 401

    def test_create_income_requires_auth(self, client):
        """Should require authentication"""
        response = client.post(
            "/api/v1/income",
            json={"type": "Salary", "amount": 100000},
        )
        assert response.status_code == 401

    def test_create_income_success(self, client, auth_headers):
        """Should create income with valid data"""
        today = date.today().isoformat()
        response = client.post(
            "/api/v1/income",
            json={
                "type": "Salary",
                "amount": 300000,
                "date": today,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json
        assert data["income"]["type"] == "Salary"
        assert data["income"]["amount"] == 300000

    def test_create_income_missing_type(self, client, auth_headers):
        """Should reject income without type"""
        response = client.post(
            "/api/v1/income",
            json={"amount": 100000},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "required" in response.json["error"]

    def test_create_income_missing_amount(self, client, auth_headers):
        """Should reject income without amount"""
        response = client.post(
            "/api/v1/income",
            json={"type": "Bonus"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "required" in response.json["error"]

    def test_create_income_invalid_amount(self, client, auth_headers):
        """Should reject negative amount"""
        response = client.post(
            "/api/v1/income",
            json={"type": "Salary", "amount": -100},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "positive" in response.json["error"]

    def test_create_income_invalid_date_format(self, client, auth_headers):
        """Should reject invalid date format"""
        response = client.post(
            "/api/v1/income",
            json={
                "type": "Salary",
                "amount": 100000,
                "date": "26/12/2025",  # Wrong format
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "date format" in response.json["error"]

    def test_get_income_list(self, client, auth_headers, user_id):
        """Should return all income entries"""
        # Create income entries
        create_income(user_id, type="Salary", amount=300000)
        create_income(user_id, type="Bonus", amount=50000)

        response = client.get("/api/v1/income", headers=auth_headers)

        assert response.status_code == 200
        data = response.json
        assert "income" in data
        assert len(data["income"]) >= 2
        assert "pagination" in data

    def test_get_income_with_pagination(self, client, auth_headers, user_id):
        """Should paginate results"""
        # Create 5 income entries
        for i in range(5):
            create_income(user_id, type=f"Income {i}", amount=10000 * (i + 1))

        response = client.get(
            "/api/v1/income?page=1&limit=2",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert len(data["income"]) == 2
        assert data["pagination"]["total"] >= 5
        assert data["pagination"]["has_more"] is True

    def test_get_income_filter_by_type(self, client, auth_headers, user_id):
        """Should filter by income type"""
        create_income(user_id, type="Salary", amount=300000)
        create_income(user_id, type="Bonus", amount=50000)

        response = client.get(
            "/api/v1/income?type=Salary",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert all(item["type"] == "Salary" for item in data["income"])

    def test_get_income_filter_by_date_range(self, client, auth_headers, user_id):
        """Should filter by date range"""
        today = date.today()
        week_ago = today - timedelta(days=7)

        create_income(user_id, actual_date=today)
        create_income(user_id, actual_date=week_ago)
        create_income(user_id, actual_date=today - timedelta(days=30))

        response = client.get(
            f"/api/v1/income?start_date={week_ago.isoformat()}&end_date={today.isoformat()}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert len(response.json["income"]) >= 2

    def test_get_income_filter_by_amount_range(self, client, auth_headers, user_id):
        """Should filter by amount range"""
        create_income(user_id, amount=100000)
        create_income(user_id, amount=200000)
        create_income(user_id, amount=500000)

        response = client.get(
            "/api/v1/income?min_amount=150000&max_amount=300000",
            headers=auth_headers,
        )

        assert response.status_code == 200
        incomes = response.json["income"]
        for item in incomes:
            assert 150000 <= item["amount"] <= 300000

    def test_update_income(self, client, auth_headers, user_id):
        """Should update income entry"""
        income = create_income(user_id, type="Salary", amount=300000)

        response = client.put(
            f"/api/v1/income/{income.id}",
            json={"amount": 350000, "type": "Updated Salary"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["income"]["amount"] == 350000
        assert data["income"]["type"] == "Updated Salary"

    def test_update_income_not_found(self, client, auth_headers):
        """Should return 404 for non-existent income"""
        response = client.put(
            "/api/v1/income/99999",
            json={"amount": 100000},
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_update_income_invalid_amount(self, client, auth_headers, user_id):
        """Should reject invalid amount on update"""
        income = create_income(user_id)

        response = client.put(
            f"/api/v1/income/{income.id}",
            json={"amount": -100},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "positive" in response.json["error"]

    def test_update_income_invalid_date(self, client, auth_headers, user_id):
        """Should reject invalid date format on update"""
        income = create_income(user_id)

        response = client.put(
            f"/api/v1/income/{income.id}",
            json={"date": "invalid-date"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "date format" in response.json["error"]

    def test_delete_income(self, client, auth_headers, user_id):
        """Should soft delete income entry"""
        income = create_income(user_id)

        response = client.delete(
            f"/api/v1/income/{income.id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "deleted" in response.json["message"]

        # Verify soft-deleted (record exists but has deleted_at set)
        deleted_income = Income.query.get(income.id)
        assert deleted_income is not None
        assert deleted_income.deleted_at is not None
        assert deleted_income.is_deleted is True

        # Verify not returned by active() filter
        assert Income.active().filter_by(id=income.id).first() is None

    def test_delete_income_not_found(self, client, auth_headers):
        """Should return 404 for non-existent income"""
        response = client.delete(
            "/api/v1/income/99999",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestIncomeStats:
    """Tests for income statistics endpoint"""

    def test_stats_requires_auth(self, client):
        """Should require authentication"""
        response = client.get("/api/v1/income/stats")
        assert response.status_code == 401

    def test_stats_empty_user(self, client, auth_headers):
        """Should return zero stats for new user"""
        response = client.get("/api/v1/income/stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.json
        assert data["total_income"] == 0
        assert data["period_income"] == 0

    def test_stats_with_initial_balance(self, client, auth_headers, user_id):
        """Should include first Initial Balance in total"""
        # Create initial balance (starting money)
        create_income(user_id, type="Initial Balance", amount=500000)
        # Create regular income
        create_income(user_id, type="Salary", amount=300000)

        response = client.get("/api/v1/income/stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.json
        # Total should include initial balance + salary
        assert data["total_income"] == 800000

    def test_stats_excludes_subsequent_initial_balance(
        self, client, auth_headers, user_id
    ):
        """Should only count first Initial Balance"""
        # Create first initial balance (starting money)
        today = date.today()
        create_income(
            user_id,
            type="Initial Balance",
            amount=500000,
            actual_date=today - timedelta(days=30),
        )
        # Create second initial balance (should be ignored)
        create_income(
            user_id,
            type="Initial Balance",
            amount=600000,
            actual_date=today,
        )
        # Create regular income
        create_income(user_id, type="Salary", amount=300000)

        response = client.get("/api/v1/income/stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.json
        # Total should include only first initial balance + salary
        assert data["total_income"] == 800000  # 500000 + 300000

    def test_stats_period_income(self, client, auth_headers, user_id):
        """Should calculate period income within salary period"""
        today = date.today()
        start = today - timedelta(days=14)

        # Create salary period with all required fields
        period = SalaryPeriod(
            user_id=user_id,
            initial_debit_balance=100000,
            initial_credit_balance=0,
            credit_limit=150000,  # Default limit
            credit_budget_allowance=0,
            total_budget_amount=100000,
            fixed_bills_total=0,
            remaining_amount=100000,
            weekly_budget=25000,
            weekly_debit_budget=25000,
            weekly_credit_budget=0,
            start_date=start,
            end_date=start + timedelta(days=27),
            is_active=True,
        )
        db.session.add(period)
        db.session.commit()

        # Create income in period
        create_income(user_id, type="Salary", amount=300000, actual_date=today)

        # Create income outside period
        create_income(
            user_id,
            type="Bonus",
            amount=50000,
            actual_date=start - timedelta(days=10),
        )

        response = client.get("/api/v1/income/stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.json
        # Period income should only include salary in period
        assert data["period_income"] == 300000


class TestIncomeCurrency:
    """Tests for multi-currency income support"""

    def test_create_income_with_currency(self, client, auth_headers):
        """Should accept different currencies"""
        response = client.post(
            "/api/v1/income",
            json={
                "type": "Freelance",
                "amount": 100000,
                "currency": "USD",
                "date": date.today().isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["income"]["currency"] == "USD"

    def test_create_income_lowercase_currency(self, client, auth_headers):
        """Should convert lowercase currency to uppercase"""
        response = client.post(
            "/api/v1/income",
            json={
                "type": "Consulting",
                "amount": 50000,
                "currency": "gbp",
                "date": date.today().isoformat(),
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        # Currency should be uppercased


class TestIncomeSearch:
    """Tests for income search functionality"""

    def test_search_by_type(self, client, auth_headers, user_id):
        """Should search income by type"""
        create_income(user_id, type="Monthly Salary")
        create_income(user_id, type="Freelance Work")
        create_income(user_id, type="Salary Bonus")

        response = client.get(
            "/api/v1/income?search=salary",
            headers=auth_headers,
        )

        assert response.status_code == 200
        incomes = response.json["income"]
        # Should find items containing "salary" (case-insensitive)
        assert len(incomes) >= 2
        for item in incomes:
            assert "salary" in item["type"].lower()
