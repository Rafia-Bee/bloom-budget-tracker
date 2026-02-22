"""
Bloom - Export/Import API Tests

Comprehensive tests for data export and import functionality including:
- Export various data types (debts, recurring expenses, salary periods, etc.)
- Import with duplicate detection and skipping
- Bank transaction import and preview
"""

import json
from datetime import date, timedelta
from backend.models.database import db, Debt, RecurringExpense, Goal, Subcategory


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

    def test_export_includes_recurring_expenses(
        self, client, auth_headers, salary_period
    ):
        """Should include recurring expenses when requested"""
        # Create a recurring expense
        today = date.today()
        client.post(
            "/api/v1/recurring-expenses",
            json={
                "name": "Netflix",
                "amount": 1599,
                "category": "Fixed Expenses",
                "subcategory": "Subscriptions",
                "payment_method": "Debit card",
                "frequency": "monthly",
                "day_of_month": 15,
                "start_date": today.isoformat(),
            },
            headers=auth_headers,
        )

        response = client.post(
            "/api/v1/data/export",
            json={"types": ["recurring_expenses"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "recurring_expenses" in data
        assert len(data["recurring_expenses"]) >= 1

    def test_export_includes_expenses(self, client, auth_headers, salary_period):
        """Should include expenses when requested"""
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Coffee",
                "amount": 350,
                "category": "Flexible Expenses",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        response = client.post(
            "/api/v1/data/export",
            json={"types": ["expenses"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "expenses" in data

    def test_export_includes_income(self, client, auth_headers, salary_period):
        """Should include income when requested"""
        response = client.post(
            "/api/v1/data/export",
            json={"types": ["income"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "income" in data
        # Should have at least the Initial Balance from salary period
        assert len(data["income"]) >= 1

    def test_export_includes_goals(self, client, auth_headers, app):
        """Should include goals when requested"""
        # Create a goal first
        with app.app_context():
            from backend.models.database import User

            user = User.query.filter_by(email="test@example.com").first()
            goal = Goal(
                user_id=user.id,
                name="Emergency Fund",
                target_amount=100000,
                subcategory_name="Emergency",
            )
            db.session.add(goal)
            db.session.commit()

        response = client.post(
            "/api/v1/data/export",
            json={"types": ["goals"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "goals" in data
        assert len(data["goals"]) >= 1

    def test_export_includes_weekly_breakdown(
        self, client, auth_headers, salary_period
    ):
        """Should include weekly budget breakdown with salary periods"""
        response = client.post(
            "/api/v1/data/export",
            json={"types": ["salary_periods"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "weekly_budget_breakdown" in data

    def test_export_multiple_types(self, client, auth_headers, salary_period):
        """Should export multiple data types at once"""
        response = client.post(
            "/api/v1/data/export",
            json={"types": ["salary_periods", "expenses", "income"]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json["data"]
        assert "salary_periods" in data
        assert "expenses" in data
        assert "income" in data


class TestDataImport:
    """Test data import functionality"""

    def test_import_requires_auth(self, client):
        """Should require authentication for import"""
        response = client.post(
            "/api/v1/data/import",
            json={"debts": []},
        )

        assert response.status_code == 401

    def test_import_requires_data_key(self, client, auth_headers):
        """Should require 'data' key in import payload"""
        response = client.post(
            "/api/v1/data/import",
            json={"debts": []},  # Missing 'data' wrapper
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "format" in response.json["error"].lower()

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
        assert response.json["imported"]["debts"] == 1

    def test_import_debts_skips_duplicates(self, client, auth_headers):
        """Should skip duplicate debts"""
        import_data = {
            "version": "2.0",
            "data": {
                "debts": [
                    {
                        "name": "Duplicate Debt",
                        "original_amount": 50000,
                        "current_balance": 25000,
                        "monthly_payment": 1000,
                    }
                ]
            },
        }

        # First import
        response1 = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )
        assert response1.json["imported"]["debts"] == 1

        # Second import (should skip)
        response2 = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )
        assert response2.json["skipped"]["debts"] == 1

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
        assert response.json["imported"]["recurring_expenses"] == 1

    def test_import_salary_periods(self, client, auth_headers):
        """Should import salary periods with budget periods"""
        future_start = date.today() + timedelta(days=90)
        future_end = future_start + timedelta(days=27)

        import_data = {
            "version": "2.0",
            "data": {
                "salary_periods": [
                    {
                        "initial_debit_balance": 500000,
                        "initial_credit_balance": 100000,
                        "credit_limit": 150000,
                        "credit_budget_allowance": 30000,
                        "total_budget_amount": 400000,
                        "fixed_bills_total": 0,
                        "remaining_amount": 400000,
                        "weekly_budget": 100000,
                        "weekly_debit_budget": 80000,
                        "weekly_credit_budget": 20000,
                        "start_date": future_start.isoformat(),
                        "end_date": future_end.isoformat(),
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
        assert response.json["imported"]["salary_periods"] == 1

    def test_import_salary_periods_skips_overlapping(
        self, client, auth_headers, salary_period
    ):
        """Should skip salary periods that overlap with existing ones"""
        # Get current period dates
        current = client.get("/api/v1/salary-periods/current", headers=auth_headers)
        start_date = current.json["salary_period"]["start_date"]
        end_date = current.json["salary_period"]["end_date"]

        import_data = {
            "version": "2.0",
            "data": {
                "salary_periods": [
                    {
                        "initial_debit_balance": 500000,
                        "initial_credit_balance": 100000,
                        "credit_limit": 150000,
                        "credit_budget_allowance": 30000,
                        "total_budget_amount": 400000,
                        "fixed_bills_total": 0,
                        "remaining_amount": 400000,
                        "weekly_budget": 100000,
                        "weekly_debit_budget": 80000,
                        "weekly_credit_budget": 20000,
                        "start_date": start_date,  # Same dates = overlap
                        "end_date": end_date,
                    }
                ]
            },
        }

        response = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )

        assert response.json["skipped"]["salary_periods"] == 1

    def test_import_expenses(self, client, auth_headers):
        """Should import expenses from JSON"""
        import_data = {
            "version": "2.0",
            "data": {
                "expenses": [
                    {
                        "name": "Imported Expense",
                        "amount": 2500,
                        "category": "Flexible Expenses",
                        "subcategory": "Food",
                        "payment_method": "Debit card",
                        "date": "2025-01-15",
                        "is_fixed_bill": False,
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
        assert response.json["imported"]["expenses"] == 1

    def test_import_expenses_skips_duplicates(self, client, auth_headers):
        """Should skip duplicate expenses (same date, name, amount)"""
        import_data = {
            "version": "2.0",
            "data": {
                "expenses": [
                    {
                        "name": "Duplicate Expense",
                        "amount": 1500,
                        "category": "Flexible Expenses",
                        "subcategory": "Shopping",
                        "payment_method": "Debit card",
                        "date": "2025-02-20",
                        "is_fixed_bill": False,
                    }
                ]
            },
        }

        # First import
        response1 = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )
        assert response1.json["imported"]["expenses"] == 1

        # Second import (should skip)
        response2 = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )
        assert response2.json["skipped"]["expenses"] == 1

    def test_import_income(self, client, auth_headers):
        """Should import income from JSON"""
        import_data = {
            "version": "2.0",
            "data": {
                "income": [
                    {
                        "type": "Bonus",
                        "amount": 50000,
                        "scheduled_date": "2025-03-01",
                        "actual_date": "2025-03-01",
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
        assert response.json["imported"]["income"] == 1

    def test_import_goals(self, client, auth_headers):
        """Should import goals from JSON"""
        import_data = {
            "version": "2.0",
            "data": {
                "goals": [
                    {
                        "name": "Vacation Fund",
                        "target_amount": 200000,
                        "initial_amount": 10000,
                        "subcategory_name": "Vacation",
                        "is_active": True,
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
        assert response.json["imported"]["goals"] == 1

    def test_import_goals_creates_subcategory(self, client, auth_headers, app):
        """Should auto-create subcategory if it doesn't exist"""
        import_data = {
            "version": "2.0",
            "data": {
                "goals": [
                    {
                        "name": "New Car",
                        "target_amount": 1500000,
                        "subcategory_name": "Car Fund",
                        "is_active": True,
                    }
                ]
            },
        }

        response = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )

        assert response.json["imported"]["goals"] == 1

        # Verify subcategory was created
        with app.app_context():
            subcat = Subcategory.query.filter_by(name="Car Fund").first()
            assert subcat is not None

    def test_import_multiple_types(self, client, auth_headers):
        """Should import multiple data types at once"""
        import_data = {
            "version": "2.0",
            "data": {
                "debts": [
                    {
                        "name": "Multi Import Debt",
                        "original_amount": 30000,
                        "current_balance": 30000,
                        "monthly_payment": 1000,
                    }
                ],
                "goals": [
                    {
                        "name": "Multi Import Goal",
                        "target_amount": 100000,
                        "subcategory_name": "Savings",
                        "is_active": True,
                    }
                ],
            },
        }

        response = client.post(
            "/api/v1/data/import",
            json=import_data,
            headers=auth_headers,
        )

        assert response.json["imported"]["debts"] == 1
        assert response.json["imported"]["goals"] == 1


class TestBankImport:
    """Test bank statement import functionality"""

    def test_preview_bank_transactions_requires_auth(self, client):
        """Should require authentication for bank preview"""
        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": "", "payment_method": "Debit card"},
        )

        assert response.status_code == 401

    def test_import_bank_transactions_requires_auth(self, client):
        """Should require authentication for bank import"""
        response = client.post(
            "/api/v1/data/import-bank-transactions",
            json={"transactions": "", "payment_method": "Debit card"},
        )

        assert response.status_code == 401

    def test_preview_bank_transactions(self, client, auth_headers, salary_period):
        """Should preview bank transactions without importing"""
        transactions = """Transaction Date\tAmount\tName
2025/11/22\t-42,33\tWise Europe SA
2025/11/23\t-15,00\tNetflix"""

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "transactions" in response.json
        assert len(response.json["transactions"]) == 2

    def test_preview_bank_transactions_requires_fields(self, client, auth_headers):
        """Should require transactions and payment_method fields"""
        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "required" in response.json["error"]

    def test_preview_bank_transactions_unknown_headers_returns_needs_mapping(
        self, client, auth_headers
    ):
        """Should return needs_mapping when column headers are not recognised"""
        transactions = """Some random text
That is not valid"""

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json.get("needs_mapping") is True
        assert "headers" in response.json

    def test_preview_bank_transactions_invalid_format_empty(self, client, auth_headers):
        """Should reject data that has fewer than 2 lines (no transactions)"""
        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": "   ", "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 400

    def test_import_bank_transactions(self, client, auth_headers, salary_period):
        """Should import bank transactions"""
        from datetime import date

        # Use today's date (within salary period range)
        today = date.today().strftime("%Y/%m/%d")
        transactions = f"""Transaction Date\tAmount\tName
{today}\t-42,33\tImported Merchant"""

        response = client.post(
            "/api/v1/data/import-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["imported_count"] == 1

    def test_import_bank_transactions_skips_positive_amounts(
        self, client, auth_headers, salary_period
    ):
        """Should skip positive amounts (income)"""
        from datetime import date

        today = date.today().strftime("%Y/%m/%d")
        transactions = f"""Transaction Date\tAmount\tName
{today}\t42,33\tRefund"""

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["skipped_count"] == 1

    def test_import_bank_transactions_smart_categorization(
        self, client, auth_headers, salary_period
    ):
        """Should auto-categorize known merchants"""
        from datetime import date, timedelta

        today = date.today()
        tomorrow = (today + timedelta(days=1)).strftime("%Y/%m/%d")
        today_str = today.strftime("%Y/%m/%d")
        transactions = f"""Transaction Date\tAmount\tName
{today_str}\t-20,00\tUber Trip
{today_str}\t-15,00\tWolt Food Delivery"""

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        txns = response.json["transactions"]

        # Uber should be categorized as Transportation
        uber_txn = next(t for t in txns if "Uber" in t["name"])
        assert uber_txn["subcategory"] == "Transportation"

        # Wolt should be categorized as Food
        wolt_txn = next(t for t in txns if "Wolt" in t["name"])
        assert wolt_txn["subcategory"] == "Food"

    def test_import_bank_transactions_skips_duplicates(
        self, client, auth_headers, salary_period
    ):
        """Should skip duplicate transactions"""
        from datetime import date

        today = date.today().strftime("%Y/%m/%d")
        transactions = f"""Transaction Date\tAmount\tName
{today}\t-42,33\tDuplicate Test Merchant"""

        # First import
        response1 = client.post(
            "/api/v1/data/import-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )
        assert response1.json["imported_count"] == 1

        # Second import (should skip)
        response2 = client.post(
            "/api/v1/data/import-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )
        assert response2.json["imported_count"] == 0
        assert response2.json["skipped_count"] == 1

    def test_import_bank_transactions_with_fixed_bills(
        self, client, auth_headers, salary_period
    ):
        """Should mark imported transactions as fixed bills if requested"""
        from datetime import date

        today = date.today().strftime("%Y/%m/%d")
        transactions = f"""Transaction Date\tAmount\tName
{today}\t-100,00\tRent Payment"""

        response = client.post(
            "/api/v1/data/import-bank-transactions",
            json={
                "transactions": transactions,
                "payment_method": "Debit card",
                "mark_as_fixed_bills": True,
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["imported_count"] == 1

    def test_import_requires_payment_method(self, client, auth_headers):
        """Should require payment_method field"""
        response = client.post(
            "/api/v1/data/import-bank-transactions",
            json={"transactions": "something"},
            headers=auth_headers,
        )

        assert response.status_code == 400

    # --- Flexible format tests ---

    def test_preview_semicolon_separated_csv(self, client, auth_headers, salary_period):
        """Should parse semicolon-separated CSV"""
        from datetime import date

        today = date.today().strftime("%Y-%m-%d")
        transactions = f"Date;Amount;Name\n{today};-10,50;Coffee Shop"

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["total_count"] == 1
        assert response.json["transactions"][0]["name"] == "Coffee Shop"

    def test_preview_comma_separated_csv(self, client, auth_headers, salary_period):
        """Should parse comma-separated CSV"""
        from datetime import date

        today = date.today().strftime("%Y-%m-%d")
        transactions = f"Date,Amount,Name\n{today},-25.00,Grocery Store"

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["total_count"] == 1
        assert response.json["transactions"][0]["name"] == "Grocery Store"

    def test_preview_alternative_column_names(
        self, client, auth_headers, salary_period
    ):
        """Should accept alternative column header names"""
        from datetime import date

        today = date.today().strftime("%Y-%m-%d")
        transactions = f"Booking Date\tBetrag\tDescription\n{today}\t-8,99\tBookshop"

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["total_count"] == 1
        assert response.json["transactions"][0]["name"] == "Bookshop"

    def test_preview_dd_mm_yyyy_date_format(self, client, auth_headers, salary_period):
        """Should parse DD/MM/YYYY date format"""
        from datetime import date

        today = date.today()
        date_str = today.strftime("%d/%m/%Y")
        transactions = f"Date\tAmount\tName\n{date_str}\t-5,00\tCafe"

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["total_count"] == 1

    def test_preview_dot_separated_date_format(
        self, client, auth_headers, salary_period
    ):
        """Should parse DD.MM.YYYY date format"""
        from datetime import date

        today = date.today()
        date_str = today.strftime("%d.%m.%Y")
        transactions = f"Date\tAmount\tName\n{date_str}\t-12,00\tPharmacy"

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={"transactions": transactions, "payment_method": "Debit card"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["total_count"] == 1

    def test_preview_with_explicit_column_mapping(
        self, client, auth_headers, salary_period
    ):
        """Should use explicit column mapping when provided"""
        from datetime import date

        today = date.today().strftime("%Y-%m-%d")
        transactions = f"Datum;Bedrag;Naam\n{today};-20,00;Supermarkt"

        response = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={
                "transactions": transactions,
                "payment_method": "Debit card",
                "column_mapping": {"date": "Datum", "amount": "Bedrag", "name": "Naam"},
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["total_count"] == 1
        assert response.json["transactions"][0]["name"] == "Supermarkt"

    def test_preview_saves_and_recalls_column_mapping(
        self, client, auth_headers, salary_period
    ):
        """Saved mapping should be used automatically on next import"""
        from datetime import date

        today = date.today().strftime("%Y-%m-%d")
        # Custom headers that won't be auto-detected
        transactions = f"Datum;Bedrag;Naam\n{today};-20,00;Bakkerij"

        # First call: provide mapping and ask to save it
        response1 = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={
                "transactions": transactions,
                "payment_method": "Debit card",
                "column_mapping": {"date": "Datum", "amount": "Bedrag", "name": "Naam"},
                "save_mapping": True,
            },
            headers=auth_headers,
        )
        assert response1.status_code == 200
        assert response1.json["total_count"] == 1

        # Second call: no mapping provided - should use saved one
        response2 = client.post(
            "/api/v1/data/preview-bank-transactions",
            json={
                "transactions": transactions,
                "payment_method": "Debit card",
            },
            headers=auth_headers,
        )
        assert response2.status_code == 200
        assert response2.json["total_count"] == 1
        assert response2.json["transactions"][0]["name"] == "Bakkerij"
