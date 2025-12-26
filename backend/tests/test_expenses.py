"""
Bloom - Expense Routes Tests

Comprehensive tests for expense CRUD operations including:
- Filter parameters (category, date range, amount, search)
- Validation edge cases
- Currency handling
- Debt payment integration
- Pagination
"""

import pytest
from datetime import date, timedelta
from backend.models.database import db, Expense, Debt, ExpenseNameMapping


class TestExpenseFilters:
    """Test expense filtering functionality"""

    def test_filter_by_category(self, client, auth_headers, salary_period):
        """Should filter expenses by category"""
        # Create expenses in different categories
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Groceries",
                "amount": 5000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Netflix",
                "amount": 1500,
                "category": "Subscriptions",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get(
            "/api/v1/expenses?category=Subscriptions", headers=auth_headers
        )

        assert response.status_code == 200
        expenses = response.json["expenses"]
        assert all(e["category"] == "Subscriptions" for e in expenses)

    def test_filter_by_subcategory(self, client, auth_headers, salary_period):
        """Should filter expenses by subcategory"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Uber",
                "amount": 2000,
                "category": "Flexible Expenses",
                "subcategory": "Transport",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Lunch",
                "amount": 1500,
                "category": "Flexible Expenses",
                "subcategory": "Food",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get(
            "/api/v1/expenses?subcategory=Transport", headers=auth_headers
        )

        assert response.status_code == 200
        expenses = response.json["expenses"]
        assert all(e["subcategory"] == "Transport" for e in expenses)

    def test_filter_by_payment_method(self, client, auth_headers, salary_period):
        """Should filter expenses by payment method"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Coffee",
                "amount": 500,
                "category": "Flexible Expenses",
                "payment_method": "Debit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Shoes",
                "amount": 8000,
                "category": "Flexible Expenses",
                "payment_method": "Credit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get(
            "/api/v1/expenses?payment_method=Credit card", headers=auth_headers
        )

        assert response.status_code == 200
        expenses = response.json["expenses"]
        assert all(e["payment_method"] == "Credit card" for e in expenses)

    def test_filter_by_date_range(self, client, auth_headers, salary_period):
        """Should filter expenses by start and end date"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Week 1 expense",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-21",
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Week 2 expense",
                "amount": 2000,
                "category": "Flexible Expenses",
                "date": "2025-11-28",
            },
            headers=auth_headers,
        )

        response = client.get(
            "/api/v1/expenses?start_date=2025-11-25&end_date=2025-11-30",
            headers=auth_headers,
        )

        assert response.status_code == 200
        expenses = response.json["expenses"]
        # Only Week 2 expense should be in range
        assert any(e["name"] == "Week 2 expense" for e in expenses)

    def test_filter_by_min_amount(self, client, auth_headers, salary_period):
        """Should filter expenses by minimum amount"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Small",
                "amount": 500,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Large",
                "amount": 10000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get("/api/v1/expenses?min_amount=5000", headers=auth_headers)

        assert response.status_code == 200
        expenses = response.json["expenses"]
        assert all(e["amount"] >= 5000 for e in expenses)

    def test_filter_by_max_amount(self, client, auth_headers, salary_period):
        """Should filter expenses by maximum amount"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Small",
                "amount": 500,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Large",
                "amount": 10000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get("/api/v1/expenses?max_amount=1000", headers=auth_headers)

        assert response.status_code == 200
        expenses = response.json["expenses"]
        assert all(e["amount"] <= 1000 for e in expenses)

    def test_filter_by_search_term_in_name(self, client, auth_headers, salary_period):
        """Should search expenses by name"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Grocery shopping at Lidl",
                "amount": 4500,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Netflix subscription",
                "amount": 1500,
                "category": "Subscriptions",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get("/api/v1/expenses?search=Lidl", headers=auth_headers)

        assert response.status_code == 200
        expenses = response.json["expenses"]
        assert any("Lidl" in e["name"] for e in expenses)

    def test_filter_by_search_term_in_notes(self, client, auth_headers, salary_period):
        """Should search expenses by notes field"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Dinner",
                "amount": 3500,
                "category": "Flexible Expenses",
                "notes": "Birthday celebration at restaurant",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get("/api/v1/expenses?search=birthday", headers=auth_headers)

        assert response.status_code == 200
        expenses = response.json["expenses"]
        assert any(e["name"] == "Dinner" for e in expenses)

    def test_combined_filters(self, client, auth_headers, salary_period):
        """Should apply multiple filters together"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Big purchase",
                "amount": 15000,
                "category": "Flexible Expenses",
                "payment_method": "Credit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.get(
            "/api/v1/expenses?category=Flexible Expenses&payment_method=Credit card&min_amount=10000",
            headers=auth_headers,
        )

        assert response.status_code == 200
        expenses = response.json["expenses"]
        for e in expenses:
            assert e["category"] == "Flexible Expenses"
            assert e["payment_method"] == "Credit card"
            assert e["amount"] >= 10000

    def test_invalid_date_format_ignored(self, client, auth_headers, salary_period):
        """Should ignore invalid date formats gracefully"""
        response = client.get(
            "/api/v1/expenses?start_date=invalid-date", headers=auth_headers
        )

        # Should still return expenses without error
        assert response.status_code == 200
        assert "expenses" in response.json


