"""
Bloom - Analytics Routes Tests

Tests for analytics endpoints including:
- Spending by category breakdown
- Spending trends over time
- Income vs expense summary
"""

import pytest
from datetime import datetime, timedelta
from backend.models.database import db, Expense, Income, User


class TestAnalyticsRoutes:
    """Test analytics API endpoints."""

    def test_spending_by_category_requires_auth(self, client):
        """Analytics endpoints require authentication."""
        response = client.get("/api/v1/analytics/spending-by-category")
        assert response.status_code == 401

    def test_spending_by_category_empty(self, client, auth_headers):
        """Returns empty categories when no expenses exist."""
        response = client.get(
            "/api/v1/analytics/spending-by-category", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json

        assert data["categories"] == []
        assert data["total_spending"] == 0
        assert "date_range" in data

    def test_spending_by_category_with_data(self, app, client, auth_headers):
        """Returns category breakdown with expense data."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expenses = [
                Expense(
                    user_id=user.id,
                    name="Groceries",
                    amount=5000,
                    category="Food",
                    date=today,
                    payment_method="debit",
                ),
                Expense(
                    user_id=user.id,
                    name="Restaurant",
                    amount=2500,
                    category="Food",
                    date=today,
                    payment_method="credit",
                ),
                Expense(
                    user_id=user.id,
                    name="Bus ticket",
                    amount=300,
                    category="Transport",
                    date=today,
                    payment_method="debit",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-by-category", headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json

            assert data["total_spending"] == 7800
            assert len(data["categories"]) == 2

            # Food should be first (highest total)
            food_category = data["categories"][0]
            assert food_category["name"] == "Food"
            assert food_category["total"] == 7500
            assert food_category["count"] == 2

            # Transport second
            transport_category = data["categories"][1]
            assert transport_category["name"] == "Transport"
            assert transport_category["total"] == 300
            assert transport_category["count"] == 1

    def test_spending_by_category_date_filter(self, app, client, auth_headers):
        """Filters expenses by date range."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()
            yesterday = today - timedelta(days=1)
            last_week = today - timedelta(days=7)

            # Expense in range
            expense1 = Expense(
                user_id=user.id,
                name="Recent",
                amount=1000,
                category="Food",
                date=yesterday,
                payment_method="debit",
            )
            # Expense out of range
            expense2 = Expense(
                user_id=user.id,
                name="Old",
                amount=2000,
                category="Food",
                date=last_week - timedelta(days=1),
                payment_method="debit",
            )
            db.session.add_all([expense1, expense2])
            db.session.commit()

            response = client.get(
                f"/api/v1/analytics/spending-by-category"
                f"?start_date={last_week.strftime('%Y-%m-%d')}"
                f"&end_date={today.strftime('%Y-%m-%d')}",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            # Only recent expense should be included
            assert data["total_spending"] == 1000

    def test_spending_by_category_payment_method_filter(
        self, app, client, auth_headers
    ):
        """Filters expenses by payment method."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            debit_expense = Expense(
                user_id=user.id,
                name="Debit",
                amount=1000,
                category="Food",
                date=today,
                payment_method="debit",
            )
            credit_expense = Expense(
                user_id=user.id,
                name="Credit",
                amount=2000,
                category="Food",
                date=today,
                payment_method="credit",
            )
            db.session.add_all([debit_expense, credit_expense])
            db.session.commit()

            # Filter debit only
            response = client.get(
                "/api/v1/analytics/spending-by-category?payment_method=debit",
                headers=auth_headers,
            )
            assert response.status_code == 200
            assert response.json["total_spending"] == 1000

            # Filter credit only
            response = client.get(
                "/api/v1/analytics/spending-by-category?payment_method=credit",
                headers=auth_headers,
            )
            assert response.status_code == 200
            assert response.json["total_spending"] == 2000

    def test_spending_trends_requires_auth(self, client):
        """Trends endpoint requires authentication."""
        response = client.get("/api/v1/analytics/spending-trends")
        assert response.status_code == 401

    def test_spending_trends_empty(self, client, auth_headers):
        """Returns empty trends when no expenses exist."""
        response = client.get("/api/v1/analytics/spending-trends", headers=auth_headers)
        assert response.status_code == 200
        data = response.json

        assert data["trends"] == []
        assert data["granularity"] == "daily"

    def test_spending_trends_daily(self, app, client, auth_headers):
        """Returns daily spending trends."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()
            yesterday = today - timedelta(days=1)

            expenses = [
                Expense(
                    user_id=user.id,
                    name="Today",
                    amount=1000,
                    category="Food",
                    date=today,
                    payment_method="debit",
                ),
                Expense(
                    user_id=user.id,
                    name="Yesterday",
                    amount=2000,
                    category="Food",
                    date=yesterday,
                    payment_method="credit",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-trends?granularity=daily",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            assert len(data["trends"]) == 2
            assert data["granularity"] == "daily"

            # Yesterday first (sorted by date)
            assert data["trends"][0]["date"] == yesterday.strftime("%Y-%m-%d")
            assert data["trends"][0]["total"] == 2000
            assert data["trends"][0]["credit"] == 2000

            # Today second
            assert data["trends"][1]["date"] == today.strftime("%Y-%m-%d")
            assert data["trends"][1]["total"] == 1000
            assert data["trends"][1]["debit"] == 1000

    def test_spending_trends_weekly(self, app, client, auth_headers):
        """Returns weekly aggregated spending trends."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            # Create expenses on same week (should aggregate)
            expenses = [
                Expense(
                    user_id=user.id,
                    name="Day 1",
                    amount=1000,
                    category="Food",
                    date=today,
                    payment_method="debit",
                ),
                Expense(
                    user_id=user.id,
                    name="Day 2",
                    amount=500,
                    category="Food",
                    date=today - timedelta(days=1),
                    payment_method="debit",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-trends?granularity=weekly",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            assert data["granularity"] == "weekly"
            # May be 1 or 2 weeks depending on when test runs
            assert len(data["trends"]) >= 1

    def test_spending_trends_monthly(self, app, client, auth_headers):
        """Returns monthly aggregated spending trends."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expenses = [
                Expense(
                    user_id=user.id,
                    name="This month",
                    amount=3000,
                    category="Food",
                    date=today,
                    payment_method="debit",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-trends?granularity=monthly",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            assert data["granularity"] == "monthly"
            assert len(data["trends"]) == 1
            assert data["trends"][0]["total"] == 3000

    def test_spending_trends_invalid_granularity(self, client, auth_headers):
        """Invalid granularity defaults to daily."""
        response = client.get(
            "/api/v1/analytics/spending-trends?granularity=invalid",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json["granularity"] == "daily"

    def test_income_vs_expense_requires_auth(self, client):
        """Income vs expense endpoint requires authentication."""
        response = client.get("/api/v1/analytics/income-vs-expense")
        assert response.status_code == 401

    def test_income_vs_expense_empty(self, client, auth_headers):
        """Returns zeros when no data exists."""
        response = client.get(
            "/api/v1/analytics/income-vs-expense", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json

        assert data["total_income"] == 0
        assert data["total_expense"] == 0
        assert data["net_savings"] == 0
        assert data["savings_rate"] == 0
        assert data["by_month"] == []

    def test_income_vs_expense_with_data(self, app, client, auth_headers):
        """Returns income vs expense comparison with data."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expense = Expense(
                user_id=user.id,
                name="Groceries",
                amount=5000,
                category="Food",
                date=today,
                payment_method="debit",
            )
            income = Income(
                user_id=user.id,
                type="Salary",
                amount=10000,
                actual_date=today,
            )
            db.session.add_all([expense, income])
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/income-vs-expense", headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json

            assert data["total_income"] == 10000
            assert data["total_expense"] == 5000
            assert data["net_savings"] == 5000
            assert data["savings_rate"] == 50.0

            # Check monthly breakdown
            assert len(data["by_month"]) == 1
            month_data = data["by_month"][0]
            assert month_data["income"] == 10000
            assert month_data["expense"] == 5000
            assert month_data["net"] == 5000

    def test_income_vs_expense_negative_savings(self, app, client, auth_headers):
        """Handles negative savings (spending more than income)."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expense = Expense(
                user_id=user.id,
                name="Big purchase",
                amount=15000,
                category="Shopping",
                date=today,
                payment_method="credit",
            )
            income = Income(
                user_id=user.id,
                type="Salary",
                amount=10000,
                actual_date=today,
            )
            db.session.add_all([expense, income])
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/income-vs-expense", headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json

            assert data["total_income"] == 10000
            assert data["total_expense"] == 15000
            assert data["net_savings"] == -5000
            assert data["savings_rate"] == -50.0

    def test_analytics_excludes_deleted_expenses(self, app, client, auth_headers):
        """Soft-deleted expenses are excluded from analytics."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            active_expense = Expense(
                user_id=user.id,
                name="Active",
                amount=1000,
                category="Food",
                date=today,
                payment_method="debit",
            )
            deleted_expense = Expense(
                user_id=user.id,
                name="Deleted",
                amount=5000,
                category="Food",
                date=today,
                payment_method="debit",
            )
            db.session.add_all([active_expense, deleted_expense])
            db.session.commit()

            # Soft delete one expense
            deleted_expense.soft_delete()
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-by-category", headers=auth_headers
            )
            assert response.status_code == 200
            assert response.json["total_spending"] == 1000  # Only active expense

    def test_analytics_user_isolation(self, app, client, auth_headers):
        """Analytics only includes data from authenticated user."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            # Create expense for test user
            test_expense = Expense(
                user_id=user.id,
                name="Test user expense",
                amount=1000,
                category="Food",
                date=today,
                payment_method="debit",
            )

            # Create another user and expense
            other_user = User(email="other@test.com")
            other_user.set_password("password")
            db.session.add(other_user)
            db.session.commit()

            other_expense = Expense(
                user_id=other_user.id,
                name="Other user expense",
                amount=9999,
                category="Food",
                date=today,
                payment_method="debit",
            )
            db.session.add_all([test_expense, other_expense])
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-by-category", headers=auth_headers
            )
            assert response.status_code == 200
            # Should only see test user's expense
            assert response.json["total_spending"] == 1000
