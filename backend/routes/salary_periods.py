"""
Bloom - Salary Periods Routes

Endpoints for managing salary periods and weekly budgeting.
Handles salary period creation, weekly budget tracking, and leftover allocation.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, SalaryPeriod, BudgetPeriod, RecurringExpense, Expense
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, func

salary_periods_bp = Blueprint('salary_periods', __name__)


@salary_periods_bp.route('', methods=['GET'])
@jwt_required()
def get_salary_periods():
    """Get all salary periods for the current user"""
    try:
        current_user_id = int(get_jwt_identity())
        active_only = request.args.get('active_only', 'false').lower() == 'true'

        query = SalaryPeriod.query.filter_by(user_id=current_user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        salary_periods = query.order_by(SalaryPeriod.start_date.desc()).all()

        return jsonify([{
            'id': sp.id,
            'salary_amount': sp.salary_amount,
            'fixed_bills_total': sp.fixed_bills_total,
            'remaining_amount': sp.remaining_amount,
            'weekly_budget': sp.weekly_budget,
            'start_date': sp.start_date.isoformat(),
            'end_date': sp.end_date.isoformat(),
            'is_active': sp.is_active,
            'created_at': sp.created_at.isoformat()
        } for sp in salary_periods]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@salary_periods_bp.route('/current', methods=['GET'])
@jwt_required()
def get_current_salary_period():
    """Get the currently active salary period with current week info"""
    try:
        current_user_id = int(get_jwt_identity())
        today = datetime.now().date()

        # Find active salary period that contains today
        salary_period = SalaryPeriod.query.filter(
            and_(
                SalaryPeriod.user_id == current_user_id,
                SalaryPeriod.is_active == True,
                SalaryPeriod.start_date <= today,
                SalaryPeriod.end_date >= today
            )
        ).first()

        if not salary_period:
            return jsonify({'error': 'No active salary period found'}), 404

        # Find current week
        current_week = BudgetPeriod.query.filter(
            and_(
                BudgetPeriod.salary_period_id == salary_period.id,
                BudgetPeriod.start_date <= today,
                BudgetPeriod.end_date >= today
            )
        ).first()

        # Calculate spending for current week (excluding fixed bills)
        week_spent = 0
        if current_week:
            week_spent = db.session.query(func.sum(Expense.amount)).filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.budget_period_id == current_week.id,
                    Expense.is_fixed_bill == False
                )
            ).scalar() or 0

        return jsonify({
            'salary_period': {
                'id': salary_period.id,
                'salary_amount': salary_period.salary_amount,
                'fixed_bills_total': salary_period.fixed_bills_total,
                'remaining_amount': salary_period.remaining_amount,
                'weekly_budget': salary_period.weekly_budget,
                'start_date': salary_period.start_date.isoformat(),
                'end_date': salary_period.end_date.isoformat()
            },
            'current_week': {
                'week_number': current_week.week_number if current_week else None,
                'budget_amount': current_week.budget_amount if current_week else None,
                'spent': week_spent,
                'remaining': (current_week.budget_amount - week_spent) if current_week else 0,
                'start_date': current_week.start_date.isoformat() if current_week else None,
                'end_date': current_week.end_date.isoformat() if current_week else None
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@salary_periods_bp.route('/preview', methods=['POST'])
@jwt_required()
def preview_salary_period():
    """Preview salary period calculation before creating it"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        salary_amount = data.get('salary_amount')
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()

        # Auto-detect fixed bills from recurring expenses
        fixed_bills = RecurringExpense.query.filter_by(
            user_id=current_user_id,
            is_active=True,
            is_fixed_bill=True
        ).all()

        # Allow manual adjustments to fixed bills
        fixed_bill_adjustments = data.get('fixed_bills', [])

        # Calculate total - use adjustments if provided, otherwise use auto-detected
        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill['amount'] for bill in fixed_bill_adjustments)
            bills_list = fixed_bill_adjustments
        else:
            fixed_bills_total = sum(bill.amount for bill in fixed_bills)
            bills_list = [{
                'id': bill.id,
                'name': bill.name,
                'amount': bill.amount,
                'category': bill.category
            } for bill in fixed_bills]

        remaining_amount = salary_amount - fixed_bills_total
        weekly_budget = remaining_amount // 4

        # Calculate end date (day before next salary, assuming monthly)
        end_date = start_date + relativedelta(months=1) - timedelta(days=1)

        # Calculate 4 week dates
        weeks = []
        current_start = start_date
        for week_num in range(1, 5):
            # Calculate week duration (7 days, except last week takes remaining days)
            if week_num < 4:
                week_end = current_start + timedelta(days=6)
            else:
                week_end = end_date

            weeks.append({
                'week_number': week_num,
                'start_date': current_start.isoformat(),
                'end_date': week_end.isoformat(),
                'budget_amount': weekly_budget
            })

            current_start = week_end + timedelta(days=1)

        return jsonify({
            'salary_amount': salary_amount,
            'fixed_bills_total': fixed_bills_total,
            'fixed_bills': bills_list,
            'remaining_amount': remaining_amount,
            'weekly_budget': weekly_budget,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'weeks': weeks
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@salary_periods_bp.route('', methods=['POST'])
@jwt_required()
def create_salary_period():
    """Create a new salary period with 4 weekly budget periods"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        salary_amount = data['salary_amount']
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()

        # Get fixed bills (either auto-detected or manually adjusted)
        fixed_bill_adjustments = data.get('fixed_bills', [])

        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill['amount'] for bill in fixed_bill_adjustments)
        else:
            # Auto-detect from recurring expenses
            fixed_bills = RecurringExpense.query.filter_by(
                user_id=current_user_id,
                is_active=True,
                is_fixed_bill=True
            ).all()
            fixed_bills_total = sum(bill.amount for bill in fixed_bills)

        remaining_amount = salary_amount - fixed_bills_total
        weekly_budget = remaining_amount // 4
        end_date = start_date + relativedelta(months=1) - timedelta(days=1)

        # Deactivate any existing active salary periods
        SalaryPeriod.query.filter_by(
            user_id=current_user_id,
            is_active=True
        ).update({'is_active': False})

        # Create salary period
        salary_period = SalaryPeriod(
            user_id=current_user_id,
            salary_amount=salary_amount,
            fixed_bills_total=fixed_bills_total,
            remaining_amount=remaining_amount,
            weekly_budget=weekly_budget,
            start_date=start_date,
            end_date=end_date,
            is_active=True
        )

        db.session.add(salary_period)
        db.session.flush()  # Get salary_period.id

        # Create 4 weekly budget periods
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
                budget_amount=weekly_budget,
                start_date=current_start,
                end_date=week_end,
                period_type='weekly'
            )

            db.session.add(budget_period)
            current_start = week_end + timedelta(days=1)

        db.session.commit()

        return jsonify({
            'id': salary_period.id,
            'message': 'Salary period created successfully with 4 weekly budgets'
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@salary_periods_bp.route('/<int:id>/week/<int:week_number>/leftover', methods=['GET'])
@jwt_required()
def get_week_leftover(id, week_number):
    """Calculate leftover budget for a specific week"""
    try:
        current_user_id = int(get_jwt_identity())

        # Get salary period
        salary_period = SalaryPeriod.query.filter_by(
            id=id,
            user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({'error': 'Salary period not found'}), 404

        # Get the specific week
        budget_period = BudgetPeriod.query.filter_by(
            salary_period_id=salary_period.id,
            week_number=week_number
        ).first()

        if not budget_period:
            return jsonify({'error': 'Week not found'}), 404

        # Calculate spending for this week (excluding fixed bills)
        week_spent = db.session.query(func.sum(Expense.amount)).filter(
            and_(
                Expense.user_id == current_user_id,
                Expense.budget_period_id == budget_period.id,
                Expense.is_fixed_bill == False
            )
        ).scalar() or 0

        leftover = budget_period.budget_amount - week_spent

        # Get user's active debts for allocation suggestions
        from backend.models.database import Debt
        active_debts = Debt.query.filter_by(
            user_id=current_user_id,
            archived=False
        ).all()

        return jsonify({
            'week_number': week_number,
            'budget_amount': budget_period.budget_amount,
            'spent': week_spent,
            'leftover': leftover,
            'allocation_options': {
                'debts': [{
                    'id': debt.id,
                    'name': debt.name,
                    'current_balance': debt.current_balance,
                    'monthly_payment': debt.monthly_payment
                } for debt in active_debts]
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@salary_periods_bp.route('/<int:id>', methods=['PATCH'])
@jwt_required()
def update_salary_period(id):
    """Update salary period (e.g., deactivate it)"""
    try:
        current_user_id = int(get_jwt_identity())

        salary_period = SalaryPeriod.query.filter_by(
            id=id,
            user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({'error': 'Salary period not found'}), 404

        data = request.get_json()

        if 'is_active' in data:
            salary_period.is_active = data['is_active']

        db.session.commit()

        return jsonify({'message': 'Salary period updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
