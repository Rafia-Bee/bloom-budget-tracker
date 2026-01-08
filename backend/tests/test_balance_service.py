"""
Bloom - Balance Service Tests

Unit tests for the balance calculation service (balance_service.py).
Tests the _calculate_debit_balance and _calculate_credit_available functions.

Issue #149: Tests ensure only the FIRST Initial Balance income record counts
for balance calculation. Subsequent salary periods' initial_debit_balance values
are snapshots and should NOT be added to the balance (as salary income is already
included in those values).
"""

from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import pytest

from backend.models.database import (
    db,
    SalaryPeriod,
    BudgetPeriod,
    Expense,
    Income,
    User,
)
from backend.services.balance_service import (
    get_display_balances,
    _calculate_debit_balance,
    _calculate_credit_available,
)


class TestDebitBalanceCalculation:
    """Tests for debit balance calculation - Issue #149"""

    def test_single_period_uses_initial_balance(self, client, auth_headers):
        """Single salary period should use its initial balance from Income record"""
        # Create a salary period with €1000 initial balance
        start_date = date.today()
        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 100000,  # €1000 in cents
                "credit_balance": 50000,
                "credit_limit": 100000,
                "credit_allowance": 0,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        period_id = response.json["id"]

        # Verify balance calculation
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            salary_period = SalaryPeriod.query.get(period_id)
            balance_mode = user.balance_mode or "sync"
            balance = _calculate_debit_balance(user.id, salary_period, balance_mode)
            # Should be €1000 from the first Initial Balance
            assert balance == 1000.0

    def test_second_period_does_not_change_initial_balance(self, client, auth_headers):
        """Creating a second salary period should NOT update the first Initial Balance"""
        # Create first salary period with €2000
        start1 = date(2025, 12, 10)
        end1 = date(2026, 1, 9)
        response1 = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start1.isoformat(),
                "end_date": end1.isoformat(),
                "debit_balance": 200000,  # €2000
                "credit_balance": 50000,
                "credit_limit": 100000,
                "credit_allowance": 0,
                "num_sub_periods": 4,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response1.status_code == 201

        # Verify first Initial Balance is €2000
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            initial_income = (
                Income.query.filter_by(user_id=user.id, type="Initial Balance")
                .order_by(Income.actual_date)
                .first()
            )
            assert initial_income.amount == 200000  # €2000

        # Create second salary period with €3000 (different initial balance)
        start2 = date(2026, 1, 10)
        end2 = date(2026, 2, 9)
        response2 = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start2.isoformat(),
                "end_date": end2.isoformat(),
                "debit_balance": 300000,  # €3000
                "credit_balance": 50000,
                "credit_limit": 100000,
                "credit_allowance": 0,
                "num_sub_periods": 4,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response2.status_code == 201
        period2_id = response2.json["id"]

        # Verify Initial Balance is STILL €2000 (not updated to €3000)
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            initial_income = (
                Income.query.filter_by(user_id=user.id, type="Initial Balance")
                .order_by(Income.actual_date)
                .first()
            )
            # Should still be €2000 from the first period
            assert initial_income.amount == 200000

            # Balance should still be €2000 (only first initial balance counts)
            salary_period = SalaryPeriod.query.get(period2_id)
            balance_mode = user.balance_mode or "sync"
            balance = _calculate_debit_balance(user.id, salary_period, balance_mode)
            assert balance == 2000.0

    def test_balance_subtracts_debit_expenses(self, client, auth_headers):
        """Balance should subtract debit card expenses from initial balance"""
        # Create period with €1500 initial balance
        start_date = date.today()
        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 150000,  # €1500
                "credit_balance": 50000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        period_id = response.json["id"]

        # Add a €200 debit expense
        expense_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Groceries",
                "amount": 20000,  # €200 in cents
                "category": "Flexible Expenses",
                "date": start_date.isoformat(),
                "payment_method": "Debit card",
            },
            headers=auth_headers,
        )
        assert expense_response.status_code == 201

        # Balance should be €1500 - €200 = €1300
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            salary_period = SalaryPeriod.query.get(period_id)
            balance_mode = user.balance_mode or "sync"
            balance = _calculate_debit_balance(user.id, salary_period, balance_mode)
            assert balance == 1300.0

    def test_balance_adds_salary_income(self, client, auth_headers):
        """Balance should add salary income to initial balance"""
        # Create period with €1000 initial balance
        start_date = date.today()
        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 100000,  # €1000
                "credit_balance": 50000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        period_id = response.json["id"]

        # Add €500 salary income (not Initial Balance type)
        income_response = client.post(
            "/api/v1/income",
            json={
                "type": "Salary",
                "amount": 50000,  # €500 in cents
                "date": start_date.isoformat(),
            },
            headers=auth_headers,
        )
        assert income_response.status_code == 201

        # Balance should be €1000 + €500 = €1500
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            salary_period = SalaryPeriod.query.get(period_id)
            balance_mode = user.balance_mode or "sync"
            balance = _calculate_debit_balance(user.id, salary_period, balance_mode)
            assert balance == 1500.0

    def test_balance_excludes_credit_expenses(self, client, auth_headers):
        """Debit balance should not include credit card expenses"""
        # Create period with €1000 initial balance
        start_date = date.today()
        response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": start_date.isoformat(),
                "debit_balance": 100000,  # €1000
                "credit_balance": 50000,
                "credit_limit": 100000,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        period_id = response.json["id"]

        # Add a €300 credit card expense (should NOT affect debit balance)
        expense_response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Online Shopping",
                "amount": 30000,  # €300 in cents
                "category": "Flexible Expenses",
                "date": start_date.isoformat(),
                "payment_method": "Credit card",
            },
            headers=auth_headers,
        )
        assert expense_response.status_code == 201

        # Balance should still be €1000 (credit expense doesn't affect debit)
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            salary_period = SalaryPeriod.query.get(period_id)
            balance_mode = user.balance_mode or "sync"
            balance = _calculate_debit_balance(user.id, salary_period, balance_mode)
            assert balance == 1000.0

    def test_no_periods_returns_404_for_display_balances(self, client, auth_headers):
        """With no salary periods, get_display_balances should return 404"""
        # Try to get display balances for a non-existent period
        response = client.get(
            "/api/v1/salary-periods/99999",
            headers=auth_headers,
        )
        # Should return 404 since period doesn't exist
        assert response.status_code == 404

    def test_only_one_initial_balance_record_created(self, client, auth_headers):
        """Multiple salary periods should only create ONE Initial Balance record"""
        # Create three salary periods
        dates = [
            ("2025-11-01", "2025-11-30"),
            ("2025-12-01", "2025-12-31"),
            ("2026-01-01", "2026-01-31"),
        ]
        balances = [100000, 150000, 200000]  # €1000, €1500, €2000

        for (start, end), balance in zip(dates, balances):
            response = client.post(
                "/api/v1/salary-periods",
                json={
                    "start_date": start,
                    "end_date": end,
                    "debit_balance": balance,
                    "credit_balance": 50000,
                    "credit_limit": 100000,
                    "num_sub_periods": 4,
                    "fixed_bills": [],
                },
                headers=auth_headers,
            )
            assert response.status_code == 201

        # Should only have ONE Initial Balance record
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            initial_balances = Income.query.filter_by(
                user_id=user.id, type="Initial Balance"
            ).all()
            assert len(initial_balances) == 1
            # And it should be from the first period (€1000)
            assert initial_balances[0].amount == 100000


