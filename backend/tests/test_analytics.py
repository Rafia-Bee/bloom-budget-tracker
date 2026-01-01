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
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Restaurant",
                    amount=2500,
                    category="Food",
                    date=today,
                    payment_method="Credit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Bus ticket",
                    amount=300,
                    category="Transport",
                    date=today,
                    payment_method="Debit card",
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
                payment_method="Debit card",
            )
            # Expense out of range
            expense2 = Expense(
                user_id=user.id,
                name="Old",
                amount=2000,
                category="Food",
                date=last_week - timedelta(days=1),
                payment_method="Debit card",
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
                payment_method="Debit card",
            )
            credit_expense = Expense(
                user_id=user.id,
                name="Credit",
                amount=2000,
                category="Food",
                date=today,
                payment_method="Credit card",
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

    # ==================== Spending by Subcategory Tests ====================

    def test_spending_by_subcategory_requires_auth(self, client):
        """Subcategory endpoint requires authentication."""
        response = client.get("/api/v1/analytics/spending-by-subcategory")
        assert response.status_code == 401

    def test_spending_by_subcategory_empty(self, client, auth_headers):
        """Returns empty subcategories when no expenses exist."""
        response = client.get(
            "/api/v1/analytics/spending-by-subcategory", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json

        assert data["subcategories"] == []
        assert data["total_spending"] == 0
        assert "date_range" in data

    def test_spending_by_subcategory_with_data(self, app, client, auth_headers):
        """Returns subcategory breakdown with expense data."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expenses = [
                Expense(
                    user_id=user.id,
                    name="Groceries",
                    amount=5000,
                    category="Food",
                    subcategory="Groceries",
                    date=today,
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Restaurant",
                    amount=2500,
                    category="Food",
                    subcategory="Dining Out",
                    date=today,
                    payment_method="Credit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Another Grocery",
                    amount=1500,
                    category="Food",
                    subcategory="Groceries",
                    date=today,
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Bus ticket",
                    amount=300,
                    category="Transport",
                    subcategory=None,
                    date=today,
                    payment_method="Debit card",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-by-subcategory", headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json

            assert data["total_spending"] == 9300
            # Should have: Food/Groceries, Food/Dining Out, Transport/Uncategorized
            assert len(data["subcategories"]) == 3

            # Groceries should be first (highest total: 5000 + 1500)
            groceries = data["subcategories"][0]
            assert groceries["name"] == "Food / Groceries"
            assert groceries["total"] == 6500

    def test_spending_by_subcategory_null_subcategory(self, app, client, auth_headers):
        """Handles expenses without subcategory correctly."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expense = Expense(
                user_id=user.id,
                name="Uncategorized expense",
                amount=1000,
                category="Other",
                subcategory=None,
                date=today,
                payment_method="Debit card",
            )
            db.session.add(expense)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-by-subcategory", headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json

            assert len(data["subcategories"]) == 1
            assert data["subcategories"][0]["name"] == "Other / Uncategorized"
            assert data["subcategories"][0]["total"] == 1000

    def test_spending_by_subcategory_payment_method_filter(
        self, app, client, auth_headers
    ):
        """Filters subcategory breakdown by payment method."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expenses = [
                Expense(
                    user_id=user.id,
                    name="Debit purchase",
                    amount=1000,
                    category="Food",
                    subcategory="Groceries",
                    date=today,
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Credit purchase",
                    amount=2000,
                    category="Food",
                    subcategory="Groceries",
                    date=today,
                    payment_method="Credit card",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            # Filter debit only
            response = client.get(
                "/api/v1/analytics/spending-by-subcategory?payment_method=debit",
                headers=auth_headers,
            )
            assert response.status_code == 200
            assert response.json["total_spending"] == 1000

            # Filter credit only
            response = client.get(
                "/api/v1/analytics/spending-by-subcategory?payment_method=credit",
                headers=auth_headers,
            )
            assert response.status_code == 200
            assert response.json["total_spending"] == 2000

    def test_spending_by_subcategory_category_filter(self, app, client, auth_headers):
        """Filters subcategory breakdown by parent category (drill-down)."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            expenses = [
                Expense(
                    user_id=user.id,
                    name="Grocery shopping",
                    amount=3000,
                    category="Food",
                    subcategory="Groceries",
                    date=today,
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Restaurant dinner",
                    amount=2000,
                    category="Food",
                    subcategory="Dining Out",
                    date=today,
                    payment_method="Credit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Bus fare",
                    amount=500,
                    category="Transport",
                    subcategory="Public Transit",
                    date=today,
                    payment_method="Debit card",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            # Filter by Food category only
            response = client.get(
                "/api/v1/analytics/spending-by-subcategory?category=Food",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            # Should only return Food subcategories
            assert data["total_spending"] == 5000
            assert len(data["subcategories"]) == 2

            # Verify all returned subcategories are from Food category
            for subcat in data["subcategories"]:
                assert subcat["category"] == "Food"

            # Filter by Transport category only
            response = client.get(
                "/api/v1/analytics/spending-by-subcategory?category=Transport",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            assert data["total_spending"] == 500
            assert len(data["subcategories"]) == 1
            assert data["subcategories"][0]["category"] == "Transport"

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
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Yesterday",
                    amount=2000,
                    category="Food",
                    date=yesterday,
                    payment_method="Credit card",
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
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Day 2",
                    amount=500,
                    category="Food",
                    date=today - timedelta(days=1),
                    payment_method="Debit card",
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
                    payment_method="Debit card",
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
                payment_method="Debit card",
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
                payment_method="Credit card",
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
                payment_method="Debit card",
            )
            deleted_expense = Expense(
                user_id=user.id,
                name="Deleted",
                amount=5000,
                category="Food",
                date=today,
                payment_method="Debit card",
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
                payment_method="Debit card",
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
                payment_method="Debit card",
            )
            db.session.add_all([test_expense, other_expense])
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/spending-by-category", headers=auth_headers
            )
            assert response.status_code == 200
            # Should only see test user's expense
            assert response.json["total_spending"] == 1000

    def test_spending_excludes_pre_existing_credit_card_debt(
        self, client, app, auth_headers
    ):
        """Pre-existing Credit Card Debt expenses should be excluded from analytics."""
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
                    payment_method="Debit card",
                ),
                Expense(
                    user_id=user.id,
                    name="Pre-existing Credit Card Debt",
                    amount=100000,
                    category="Debt",
                    date=today,
                    payment_method="Credit card",
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            # Check spending by category
            response = client.get(
                "/api/v1/analytics/spending-by-category", headers=auth_headers
            )
            assert response.status_code == 200
            # Should only count groceries, not the pre-existing debt
            assert response.json["total_spending"] == 5000

            # Check spending trends
            response = client.get(
                "/api/v1/analytics/spending-trends", headers=auth_headers
            )
            assert response.status_code == 200
            assert response.json["trends"][0]["total"] == 5000

    def test_income_excludes_subsequent_initial_balances(
        self, client, app, auth_headers
    ):
        """Only the first Initial Balance income should be counted."""
        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()
            yesterday = today - timedelta(days=1)

            incomes = [
                Income(
                    user_id=user.id,
                    type="Initial Balance",
                    amount=300000,
                    scheduled_date=yesterday,
                    actual_date=yesterday,
                ),
                Income(
                    user_id=user.id,
                    type="Initial Balance",
                    amount=200000,
                    scheduled_date=today,
                    actual_date=today,
                ),
                Income(
                    user_id=user.id,
                    type="Salary",
                    amount=50000,
                    scheduled_date=today,
                    actual_date=today,
                ),
            ]
            db.session.add_all(incomes)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/income-vs-expense", headers=auth_headers
            )
            assert response.status_code == 200
            # Should count first Initial Balance (300000) + Salary (50000)
            # but NOT the second Initial Balance (200000)
            assert response.json["total_income"] == 350000


class TestBudgetVsActual:
    """Test budget vs actual analytics endpoint."""

    def test_budget_vs_actual_requires_auth(self, client):
        """Endpoint requires authentication."""
        response = client.get("/api/v1/analytics/budget-vs-actual")
        assert response.status_code == 401

    def test_budget_vs_actual_no_period(self, client, auth_headers):
        """Returns zero budget when no salary period exists."""
        response = client.get(
            "/api/v1/analytics/budget-vs-actual", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json

        assert data["planned_budget"] == 0
        assert data["actual_spending"] == 0
        assert data["remaining"] == 0
        assert data["salary_period"] is None

    def test_budget_vs_actual_with_period(self, client, app, auth_headers):
        """Returns budget comparison when salary period exists."""
        from backend.models.database import SalaryPeriod

        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            # Create a salary period covering today
            salary_period = SalaryPeriod(
                user_id=user.id,
                initial_debit_balance=100000,
                initial_credit_balance=50000,
                credit_limit=100000,
                credit_budget_allowance=0,
                total_budget_amount=100000,
                fixed_bills_total=20000,
                remaining_amount=80000,  # Budget after fixed bills
                weekly_budget=20000,
                weekly_debit_budget=20000,
                weekly_credit_budget=0,
                num_sub_periods=4,
                start_date=today - timedelta(days=7),
                end_date=today + timedelta(days=21),
                is_active=True,
            )
            db.session.add(salary_period)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/budget-vs-actual",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            assert data["planned_budget"] == 80000
            assert data["actual_spending"] == 0
            assert data["remaining"] == 80000
            assert data["utilization_percent"] == 0
            assert data["salary_period"] is not None
            assert data["salary_period"]["weekly_budget"] == 20000

    def test_budget_vs_actual_with_spending(self, client, app, auth_headers):
        """Returns correct spending breakdown by category."""
        from backend.models.database import SalaryPeriod

        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            # Create salary period
            salary_period = SalaryPeriod(
                user_id=user.id,
                initial_debit_balance=100000,
                initial_credit_balance=50000,
                credit_limit=100000,
                credit_budget_allowance=0,
                total_budget_amount=100000,
                fixed_bills_total=0,
                remaining_amount=100000,
                weekly_budget=25000,
                weekly_debit_budget=25000,
                weekly_credit_budget=0,
                num_sub_periods=4,
                start_date=today - timedelta(days=7),
                end_date=today + timedelta(days=21),
                is_active=True,
            )
            db.session.add(salary_period)

            # Add expenses (not fixed bills)
            expenses = [
                Expense(
                    user_id=user.id,
                    name="Groceries",
                    amount=15000,
                    category="Food",
                    date=today,
                    payment_method="Debit card",
                    is_fixed_bill=False,
                ),
                Expense(
                    user_id=user.id,
                    name="Restaurant",
                    amount=5000,
                    category="Food",
                    date=today,
                    payment_method="Credit card",
                    is_fixed_bill=False,
                ),
                Expense(
                    user_id=user.id,
                    name="Bus pass",
                    amount=3000,
                    category="Transport",
                    date=today,
                    payment_method="Debit card",
                    is_fixed_bill=False,
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/budget-vs-actual",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            assert data["planned_budget"] == 100000
            assert data["actual_spending"] == 23000
            assert data["remaining"] == 77000
            assert data["utilization_percent"] == 23.0

            # Check category breakdown
            assert len(data["by_category"]) == 2
            food = next(c for c in data["by_category"] if c["name"] == "Food")
            assert food["actual"] == 20000
            assert food["count"] == 2

    def test_budget_vs_actual_excludes_fixed_bills(self, client, app, auth_headers):
        """Fixed bill expenses are excluded from comparison."""
        from backend.models.database import SalaryPeriod

        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            salary_period = SalaryPeriod(
                user_id=user.id,
                initial_debit_balance=100000,
                initial_credit_balance=50000,
                credit_limit=100000,
                credit_budget_allowance=0,
                total_budget_amount=100000,
                fixed_bills_total=10000,
                remaining_amount=90000,
                weekly_budget=22500,
                weekly_debit_budget=22500,
                weekly_credit_budget=0,
                num_sub_periods=4,
                start_date=today - timedelta(days=7),
                end_date=today + timedelta(days=21),
                is_active=True,
            )
            db.session.add(salary_period)

            expenses = [
                Expense(
                    user_id=user.id,
                    name="Groceries",
                    amount=5000,
                    category="Food",
                    date=today,
                    payment_method="Debit card",
                    is_fixed_bill=False,
                ),
                Expense(
                    user_id=user.id,
                    name="Rent",
                    amount=10000,
                    category="Housing",
                    date=today,
                    payment_method="Debit card",
                    is_fixed_bill=True,  # Fixed bill - should be excluded
                ),
            ]
            db.session.add_all(expenses)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/budget-vs-actual",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            # Only non-fixed-bill expense should be counted
            assert data["actual_spending"] == 5000
            assert len(data["by_category"]) == 1
            assert data["by_category"][0]["name"] == "Food"

    def test_budget_vs_actual_date_filter(self, client, app, auth_headers):
        """Respects date range filter and pro-rates budget."""
        from backend.models.database import SalaryPeriod

        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()
            period_start = today - timedelta(days=14)
            period_end = today + timedelta(days=13)

            # 28-day period with 28000 cents remaining budget = 1000/day
            salary_period = SalaryPeriod(
                user_id=user.id,
                initial_debit_balance=100000,
                initial_credit_balance=50000,
                credit_limit=100000,
                credit_budget_allowance=0,
                total_budget_amount=100000,
                fixed_bills_total=72000,
                remaining_amount=28000,  # 28000 cents / 28 days = 1000/day
                weekly_budget=7000,
                weekly_debit_budget=7000,
                weekly_credit_budget=0,
                num_sub_periods=4,
                start_date=period_start,
                end_date=period_end,
                is_active=True,
            )
            db.session.add(salary_period)

            # Add expense at different dates
            expense1 = Expense(
                user_id=user.id,
                name="Recent expense",
                amount=2000,
                category="Food",
                date=today,
                payment_method="Debit card",
                is_fixed_bill=False,
            )
            expense2 = Expense(
                user_id=user.id,
                name="Old expense",
                amount=3000,
                category="Food",
                date=today - timedelta(days=10),
                payment_method="Debit card",
                is_fixed_bill=False,
            )
            db.session.add_all([expense1, expense2])
            db.session.commit()

            # Request only the last 7 days
            query_start = (today - timedelta(days=6)).strftime("%Y-%m-%d")
            query_end = today.strftime("%Y-%m-%d")

            response = client.get(
                f"/api/v1/analytics/budget-vs-actual"
                f"?start_date={query_start}&end_date={query_end}",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            # Only recent expense should be counted
            assert data["actual_spending"] == 2000

            # Budget should be pro-rated (7 days out of 28 days)
            # 28000 * (7/28) = 7000
            assert data["planned_budget"] == 7000

    def test_budget_vs_actual_over_budget(self, client, app, auth_headers):
        """Correctly handles over-budget scenario."""
        from backend.models.database import SalaryPeriod

        with app.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            today = datetime.now().date()

            salary_period = SalaryPeriod(
                user_id=user.id,
                initial_debit_balance=10000,
                initial_credit_balance=0,
                credit_limit=0,
                credit_budget_allowance=0,
                total_budget_amount=10000,
                fixed_bills_total=0,
                remaining_amount=10000,
                weekly_budget=2500,
                weekly_debit_budget=2500,
                weekly_credit_budget=0,
                num_sub_periods=4,
                start_date=today - timedelta(days=7),
                end_date=today + timedelta(days=21),
                is_active=True,
            )
            db.session.add(salary_period)

            # Spend more than budget
            expense = Expense(
                user_id=user.id,
                name="Big purchase",
                amount=15000,
                category="Shopping",
                date=today,
                payment_method="Debit card",
                is_fixed_bill=False,
            )
            db.session.add(expense)
            db.session.commit()

            response = client.get(
                "/api/v1/analytics/budget-vs-actual",
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json

            assert data["planned_budget"] == 10000
            assert data["actual_spending"] == 15000
            assert data["remaining"] == -5000
            assert data["utilization_percent"] == 150.0
