"""
Bloom - Export/Import Routes

Handles exporting and importing user data (debts, recurring expenses).
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, Debt, RecurringExpense, SalaryPeriod
from datetime import datetime
import json

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
            'user_id': current_user_id,
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
            'salary_periods': 0
        }

        # Import Debts
        if 'debts' in data['data']:
            for debt_data in data['data']['debts']:
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

        # Import Recurring Expenses
        if 'recurring_expenses' in data['data']:
            for recurring_data in data['data']['recurring_expenses']:
                start_date = datetime.fromisoformat(
                    recurring_data['start_date'].replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(recurring_data['end_date'].replace(
                    'Z', '+00:00')) if recurring_data.get('end_date') else None

                # Calculate next_due_date
                next_due = start_date
                if next_due < datetime.utcnow():
                    next_due = datetime.utcnow()

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
                imported_counts['recurring_expenses'] += 1

        # Import Salary Periods
        if 'salary_periods' in data['data']:
            for sp_data in data['data']['salary_periods']:
                start_date = datetime.fromisoformat(
                    sp_data['start_date'].replace('Z', '+00:00')).date()
                end_date = datetime.fromisoformat(
                    sp_data['end_date'].replace('Z', '+00:00')).date()

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
                imported_counts['salary_periods'] += 1

        db.session.commit()

        return jsonify({
            'message': 'Data imported successfully',
            'imported': imported_counts
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Import failed: {str(e)}'}), 500
