"""
Bloom - Export/Import Routes

Handles exporting and importing user data (debts, recurring expenses).
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, Debt, RecurringExpense, SalaryPeriod, BudgetPeriod, Income, Expense, ExpenseNameMapping
from datetime import datetime, timedelta
import json
import re

export_import_bp = Blueprint('export_import', __name__, url_prefix='/data')


@export_import_bp.route('/export', methods=['POST'])
@jwt_required()
def export_data():
    """Export selected data types as JSON."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        export_types = data.get('types', [])
        if not export_types:
            return jsonify({'error': 'No data types selected for export'}), 400

        export_data = {
            'exported_at': datetime.utcnow().isoformat(),
            'data': {}
        }

        # Export Debts
        if 'debts' in export_types:
            debts = Debt.query.filter_by(
                user_id=current_user_id, archived=False).all()
            export_data['data']['debts'] = [{
                'name': d.name,
                'original_amount': d.original_amount,
                'current_balance': d.current_balance,
                'monthly_payment': d.monthly_payment,
                'created_at': d.created_at.isoformat(),
            } for d in debts]

        # Export Recurring Expenses
        if 'recurring_expenses' in export_types:
            recurring = RecurringExpense.query.filter_by(
                user_id=current_user_id, is_active=True).all()
            export_data['data']['recurring_expenses'] = [{
                'name': r.name,
                'amount': r.amount,
                'category': r.category,
                'subcategory': r.subcategory,
                'payment_method': r.payment_method,
                'frequency': r.frequency,
                'frequency_value': r.frequency_value,
                'day_of_month': r.day_of_month,
                'day_of_week': r.day_of_week,
                'start_date': r.start_date.isoformat(),
                'end_date': r.end_date.isoformat() if r.end_date else None,
                'is_fixed_bill': r.is_fixed_bill,
                'notes': r.notes,
            } for r in recurring]

        # Export Salary Periods
        if 'salary_periods' in export_types:
            salary_periods = SalaryPeriod.query.filter_by(
                user_id=current_user_id, is_active=True).all()
            export_data['data']['salary_periods'] = [{
                'initial_debit_balance': sp.initial_debit_balance,
                'initial_credit_balance': sp.initial_credit_balance,
                'credit_limit': sp.credit_limit,
                'credit_budget_allowance': sp.credit_budget_allowance,
                'salary_amount': sp.salary_amount,
                'total_budget_amount': sp.total_budget_amount,
                'fixed_bills_total': sp.fixed_bills_total,
                'remaining_amount': sp.remaining_amount,
                'weekly_budget': sp.weekly_budget,
                'weekly_debit_budget': sp.weekly_debit_budget,
                'weekly_credit_budget': sp.weekly_credit_budget,
                'start_date': sp.start_date.isoformat(),
                'end_date': sp.end_date.isoformat(),
            } for sp in salary_periods]

        # Export Expenses
        if 'expenses' in export_types:
            expenses = Expense.query.filter_by(user_id=current_user_id).all()
            export_data['data']['expenses'] = [{
                'name': e.name,
                'amount': e.amount,
                'category': e.category,
                'subcategory': e.subcategory,
                'payment_method': e.payment_method,
                'date': e.date.isoformat(),
                'is_fixed_bill': e.is_fixed_bill,
                'notes': e.notes,
                'recurring_template_id': e.recurring_template_id,
            } for e in expenses]

        # Export Income
        if 'income' in export_types:
            incomes = Income.query.filter_by(user_id=current_user_id).all()
            export_data['data']['income'] = [{
                'type': i.type,
                'amount': i.amount,
                'scheduled_date': i.scheduled_date.isoformat(),
                'actual_date': i.actual_date.isoformat() if i.actual_date else None,
            } for i in incomes]

        return jsonify(export_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@export_import_bp.route('/import', methods=['POST'])
@jwt_required()
def import_data():
    """Import data from JSON file."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or 'data' not in data:
            return jsonify({'error': 'Invalid import file format'}), 400

        imported_counts = {
            'debts': 0,
            'recurring_expenses': 0,
            'salary_periods': 0,
            'expenses': 0,
            'income': 0
        }
        skipped_counts = {
            'debts': 0,
            'recurring_expenses': 0,
            'salary_periods': 0,
            'expenses': 0,
            'income': 0
        }

        # Import Debts
        if 'debts' in data['data']:
            for debt_data in data['data']['debts']:
                # Check for duplicate: same name and original_amount
                existing_debt = Debt.query.filter_by(
                    user_id=current_user_id,
                    name=debt_data['name'],
                    original_amount=debt_data['original_amount'],
                    archived=False
                ).first()

                if existing_debt:
                    skipped_counts['debts'] += 1
                    continue

                debt = Debt(
                    user_id=current_user_id,
                    name=debt_data['name'],
                    original_amount=debt_data['original_amount'],
                    current_balance=debt_data['current_balance'],
                    monthly_payment=debt_data['monthly_payment'],
                    archived=False
                )
                db.session.add(debt)
                imported_counts['debts'] += 1

        # Import Recurring Expenses FIRST (before expenses, so we can link them)
        # Create a map to link imported expenses to new recurring template IDs
        # Maps: (name, amount, category) -> new RecurringExpense object
        recurring_template_map = {}

        if 'recurring_expenses' in data['data']:
            for idx, recurring_data in enumerate(data['data']['recurring_expenses']):
                start_date = datetime.fromisoformat(
                    recurring_data['start_date'].replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(recurring_data['end_date'].replace(
                    'Z', '+00:00')) if recurring_data.get('end_date') else None

                # Check for duplicate: same name, amount, and category
                existing_recurring = RecurringExpense.query.filter_by(
                    user_id=current_user_id,
                    name=recurring_data['name'],
                    amount=recurring_data['amount'],
                    category=recurring_data['category'],
                    is_active=True
                ).first()

                if existing_recurring:
                    skipped_counts['recurring_expenses'] += 1
                    continue

                # Calculate next_due_date intelligently
                # Look through imported expenses to find the most recent one from this template
                most_recent_expense_date = None
                if 'expenses' in data['data']:
                    for exp_data in data['data']['expenses']:
                        # Match by name, amount, and category (since recurring_template_id won't match yet)
                        if (exp_data['name'] == recurring_data['name'] and
                            exp_data['amount'] == recurring_data['amount'] and
                            exp_data['category'] == recurring_data['category'] and
                                exp_data.get('recurring_template_id') is not None):
                            exp_date = datetime.fromisoformat(
                                exp_data['date'].replace('Z', '+00:00')).date()
                            if most_recent_expense_date is None or exp_date > most_recent_expense_date:
                                most_recent_expense_date = exp_date

                # Calculate next due date based on frequency
                if most_recent_expense_date:
                    # Start from the most recent expense and calculate next occurrence
                    next_due = most_recent_expense_date
                    if recurring_data['frequency'] == 'monthly':
                        # Add one month
                        next_month = next_due.month + 1
                        next_year = next_due.year
                        if next_month > 12:
                            next_month = 1
                            next_year += 1
                        day = recurring_data.get('day_of_month', next_due.day)
                        try:
                            next_due = datetime(
                                next_year, next_month, day).date()
                        except ValueError:
                            # Handle invalid day (e.g., Feb 30)
                            next_due = datetime(
                                next_year, next_month, 28).date()
                    elif recurring_data['frequency'] == 'weekly':
                        next_due = next_due + timedelta(days=7)
                    elif recurring_data['frequency'] == 'biweekly':
                        next_due = next_due + timedelta(days=14)
                    elif recurring_data['frequency'] == 'custom':
                        next_due = next_due + \
                            timedelta(days=recurring_data.get(
                                'frequency_value', 1))
                else:
                    # No expenses found, calculate from start_date
                    next_due = start_date.date()
                    today = datetime.now().date()

                    # If start date is in the past, calculate the next occurrence after today
                    if next_due < today:
                        if recurring_data['frequency'] == 'monthly':
                            day_of_month = recurring_data.get(
                                'day_of_month', start_date.day)
                            # Find next occurrence of this day
                            if today.day < day_of_month:
                                # This month
                                try:
                                    next_due = datetime(
                                        today.year, today.month, day_of_month).date()
                                except ValueError:
                                    next_due = datetime(
                                        today.year, today.month, 28).date()
                            else:
                                # Next month
                                next_month = today.month + 1
                                next_year = today.year
                                if next_month > 12:
                                    next_month = 1
                                    next_year += 1
                                try:
                                    next_due = datetime(
                                        next_year, next_month, day_of_month).date()
                                except ValueError:
                                    next_due = datetime(
                                        next_year, next_month, 28).date()
                        elif recurring_data['frequency'] == 'weekly':
                            # Calculate next weekly occurrence
                            days_diff = (today - next_due).days
                            weeks_passed = days_diff // 7
                            next_due = next_due + \
                                timedelta(days=(weeks_passed + 1) * 7)
                        elif recurring_data['frequency'] == 'biweekly':
                            days_diff = (today - next_due).days
                            periods_passed = days_diff // 14
                            next_due = next_due + \
                                timedelta(days=(periods_passed + 1) * 14)
                        elif recurring_data['frequency'] == 'custom':
                            days_diff = (today - next_due).days
                            freq_value = recurring_data.get(
                                'frequency_value', 1)
                            periods_passed = days_diff // freq_value
                            next_due = next_due + \
                                timedelta(days=(periods_passed + 1)
                                          * freq_value)

                recurring = RecurringExpense(
                    user_id=current_user_id,
                    name=recurring_data['name'],
                    amount=recurring_data['amount'],
                    category=recurring_data['category'],
                    subcategory=recurring_data.get('subcategory', ''),
                    payment_method=recurring_data['payment_method'],
                    frequency=recurring_data['frequency'],
                    frequency_value=recurring_data.get('frequency_value', 1),
                    day_of_month=recurring_data.get('day_of_month'),
                    day_of_week=recurring_data.get('day_of_week'),
                    start_date=start_date,
                    end_date=end_date,
                    next_due_date=next_due,
                    is_active=True,
                    is_fixed_bill=recurring_data.get('is_fixed_bill', False),
                    notes=recurring_data.get('notes', '')
                )
                db.session.add(recurring)
                db.session.flush()  # Flush to get the ID assigned

                # Store mapping for linking expenses later
                template_key = (
                    recurring_data['name'], recurring_data['amount'], recurring_data['category'])
                recurring_template_map[template_key] = recurring

                imported_counts['recurring_expenses'] += 1

        # Import Salary Periods
        if 'salary_periods' in data['data']:
            for sp_data in data['data']['salary_periods']:
                start_date = datetime.fromisoformat(
                    sp_data['start_date'].replace('Z', '+00:00')).date()
                end_date = datetime.fromisoformat(
                    sp_data['end_date'].replace('Z', '+00:00')).date()

                # Check for duplicate: same start_date and end_date
                existing_salary_period = SalaryPeriod.query.filter_by(
                    user_id=current_user_id,
                    start_date=start_date,
                    end_date=end_date,
                    is_active=True
                ).first()

                if existing_salary_period:
                    skipped_counts['salary_periods'] += 1
                    continue

                salary_period = SalaryPeriod(
                    user_id=current_user_id,
                    initial_debit_balance=sp_data['initial_debit_balance'],
                    initial_credit_balance=sp_data['initial_credit_balance'],
                    credit_limit=sp_data['credit_limit'],
                    credit_budget_allowance=sp_data['credit_budget_allowance'],
                    salary_amount=sp_data.get('salary_amount'),
                    total_budget_amount=sp_data['total_budget_amount'],
                    fixed_bills_total=sp_data['fixed_bills_total'],
                    remaining_amount=sp_data['remaining_amount'],
                    weekly_budget=sp_data['weekly_budget'],
                    weekly_debit_budget=sp_data['weekly_debit_budget'],
                    weekly_credit_budget=sp_data['weekly_credit_budget'],
                    start_date=start_date,
                    end_date=end_date,
                    is_active=True
                )
                db.session.add(salary_period)
                db.session.flush()  # Get salary_period.id for creating weekly periods

                # Create 4 weekly budget periods for this salary period
                current_start = start_date
                for week_num in range(1, 5):
                    if week_num < 4:
                        week_end = current_start + timedelta(days=6)
                    else:
                        week_end = end_date

                    budget_period = BudgetPeriod(
                        user_id=current_user_id,
                        salary_period_id=salary_period.id,
                        week_number=week_num,
                        budget_amount=sp_data['weekly_budget'],
                        start_date=current_start,
                        end_date=week_end,
                        period_type='weekly'
                    )
                    db.session.add(budget_period)
                    current_start = week_end + timedelta(days=1)

                # Create initial income entry for the debit balance
                # This makes the dashboard debit/credit cards show correct available amounts
                if sp_data['initial_debit_balance'] > 0:
                    initial_income = Income(
                        user_id=current_user_id,
                        budget_period_id=None,  # Not tied to a specific week
                        type='Initial Balance',
                        amount=sp_data['initial_debit_balance'],
                        scheduled_date=start_date,
                        actual_date=start_date
                    )
                    db.session.add(initial_income)

                # Create pre-existing credit debt expense (if any)
                pre_existing_debt = sp_data['credit_limit'] - \
                    sp_data['initial_credit_balance']
                if pre_existing_debt > 0:
                    debt_expense = Expense(
                        user_id=current_user_id,
                        budget_period_id=None,  # Not tied to a specific week
                        name='Pre-existing Credit Card Debt',
                        amount=pre_existing_debt,
                        category='Debt',
                        subcategory='Credit Card',
                        payment_method='Credit card',
                        # Date it before the period starts
                        date=start_date - timedelta(days=1),
                        is_fixed_bill=False,
                        notes='Existing credit card balance at budget period start'
                    )
                    db.session.add(debt_expense)

                imported_counts['salary_periods'] += 1

        # Import Expenses
        if 'expenses' in data['data']:
            for exp_data in data['data']['expenses']:
                expense_date = datetime.fromisoformat(
                    exp_data['date'].replace('Z', '+00:00')).date()

                # Check for duplicate: same date, name, and amount
                existing_expense = Expense.query.filter_by(
                    user_id=current_user_id,
                    name=exp_data['name'],
                    amount=exp_data['amount'],
                    date=expense_date
                ).first()

                if existing_expense:
                    skipped_counts['expenses'] += 1
                    continue

                # Find the budget period for this date
                from backend.utils.recurring_generator import find_budget_period_for_date
                budget_period = find_budget_period_for_date(
                    current_user_id, expense_date)

                if not budget_period:
                    # Skip if no budget period found
                    skipped_counts['expenses'] += 1
                    continue

                # Link to new recurring template if this expense was generated from one
                new_recurring_template_id = None
                if exp_data.get('recurring_template_id') is not None:
                    # Try to find the new template by matching name, amount, and category
                    template_key = (
                        exp_data['name'], exp_data['amount'], exp_data['category'])
                    if template_key in recurring_template_map:
                        new_recurring_template_id = recurring_template_map[template_key].id

                expense = Expense(
                    user_id=current_user_id,
                    budget_period_id=budget_period.id,
                    name=exp_data['name'],
                    amount=exp_data['amount'],
                    category=exp_data['category'],
                    subcategory=exp_data['subcategory'],
                    payment_method=exp_data['payment_method'],
                    date=expense_date,
                    is_fixed_bill=exp_data.get('is_fixed_bill', False),
                    notes=exp_data.get('notes', ''),
                    recurring_template_id=new_recurring_template_id
                )
                db.session.add(expense)
                imported_counts['expenses'] += 1

        # Import Income
        if 'income' in data['data']:
            for income_data in data['data']['income']:
                scheduled_date = datetime.fromisoformat(
                    income_data['scheduled_date'].replace('Z', '+00:00')).date()
                actual_date = None
                if income_data.get('actual_date'):
                    actual_date = datetime.fromisoformat(
                        income_data['actual_date'].replace('Z', '+00:00')).date()

                # Check for duplicate: same scheduled_date, type, and amount
                existing_income = Income.query.filter_by(
                    user_id=current_user_id,
                    type=income_data['type'],
                    amount=income_data['amount'],
                    scheduled_date=scheduled_date
                ).first()

                if existing_income:
                    skipped_counts['income'] += 1
                    continue

                # Find the budget period for this date
                from backend.utils.recurring_generator import find_budget_period_for_date
                income_date = actual_date if actual_date else scheduled_date
                budget_period = find_budget_period_for_date(
                    current_user_id, income_date)

                income = Income(
                    user_id=current_user_id,
                    budget_period_id=budget_period.id if budget_period else None,
                    type=income_data['type'],
                    amount=income_data['amount'],
                    scheduled_date=scheduled_date,
                    actual_date=actual_date
                )
                db.session.add(income)
                imported_counts['income'] += 1

        db.session.commit()

        # Build response message
        message_parts = []
        if any(count > 0 for count in imported_counts.values()):
            message_parts.append('Data imported successfully')

        skipped_total = sum(skipped_counts.values())
        if skipped_total > 0:
            skipped_details = []
            if skipped_counts['debts'] > 0:
                skipped_details.append(f"{skipped_counts['debts']} debt(s)")
            if skipped_counts['recurring_expenses'] > 0:
                skipped_details.append(
                    f"{skipped_counts['recurring_expenses']} recurring expense(s)")
            if skipped_counts['salary_periods'] > 0:
                skipped_details.append(
                    f"{skipped_counts['salary_periods']} salary period(s)")
            if skipped_counts['expenses'] > 0:
                skipped_details.append(
                    f"{skipped_counts['expenses']} expense(s)")
            if skipped_counts['income'] > 0:
                skipped_details.append(f"{skipped_counts['income']} income(s)")
            message_parts.append(
                f"Skipped {', '.join(skipped_details)} (already exists)")

        return jsonify({
            'message': '. '.join(message_parts) if message_parts else 'No new data to import',
            'imported': imported_counts,
            'skipped': skipped_counts
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Import failed: {str(e)}'}), 500


def parse_bank_transactions(transactions_text, payment_method, current_user_id, check_duplicates=True):
    """
    Helper function to parse bank transaction text and return parsed data.

    Args:
        transactions_text: Raw transaction data as string
        payment_method: Payment method ('Debit card' or 'Credit card')
        current_user_id: User ID for duplicate checking
        check_duplicates: Whether to check for existing duplicates

    Returns:
        dict with parsed_transactions, errors, and skipped_count
    """
    # Parse the transaction text (split by newlines)
    lines = [line.strip()
             for line in transactions_text.strip().split('\n') if line.strip()]

    if len(lines) < 2:
        raise ValueError(
            'No transaction data found. Please paste at least one transaction.')

    # Skip header line
    header = lines[0].lower()
    if 'transaction date' not in header or 'amount' not in header or 'name' not in header:
        raise ValueError(
            'Invalid format. Expected columns: Transaction Date, Amount, Name')

    transaction_lines = lines[1:]

    parsed_transactions = []
    errors = []
    skipped_count = 0

    for line_num, line in enumerate(transaction_lines, start=2):
        try:
            # Split by tab or multiple spaces
            parts = [p.strip() for p in line.split('\t') if p.strip()]
            if len(parts) < 3:
                # Try splitting by multiple spaces instead
                parts = [p.strip()
                         for p in re.split(r'\s{2,}', line) if p.strip()]

            if len(parts) < 3:
                errors.append(
                    f"Line {line_num}: Invalid format (expected 3 columns)")
                skipped_count += 1
                continue

            date_str, amount_str, merchant_name = parts[0], parts[1], parts[2]

            # Parse date (YYYY/MM/DD format)
            try:
                date_obj = datetime.strptime(date_str, '%Y/%m/%d').date()
            except ValueError:
                try:
                    # Try YYYY-MM-DD format
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    errors.append(
                        f"Line {line_num}: Invalid date format '{date_str}' (expected YYYY/MM/DD)")
                    skipped_count += 1
                    continue

            # Parse amount (handle comma decimal separator and negative sign)
            try:
                amount_str = amount_str.replace(',', '.')
                amount_float = float(amount_str)
                amount_cents = abs(int(amount_float * 100))

                # Skip zero or positive amounts (we only import expenses)
                if amount_float >= 0:
                    errors.append(
                        f"Line {line_num}: Skipped income transaction (amount: {amount_float})")
                    skipped_count += 1
                    continue
            except ValueError:
                errors.append(
                    f"Line {line_num}: Invalid amount '{amount_str}'")
                skipped_count += 1
                continue

            # Clean merchant name
            merchant_name = merchant_name.strip()

            # Try to find matching expense name mapping for smart categorization
            mapping = ExpenseNameMapping.query.filter(
                ExpenseNameMapping.expense_name.ilike(
                    f'%{merchant_name.lower()}%')
            ).first()

            if mapping:
                category = 'Flexible Expenses'  # Most mapped items are flexible
                subcategory = mapping.subcategory
            else:
                # Default categorization
                merchant_lower = merchant_name.lower()

                # Smart categorization based on merchant name patterns
                if any(keyword in merchant_lower for keyword in ['uber', 'bolt', 'taxi']):
                    category = 'Flexible Expenses'
                    subcategory = 'Transportation'
                elif any(keyword in merchant_lower for keyword in ['wolt', 'foodora', 'uber eats']):
                    category = 'Flexible Expenses'
                    subcategory = 'Food'
                elif any(keyword in merchant_lower for keyword in ['netflix', 'spotify', 'disney', 'hbo']):
                    category = 'Fixed Expenses'
                    subcategory = 'Subscriptions'
                elif any(keyword in merchant_lower for keyword in ['paypal', 'wise', 'revolut', 'nordea']):
                    category = 'Flexible Expenses'
                    subcategory = 'Shopping'
                else:
                    # Default to flexible expenses - shopping
                    category = 'Flexible Expenses'
                    subcategory = 'Shopping'

            # Check for duplicate (same date, amount, and merchant name)
            is_duplicate = False
            if check_duplicates:
                existing = Expense.query.filter_by(
                    user_id=current_user_id,
                    name=merchant_name,
                    amount=amount_cents,
                    date=date_obj
                ).first()

                if existing:
                    is_duplicate = True
                    skipped_count += 1
                    continue

            # Find the budget period for this date
            budget_period = BudgetPeriod.query.filter(
                BudgetPeriod.user_id == current_user_id,
                BudgetPeriod.start_date <= date_obj,
                BudgetPeriod.end_date >= date_obj
            ).first()

            parsed_transactions.append({
                'name': merchant_name,
                'amount': amount_cents / 100,
                'amount_cents': amount_cents,
                'date': date_obj.isoformat(),
                'date_obj': date_obj,
                'category': category,
                'subcategory': subcategory,
                'payment_method': payment_method,
                'budget_period_id': budget_period.id if budget_period else None,
                'is_duplicate': is_duplicate
            })

        except Exception as e:
            errors.append(f"Line {line_num}: {str(e)}")
            skipped_count += 1
            continue

    return {
        'parsed_transactions': parsed_transactions,
        'errors': errors,
        'skipped_count': skipped_count
    }


@export_import_bp.route('/preview-bank-transactions', methods=['POST'])
@jwt_required()
def preview_bank_transactions():
    """
    Preview bank transactions without importing them.
    Returns parsed transactions for user review.
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or 'transactions' not in data or 'payment_method' not in data:
            return jsonify({'error': 'transactions and payment_method are required'}), 400

        result = parse_bank_transactions(
            data['transactions'],
            data['payment_method'],
            current_user_id,
            check_duplicates=True
        )

        return jsonify({
            'transactions': result['parsed_transactions'],
            'errors': result['errors'],
            'skipped_count': result['skipped_count'],
            'total_count': len(result['parsed_transactions'])
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Preview failed: {str(e)}'}), 500


@export_import_bp.route('/import-bank-transactions', methods=['POST'])
@jwt_required()
def import_bank_transactions():
    """
    Import bank transactions from pasted CSV/TSV data.

    Expected format:
    Transaction Date\tAmount\tName
    2025/11/22\t-42,33\tWise Europe SA

    Returns created expenses and any errors/warnings.
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or 'transactions' not in data or 'payment_method' not in data:
            return jsonify({'error': 'transactions and payment_method are required'}), 400

        # Parse transactions
        result = parse_bank_transactions(
            data['transactions'],
            data['payment_method'],
            current_user_id,
            check_duplicates=True
        )

        # Create expenses from parsed transactions
        imported_count = 0
        created_expenses = []
        mark_as_fixed_bills = data.get('mark_as_fixed_bills', False)

        for txn in result['parsed_transactions']:
            expense = Expense(
                user_id=current_user_id,
                budget_period_id=txn['budget_period_id'],
                name=txn['name'],
                amount=txn['amount_cents'],
                category=txn['category'],
                subcategory=txn['subcategory'],
                date=txn['date_obj'],
                payment_method=txn['payment_method'],
                is_fixed_bill=mark_as_fixed_bills,
                notes=f'Imported from bank on {datetime.now().strftime("%Y-%m-%d")}'
            )
            db.session.add(expense)
            imported_count += 1

            created_expenses.append({
                'name': txn['name'],
                'amount': txn['amount'],
                'date': txn['date'],
                'category': txn['category'],
                'subcategory': txn['subcategory']
            })

        # Commit all expenses
        if imported_count > 0:
            db.session.commit()

        return jsonify({
            'message': f'Successfully imported {imported_count} transaction(s)' +
                      (f', skipped {result["skipped_count"]}' if result['skipped_count'] > 0 else ''),
            'imported_count': imported_count,
            'skipped_count': result['skipped_count'],
            'created_expenses': created_expenses,
            'errors': result['errors']
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Import failed: {str(e)}'}), 500
