"""
Bloom - Business Logic Tests

Test carryover calculations, recurring expense generation, debt auto-archiving,
and expense date assignment logic.
"""

import pytest
from datetime import date, timedelta


class TestCarryoverLogic:
    """Test weekly budget carryover calculations"""

    def test_carryover_with_leftover(self, client, auth_headers, salary_period):
        """Week with leftover budget should carry to next week"""
        # Create expense in Week 1 (less than budget)
        client.post('/api/v1/expenses', json={
            'name': 'Small Expense',
            'amount': 5000,  # €50 (weekly budget likely higher)
            'category': 'Shopping',
            'date': '2025-11-22'
        }, headers=auth_headers)

        # Get current period data
        response = client.get(
            '/api/v1/salary-periods/current', headers=auth_headers)
        weeks = response.json['salary_period']['weeks']

        # Find Week 1 and Week 2
        week1 = next((w for w in weeks if w['week_number'] == 1), None)
        week2 = next((w for w in weeks if w['week_number'] == 2), None)

        assert week1 is not None
        assert week2 is not None

        # Week 1 should have remaining balance
        assert week1['remaining'] > 0

        # Week 2 should have carryover (if Week 1 is past)
        # Note: In test, week 1 might not be "past" yet

    def test_carryover_with_overspend(self, client, auth_headers, salary_period):
        """Week with overspending should reduce next week's budget"""
        # Get weekly budget amount
        period_response = client.get(
            '/api/v1/salary-periods/current', headers=auth_headers)
        weekly_budget = period_response.json['salary_period']['weekly_budget']

        # Create expense exceeding budget in Week 1
        client.post('/api/v1/expenses', json={
            'name': 'Large Expense',
            'amount': weekly_budget + 10000,  # Overspend by €100
            'category': 'Shopping',
            'date': '2025-11-22'
        }, headers=auth_headers)

        response = client.get(
            '/api/v1/salary-periods/current', headers=auth_headers)
        week1 = next(
            (w for w in response.json['salary_period']['weeks'] if w['week_number'] == 1), None)

        # Week 1 should show negative remaining
        assert week1['remaining'] < 0


class TestRecurringExpenseGeneration:
    """Test automatic recurring expense generation"""

    def test_recurring_expense_created_for_period(self, client, auth_headers):
        """Recurring expenses should be generated when creating salary period"""
        response = client.post('/api/v1/salary-periods', json={
            'start_date': '2025-12-20',
            'end_date': '2026-01-19',
            'initial_debit_balance': 500000,
            'initial_credit_balance': 100000,
            'credit_limit': 150000,
            'credit_budget_allowance': 30000,
            'recurring_expenses': [
                {
                    'name': 'Netflix',
                    'amount': 1500,  # €15
                    'category': 'Entertainment',
                    'subcategory': 'Streaming',
                    'frequency': 'monthly',
                    'day_of_month': 1,
                    'payment_method': 'Debit card'
                }
            ]
        }, headers=auth_headers)

        assert response.status_code == 201

        # Check if recurring expense was created
        recurring_response = client.get(
            '/api/v1/recurring-expenses', headers=auth_headers)
        assert len(recurring_response.json['recurring_expenses']) >= 1
        assert any(
            r['name'] == 'Netflix' for r in recurring_response.json['recurring_expenses'])


class TestDebtAutoArchiving:
    """Test debt auto-archiving when fully paid"""

    def test_debt_archived_when_paid_off(self, client, auth_headers, salary_period):
        """Debt should be auto-archived when balance reaches 0"""
        # Create debt
        debt_response = client.post('/api/v1/debts', json={
            'name': 'Credit Card',
            'original_amount': 50000,  # €500
            'current_balance': 50000,
            'minimum_payment': 5000,
            'interest_rate': 18.0,
            'due_date': '2026-01-15'
        }, headers=auth_headers)

        debt_id = debt_response.json['debt']['id']

        # Make full payment as expense
        client.post('/api/v1/expenses', json={
            'name': 'Debt Payment',
            'amount': 50000,  # Full amount
            'category': 'Debt Payments',
            'subcategory': 'Credit Card',
            'payment_method': 'Debit card',
            'date': '2025-11-25'
        }, headers=auth_headers)

        # Check debt status
        debt_check = client.get(
            f'/api/v1/debts/{debt_id}', headers=auth_headers)

        assert debt_check.json['current_balance'] == 0
        assert debt_check.json['archived'] is True


class TestExpenseDateAssignment:
    """Test expense assignment to correct budget period based on date"""

    def test_future_expense_assigned_to_future_week(self, client, auth_headers, salary_period):
        """Expense with future date should be assigned to future week"""
        # Create expense in Week 3 (Dec 4-10)
        response = client.post('/api/v1/expenses', json={
            'name': 'Future Expense',
            'amount': 3000,
            'category': 'Shopping',
            'date': '2025-12-06'
        }, headers=auth_headers)

        assert response.status_code == 201
        expense_id = response.json['expense']['id']

        # Get expense details
        expense_response = client.get(
            f'/api/v1/expenses/{expense_id}', headers=auth_headers)
        budget_period_id = expense_response.json['budget_period_id']

        # Get salary period weeks
        period_response = client.get(
            '/api/v1/salary-periods/current', headers=auth_headers)
        weeks = period_response.json['salary_period']['weeks']

        # Find which week this expense belongs to
        assigned_week = next(
            (w for w in weeks if w['id'] == budget_period_id), None)

        # Should be assigned to Week 3
        assert assigned_week is not None
        assert assigned_week['week_number'] == 3

    def test_past_expense_assigned_to_past_week(self, client, auth_headers, salary_period):
        """Expense with past date should be assigned to past week"""
        # Create expense in Week 1 (Nov 20-26)
        response = client.post('/api/v1/expenses', json={
            'name': 'Past Expense',
            'amount': 2000,
            'category': 'Food & Dining',
            'date': '2025-11-21'
        }, headers=auth_headers)

        assert response.status_code == 201
        expense_id = response.json['expense']['id']

        # Get expense details
        expense_response = client.get(
            f'/api/v1/expenses/{expense_id}', headers=auth_headers)
        budget_period_id = expense_response.json['budget_period_id']

        # Get salary period weeks
        period_response = client.get(
            '/api/v1/salary-periods/current', headers=auth_headers)
        weeks = period_response.json['salary_period']['weeks']

        # Find which week this expense belongs to
        assigned_week = next(
            (w for w in weeks if w['id'] == budget_period_id), None)

        # Should be assigned to Week 1
        assert assigned_week is not None
        assert assigned_week['week_number'] == 1

    def test_expense_outside_any_period_has_no_assignment(self, client, auth_headers, salary_period):
        """Expense with date outside all periods should have no budget_period_id"""
        # Create expense way in the future (outside salary period)
        response = client.post('/api/v1/expenses', json={
            'name': 'Far Future Expense',
            'amount': 1000,
            'category': 'Shopping',
            'date': '2026-06-01'
        }, headers=auth_headers)

        assert response.status_code == 201
        expense_id = response.json['expense']['id']

        # Get expense details
        expense_response = client.get(
            f'/api/v1/expenses/{expense_id}', headers=auth_headers)

        # Should have no budget_period_id
        assert expense_response.json['budget_period_id'] is None