class TestPastPeriodBalanceCalculation:
    """Tests for balance calculation when viewing past periods"""

    def test_past_period_credit_uses_period_initial_balance(self, client, auth_headers):
        """
        Bug fix test: Creating a past period after current period should show
        the past period's credit balance when viewing that period, not the current.

        Scenario:
        1. Create current period (Dec 2025) with 500 credit available
        2. Create past period (Nov 2025) with 1000 credit available
        3. View past period -> Should show 1000 credit, not 500
        """
        # Step 1: Create current period with €500 credit available
        current_response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": "2025-12-01",
                "end_date": "2025-12-31",
                "debit_balance": 60000,  # €600
                "credit_balance": 50000,  # €500 available
                "credit_limit": 50000,  # €500 limit (no debt)
                "credit_allowance": 0,
                "num_sub_periods": 4,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert current_response.status_code == 201

        # Step 2: Create past period with €1000 credit available
        past_response = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": "2025-11-01",
                "end_date": "2025-11-30",
                "debit_balance": 10000,  # €100
                "credit_balance": 100000,  # €1000 available
                "credit_limit": 100000,  # €1000 limit (no debt)
                "credit_allowance": 0,
                "num_sub_periods": 4,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert past_response.status_code == 201
        past_period_id = past_response.json["id"]

        # Step 3: Verify past period shows €1000 credit, not €500
        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            balances = get_display_balances(past_period_id, user.id)

            # Credit available should be €1000 from past period's initial balance
            assert (
                balances["credit_available"] == 1000.0
            ), f"Expected €1000 credit for past period, got €{balances['credit_available']}"

            # Debit should also use past period's initial balance (€100)
            assert (
                balances["debit_balance"] == 100.0
            ), f"Expected €100 debit for past period, got €{balances['debit_balance']}"


class TestDisplayBalancesIntegration:
    """Integration tests for get_display_balances function"""

    def test_display_balances_uses_first_initial_balance(self, client, auth_headers):
        """get_display_balances should use only the first Initial Balance"""
        # Create first period with €1000
        response1 = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": "2025-12-01",
                "end_date": "2025-12-31",
                "debit_balance": 100000,  # €1000
                "credit_balance": 50000,
                "credit_limit": 100000,
                "num_sub_periods": 4,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response1.status_code == 201

        # Create second period with €2000 (should NOT affect balance)
        response2 = client.post(
            "/api/v1/salary-periods",
            json={
                "start_date": "2026-01-01",
                "end_date": "2026-01-31",
                "debit_balance": 200000,  # €2000
                "credit_balance": 50000,
                "credit_limit": 100000,
                "num_sub_periods": 4,
                "fixed_bills": [],
            },
            headers=auth_headers,
        )
        assert response2.status_code == 201
        period2_id = response2.json["id"]

        with client.application.app_context():
            user = User.query.filter_by(email="test@example.com").first()
            balances = get_display_balances(period2_id, user.id)
            # Should be €1000 from first period only, NOT €1000 + €2000
            assert balances["debit_balance"] == 1000.0
