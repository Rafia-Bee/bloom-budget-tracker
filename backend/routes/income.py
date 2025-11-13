"""
Bloom - Income Routes

Handles income entries (salary, other income).
Supports CRUD operations for income tracking.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, Income
from datetime import datetime

income_bp = Blueprint('income', __name__)


@income_bp.route('', methods=['GET'])
@jwt_required()
def get_income():
    """Get all income entries for the current user."""
    user_id = int(get_jwt_identity())
    income_entries = Income.query.filter_by(user_id=user_id).order_by(Income.actual_date.desc()).all()

    return jsonify([{
        'id': entry.id,
        'type': entry.type,
        'amount': entry.amount,
        'date': entry.actual_date.strftime('%d %b, %Y') if entry.actual_date else None,
        'scheduled_date': entry.scheduled_date.strftime('%d %b, %Y') if entry.scheduled_date else None
    } for entry in income_entries]), 200
@income_bp.route('', methods=['POST'])
@jwt_required()
def create_income():
    """Create a new income entry."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    # Validate required fields
    if not data.get('type') or not data.get('amount'):
        return jsonify({'error': 'Type and amount are required'}), 400

    try:
        amount = int(data['amount'])
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400

    # Parse date
    date_str = data.get('date')
    if date_str:
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        date = datetime.utcnow().date()

    # Create income entry
    income = Income(
        user_id=user_id,
        type=data['type'],
        amount=amount,
        actual_date=date
    )

    db.session.add(income)
    db.session.commit()

    return jsonify({
        'message': 'Income created successfully',
        'income': {
            'id': income.id,
            'type': income.type,
            'amount': income.amount,
            'date': income.actual_date.strftime('%d %b, %Y')
        }
    }), 201
@income_bp.route('/<int:income_id>', methods=['PUT'])
@jwt_required()
def update_income(income_id):
    """Update an existing income entry."""
    user_id = int(get_jwt_identity())
    income = Income.query.filter_by(id=income_id, user_id=user_id).first()

    if not income:
        return jsonify({'error': 'Income not found'}), 404

    data = request.get_json()

    # Update fields if provided
    if 'type' in data:
        income.type = data['type']

    if 'amount' in data:
        try:
            amount = int(data['amount'])
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
            income.amount = amount
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid amount'}), 400

    if 'date' in data:
        try:
            income.actual_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    db.session.commit()

    return jsonify({
        'message': 'Income updated successfully',
        'income': {
            'id': income.id,
            'type': income.type,
            'amount': income.amount,
            'date': income.actual_date.strftime('%d %b, %Y') if income.actual_date else None
        }
    }), 200
@income_bp.route('/<int:income_id>', methods=['DELETE'])
@jwt_required()
def delete_income(income_id):
    """Delete an income entry."""
    user_id = int(get_jwt_identity())
    income = Income.query.filter_by(id=income_id, user_id=user_id).first()

    if not income:
        return jsonify({'error': 'Income not found'}), 404

    db.session.delete(income)
    db.session.commit()

    return jsonify({'message': 'Income deleted successfully'}), 200
