"""
Bloom - Expense Routes

This module handles expense management endpoints.

Endpoints:
- GET /expenses: Get all expenses for current user
- POST /expenses: Create new expense
- GET /expenses/<id>: Get specific expense
- PUT /expenses/<id>: Update expense
- DELETE /expenses/<id>: Delete expense
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from backend.models.database import db, Expense, ExpenseNameMapping, Debt

expenses_bp = Blueprint('expenses', __name__, url_prefix='/expenses')


@expenses_bp.route('', methods=['GET'])
@jwt_required()
def get_expenses():
    current_user_id = int(get_jwt_identity())

    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)

    # Filter parameters
    period_id = request.args.get('budget_period_id', type=int)
    category = request.args.get('category')
    payment_method = request.args.get('payment_method')
    start_date = request.args.get('start_date')  # YYYY-MM-DD
    end_date = request.args.get('end_date')      # YYYY-MM-DD
    min_amount = request.args.get('min_amount', type=int)
    max_amount = request.args.get('max_amount', type=int)
    search = request.args.get('search')  # Search in name/notes

    query = Expense.query.filter_by(user_id=current_user_id)

    # Apply filters
    if period_id:
        query = query.filter_by(budget_period_id=period_id)
    if category:
        query = query.filter_by(category=category)
    if payment_method:
        query = query.filter_by(payment_method=payment_method)
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(Expense.date >= start)
        except ValueError:
            pass
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(Expense.date <= end)
        except ValueError:
            pass
    if min_amount is not None:
        query = query.filter(Expense.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Expense.amount <= max_amount)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Expense.name.ilike(search_pattern)) |
            (Expense.notes.ilike(search_pattern))
        )

    # Get total count before pagination
    total = query.count()

    # Apply pagination
    expenses = query.order_by(Expense.date.desc()).limit(
        limit).offset((page - 1) * limit).all()

    return jsonify({
        'expenses': [{
            'id': e.id,
            'budget_period_id': e.budget_period_id,
            'name': e.name,
            'amount': e.amount,
            'category': e.category,
            'subcategory': e.subcategory,
            'date': e.date.strftime('%d %b, %Y'),
            'due_date': e.due_date,
            'payment_method': e.payment_method,
            'notes': e.notes,
            'receipt_url': e.receipt_url,
            'recurring_template_id': e.recurring_template_id,
            'created_at': e.created_at.isoformat()
        } for e in expenses],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total + limit - 1) // limit,
            'has_more': page * limit < total
        }
    }), 200


@expenses_bp.route('', methods=['POST'])
@jwt_required()
def create_expense():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or not data.get('name') or not data.get('amount') or not data.get('category'):
        return jsonify({'error': 'Name, amount, and category required'}), 400

    date_str = data.get('date')
    if date_str:
        try:
            # Try ISO format first (YYYY-MM-DD from date picker)
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            try:
                # Fallback to display format (dd MMM, YYYY)
                date_obj = datetime.strptime(date_str, '%d %b, %Y').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        date_obj = datetime.now().date()

    subcategory = data.get('subcategory')
    if not subcategory:
        mapping = ExpenseNameMapping.query.filter_by(
            expense_name=data['name'].lower()).first()
        if mapping:
            subcategory = mapping.subcategory

    expense = Expense(
        user_id=current_user_id,
        budget_period_id=data.get('budget_period_id'),
        name=data['name'],
        amount=data['amount'],
        category=data['category'],
        subcategory=subcategory,
        date=date_obj,
        due_date=data.get('due_date', 'N/A'),
        payment_method=data.get('payment_method', 'credit'),
        notes=data.get('notes'),
        receipt_url=data.get('receipt_url')
    )

    db.session.add(expense)

    # If this is a debt payment, update the debt balance
    if data['category'] == 'Debt Payments' and subcategory and subcategory != 'Credit Card':
        debt = Debt.query.filter_by(
            user_id=current_user_id, name=subcategory).first()
        if debt:
            # Reduce the debt balance by the payment amount
            debt.current_balance = max(
                0, debt.current_balance - data['amount'])
            # Auto-archive if fully paid
            if debt.current_balance == 0:
                debt.archived = True

    db.session.commit()

    return jsonify({
        'message': 'Expense created successfully',
        'expense': {
            'id': expense.id,
            'name': expense.name,
            'amount': expense.amount,
            'category': expense.category,
            'subcategory': expense.subcategory,
            'date': expense.date.strftime('%d %b, %Y'),
            'due_date': expense.due_date,
            'payment_method': expense.payment_method
        }
    }), 201


@expenses_bp.route('/<int:expense_id>', methods=['GET'])
@jwt_required()
def get_expense(expense_id):
    current_user_id = int(get_jwt_identity())
    expense = Expense.query.filter_by(
        id=expense_id, user_id=current_user_id).first()

    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    return jsonify({
        'id': expense.id,
        'name': expense.name,
        'amount': expense.amount,
        'category': expense.category,
        'subcategory': expense.subcategory,
        'date': expense.date.strftime('%d %b, %Y'),
        'due_date': expense.due_date,
        'payment_method': expense.payment_method,
        'notes': expense.notes,
        'receipt_url': expense.receipt_url,
        'created_at': expense.created_at.isoformat()
    }), 200


@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    current_user_id = int(get_jwt_identity())
    expense = Expense.query.filter_by(
        id=expense_id, user_id=current_user_id).first()

    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    data = request.get_json()

    # Track if this was a debt payment and if amount changed
    old_was_debt_payment = expense.category == 'Debt Payments' and expense.subcategory and expense.subcategory != 'Credit Card'
    old_amount = expense.amount
    old_subcategory = expense.subcategory

    if 'name' in data:
        expense.name = data['name']
    if 'amount' in data:
        expense.amount = data['amount']
    if 'category' in data:
        expense.category = data['category']
    if 'subcategory' in data:
        expense.subcategory = data['subcategory']
    if 'date' in data:
        try:
            # Try ISO format first (YYYY-MM-DD from date picker)
            expense.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            try:
                # Fallback to display format (dd MMM, YYYY)
                expense.date = datetime.strptime(
                    data['date'], '%d %b, %Y').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    if 'due_date' in data:
        expense.due_date = data['due_date']
    if 'payment_method' in data:
        expense.payment_method = data['payment_method']
    if 'notes' in data:
        expense.notes = data['notes']
    if 'receipt_url' in data:
        expense.receipt_url = data['receipt_url']

    # Handle debt balance updates
    new_is_debt_payment = expense.category == 'Debt Payments' and expense.subcategory and expense.subcategory != 'Credit Card'

    # If this was a debt payment before, reverse the old payment
    if old_was_debt_payment:
        old_debt = Debt.query.filter_by(
            user_id=current_user_id, name=old_subcategory).first()
        if old_debt:
            old_debt.current_balance += old_amount
            # Unarchive if balance increases from 0
            if old_debt.current_balance > 0 and old_debt.archived:
                old_debt.archived = False

    # If this is now a debt payment, apply the new payment
    if new_is_debt_payment:
        new_debt = Debt.query.filter_by(
            user_id=current_user_id, name=expense.subcategory).first()
        if new_debt:
            new_debt.current_balance = max(
                0, new_debt.current_balance - expense.amount)
            # Auto-archive if fully paid
            if new_debt.current_balance == 0:
                new_debt.archived = True

    db.session.commit()

    return jsonify({'message': 'Expense updated successfully'}), 200


@expenses_bp.route('/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    current_user_id = int(get_jwt_identity())
    expense = Expense.query.filter_by(
        id=expense_id, user_id=current_user_id).first()

    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    # If this was a debt payment, reverse it from the debt balance
    if expense.category == 'Debt Payments' and expense.subcategory and expense.subcategory != 'Credit Card':
        debt = Debt.query.filter_by(
            user_id=current_user_id, name=expense.subcategory).first()
        if debt:
            # Add the payment back to the debt balance
            debt.current_balance += expense.amount
            # Unarchive if balance increases from 0
            if debt.current_balance > 0 and debt.archived:
                debt.archived = False

    db.session.delete(expense)
    db.session.commit()

    return jsonify({'message': 'Expense deleted successfully'}), 200