class TestExpensePagination:
    """Test expense pagination"""

    def test_default_pagination(self, client, auth_headers, salary_period):
        """Should return pagination info"""
        response = client.get("/api/v1/expenses", headers=auth_headers)

        assert response.status_code == 200
        assert "pagination" in response.json
        assert "page" in response.json["pagination"]
        assert "limit" in response.json["pagination"]
        assert "total" in response.json["pagination"]
        assert "pages" in response.json["pagination"]
        assert "has_more" in response.json["pagination"]

    def test_custom_page_and_limit(self, client, auth_headers, salary_period):
        """Should respect page and limit parameters"""
        # Create multiple expenses
        for i in range(5):
            client.post(
                "/api/v1/expenses",
                json={
                    "name": f"Expense {i}",
                    "amount": 1000,
                    "category": "Flexible Expenses",
                    "date": "2025-11-25",
                },
                headers=auth_headers,
            )

        response = client.get("/api/v1/expenses?page=1&limit=2", headers=auth_headers)

        assert response.status_code == 200
        assert len(response.json["expenses"]) <= 2
        assert response.json["pagination"]["limit"] == 2


class TestExpenseValidation:
    """Test expense validation and edge cases"""

    def test_create_expense_missing_name(self, client, auth_headers):
        """Should reject expense without name"""
        response = client.post(
            "/api/v1/expenses",
            json={"amount": 1000, "category": "Flexible Expenses"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Name, amount, and category required" in response.json["error"]

    def test_create_expense_missing_amount(self, client, auth_headers):
        """Should reject expense without amount"""
        response = client.post(
            "/api/v1/expenses",
            json={"name": "Test", "category": "Flexible Expenses"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Name, amount, and category required" in response.json["error"]

    def test_create_expense_missing_category(self, client, auth_headers):
        """Should reject expense without category"""
        response = client.post(
            "/api/v1/expenses",
            json={"name": "Test", "amount": 1000},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Name, amount, and category required" in response.json["error"]

    def test_create_expense_invalid_category(self, client, auth_headers):
        """Should reject expense with invalid category"""
        response = client.post(
            "/api/v1/expenses",
            json={"name": "Test", "amount": 1000, "category": "Invalid Category"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid category" in response.json["error"]

    def test_create_expense_invalid_date_format(self, client, auth_headers):
        """Should reject expense with invalid date format"""
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "not-a-date",
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid date format" in response.json["error"]

    def test_create_expense_display_date_format(self, client, auth_headers):
        """Should accept display date format (dd MMM, YYYY)"""
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "25 Nov, 2025",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["expense"]["date"] == "25 Nov, 2025"

    def test_create_expense_no_date_defaults_to_today(self, client, auth_headers):
        """Should default to today's date if none provided"""
        response = client.post(
            "/api/v1/expenses",
            json={"name": "Test", "amount": 1000, "category": "Flexible Expenses"},
            headers=auth_headers,
        )

        assert response.status_code == 201
        # Should have a date set (today)
        assert response.json["expense"]["date"]

    def test_update_expense_invalid_category(self, client, auth_headers, salary_period):
        """Should reject update with invalid category"""
        # Create valid expense first
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Original",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        # Try to update with invalid category
        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"category": "Not A Valid Category"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid category" in response.json["error"]

    def test_update_expense_invalid_date_format(
        self, client, auth_headers, salary_period
    ):
        """Should reject update with invalid date format"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Original",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"date": "bad-date"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid date format" in response.json["error"]

    def test_update_expense_display_date_format(
        self, client, auth_headers, salary_period
    ):
        """Should accept display date format on update"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Original",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"date": "26 Nov, 2025"},
            headers=auth_headers,
        )

        assert response.status_code == 200

    def test_get_nonexistent_expense(self, client, auth_headers):
        """Should return 404 for nonexistent expense"""
        response = client.get("/api/v1/expenses/99999", headers=auth_headers)
        assert response.status_code == 404
        assert "Expense not found" in response.json["error"]

    def test_update_nonexistent_expense(self, client, auth_headers):
        """Should return 404 for updating nonexistent expense"""
        response = client.put(
            "/api/v1/expenses/99999",
            json={"name": "Updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "Expense not found" in response.json["error"]

    def test_delete_nonexistent_expense(self, client, auth_headers):
        """Should return 404 for deleting nonexistent expense"""
        response = client.delete("/api/v1/expenses/99999", headers=auth_headers)
        assert response.status_code == 404
        assert "Expense not found" in response.json["error"]


class TestExpenseCurrency:
    """Test expense currency handling"""

    def test_create_expense_default_currency(self, client, auth_headers, salary_period):
        """Should default to EUR currency"""
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["expense"]["currency"] == "EUR"

    def test_create_expense_with_foreign_currency(
        self, client, auth_headers, salary_period
    ):
        """Should store foreign currency with original amount"""
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "USD Purchase",
                "amount": 9200,  # Converted to EUR cents
                "category": "Flexible Expenses",
                "currency": "USD",
                "original_amount": 10000,  # $100.00 in cents
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["expense"]["currency"] == "USD"
        assert response.json["expense"]["original_amount"] == 10000

    def test_update_expense_currency(self, client, auth_headers, salary_period):
        """Should update currency fields"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"currency": "gbp", "original_amount": 850},
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify update
        get_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )
        assert get_response.json["currency"] == "GBP"  # Uppercased
        assert get_response.json["original_amount"] == 850


class TestExpenseAutoSubcategory:
    """Test automatic subcategory assignment from name mappings"""

    def test_auto_assign_subcategory_from_mapping(
        self, client, auth_headers, salary_period, app
    ):
        """Should auto-assign subcategory based on expense name mapping"""
        # Create a name mapping
        with app.app_context():
            mapping = ExpenseNameMapping(
                expense_name="wolt", subcategory="Food Delivery"
            )
            db.session.add(mapping)
            db.session.commit()

        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Wolt",  # Matching name (case insensitive)
                "amount": 2500,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["expense"]["subcategory"] == "Food Delivery"

    def test_explicit_subcategory_overrides_mapping(
        self, client, auth_headers, salary_period, app
    ):
        """Should use explicit subcategory even if mapping exists"""
        with app.app_context():
            mapping = ExpenseNameMapping(expense_name="uber", subcategory="Rideshare")
            db.session.add(mapping)
            db.session.commit()

        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Uber",
                "amount": 1500,
                "category": "Flexible Expenses",
                "subcategory": "Transport",  # Explicit override
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["expense"]["subcategory"] == "Transport"


class TestExpenseDebtPayments:
    """Test debt payment integration with expenses"""

    def test_create_debt_payment_reduces_balance(
        self, client, auth_headers, salary_period, app
    ):
        """Should reduce debt balance when creating debt payment expense"""
        # Create a debt first
        with app.app_context():
            from backend.models.database import User

            user = User.query.filter_by(email="test@example.com").first()
            debt = Debt(
                user_id=user.id,
                name="Car Loan",
                original_amount=500000,  # €5000
                current_balance=500000,
                monthly_payment=20000,
            )
            db.session.add(debt)
            db.session.commit()
            debt_id = debt.id

        # Create debt payment expense
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Loan Payment",
                "amount": 20000,  # €200 payment
                "category": "Debt Payments",
                "subcategory": "Car Loan",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201

        # Verify debt balance reduced
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.current_balance == 480000  # 500000 - 20000

    def test_debt_payment_auto_archives_when_paid_off(
        self, client, auth_headers, salary_period, app
    ):
        """Should auto-archive debt when fully paid"""
        with app.app_context():
            from backend.models.database import User

            user = User.query.filter_by(email="test@example.com").first()
            debt = Debt(
                user_id=user.id,
                name="Small Debt",
                original_amount=5000,  # €50
                current_balance=5000,
                monthly_payment=5000,
            )
            db.session.add(debt)
            db.session.commit()
            debt_id = debt.id

        # Pay off the full amount
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Final Payment",
                "amount": 5000,
                "category": "Debt Payments",
                "subcategory": "Small Debt",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201

        # Verify debt is archived
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.current_balance == 0
            assert debt.archived is True

    def test_credit_card_payment_not_treated_as_debt(
        self, client, auth_headers, salary_period
    ):
        """Credit Card subcategory should not affect debt balances"""
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "CC Payment",
                "amount": 50000,
                "category": "Debt Payments",
                "subcategory": "Credit Card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        # Should create successfully without looking up debts
        assert response.status_code == 201

    def test_update_expense_reverses_old_debt_payment(
        self, client, auth_headers, salary_period, app
    ):
        """Should reverse old debt payment when expense updated"""
        # Create debt
        with app.app_context():
            from backend.models.database import User

            user = User.query.filter_by(email="test@example.com").first()
            debt = Debt(
                user_id=user.id,
                name="Test Debt",
                original_amount=100000,
                current_balance=100000,
                monthly_payment=10000,
            )
            db.session.add(debt)
            db.session.commit()
            debt_id = debt.id

        # Create initial payment
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Payment",
                "amount": 10000,
                "category": "Debt Payments",
                "subcategory": "Test Debt",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        # Verify balance reduced
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.current_balance == 90000

        # Update to different amount
        client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"amount": 20000},
            headers=auth_headers,
        )

        # Verify balance reflects new amount (old reversed, new applied)
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.current_balance == 80000  # 100000 - 20000

    def test_update_expense_changes_debt_category(
        self, client, auth_headers, salary_period, app
    ):
        """Should handle expense category change from/to debt payment"""
        # Create debt
        with app.app_context():
            from backend.models.database import User

            user = User.query.filter_by(email="test@example.com").first()
            debt = Debt(
                user_id=user.id,
                name="Debt To Pay",
                original_amount=50000,
                current_balance=50000,
                monthly_payment=5000,
            )
            db.session.add(debt)
            db.session.commit()
            debt_id = debt.id

        # Create regular expense
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Expense",
                "amount": 5000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        # Change to debt payment
        client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"category": "Debt Payments", "subcategory": "Debt To Pay"},
            headers=auth_headers,
        )

        # Verify debt balance reduced
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.current_balance == 45000

    def test_delete_expense_reverses_debt_payment(
        self, client, auth_headers, salary_period, app
    ):
        """Should reverse debt payment when expense deleted"""
        # Create debt
        with app.app_context():
            from backend.models.database import User

            user = User.query.filter_by(email="test@example.com").first()
            debt = Debt(
                user_id=user.id,
                name="Reversible Debt",
                original_amount=30000,
                current_balance=30000,
                monthly_payment=10000,
            )
            db.session.add(debt)
            db.session.commit()
            debt_id = debt.id

        # Create payment
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "To Delete",
                "amount": 10000,
                "category": "Debt Payments",
                "subcategory": "Reversible Debt",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        # Verify balance reduced
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.current_balance == 20000

        # Delete expense
        client.delete(f"/api/v1/expenses/{expense_id}", headers=auth_headers)

        # Verify balance restored
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.current_balance == 30000

    def test_delete_expense_unarchives_debt(
        self, client, auth_headers, salary_period, app
    ):
        """Should unarchive debt if delete brings balance above 0"""
        # Create debt that will be paid off
        with app.app_context():
            from backend.models.database import User

            user = User.query.filter_by(email="test@example.com").first()
            debt = Debt(
                user_id=user.id,
                name="Archived Debt",
                original_amount=5000,
                current_balance=5000,
                monthly_payment=5000,
            )
            db.session.add(debt)
            db.session.commit()
            debt_id = debt.id

        # Pay off fully (auto-archives)
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Full Payment",
                "amount": 5000,
                "category": "Debt Payments",
                "subcategory": "Archived Debt",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        # Verify archived
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.archived is True

        # Delete payment
        client.delete(f"/api/v1/expenses/{expense_id}", headers=auth_headers)

        # Verify unarchived
        with app.app_context():
            debt = Debt.query.get(debt_id)
            assert debt.archived is False
            assert debt.current_balance == 5000


class TestExpenseUpdateFields:
    """Test updating individual expense fields"""

    def test_update_expense_name(self, client, auth_headers, salary_period):
        """Should update expense name"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Original",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        get_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )
        assert get_response.json["name"] == "Updated Name"

    def test_update_expense_due_date(self, client, auth_headers, salary_period):
        """Should update expense due_date"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Bill",
                "amount": 5000,
                "category": "Fixed Expenses",
                "due_date": "2025-11-30",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"due_date": "2025-12-15"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        get_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )
        assert get_response.json["due_date"] == "2025-12-15"

    def test_update_expense_payment_method(self, client, auth_headers, salary_period):
        """Should update payment method"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test",
                "amount": 1000,
                "category": "Flexible Expenses",
                "payment_method": "Debit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"payment_method": "Credit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        get_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )
        assert get_response.json["payment_method"] == "Credit card"

    def test_update_expense_notes(self, client, auth_headers, salary_period):
        """Should update expense notes"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"notes": "Added some notes"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        get_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )
        assert get_response.json["notes"] == "Added some notes"

    def test_update_expense_receipt_url(self, client, auth_headers, salary_period):
        """Should update receipt URL"""
        create_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Test",
                "amount": 1000,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json["expense"]["id"]

        response = client.put(
            f"/api/v1/expenses/{expense_id}",
            json={"receipt_url": "https://example.com/receipt.jpg"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        get_response = client.get(
            f"/api/v1/expenses/{expense_id}", headers=auth_headers
        )
        assert get_response.json["receipt_url"] == "https://example.com/receipt.jpg"
