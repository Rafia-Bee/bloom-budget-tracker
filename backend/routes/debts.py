"""
Bloom - Debt Routes

This module handles debt management endpoints.

Endpoints:
- GET /debts: Get all debts for current user
- POST /debts: Create new debt
- GET /debts/<id>: Get specific debt
- PUT /debts/<id>: Update debt
- DELETE /debts/<id>: Delete debt
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, Debt

debts_bp = Blueprint('debts', __name__, url_prefix='/debts')


@debts_bp.route('', methods=['GET'])
@jwt_required()
def get_debts():
    """Get all debts for the current user."""
    current_user_id = int(get_jwt_identity())

    # Check if requesting archived debts
    show_archived = request.args.get('archived', 'false').lower() == 'true'

    query = Debt.query.filter_by(user_id=current_user_id)

    if show_archived:
        query = query.filter_by(archived=True)
    else:
        query = query.filter_by(archived=False)

    debts = query.order_by(Debt.created_at.desc()).all()

    return jsonify([{
        'id': d.id,
        'name': d.name,
        'original_amount': d.original_amount,
        'current_balance': d.current_balance,
        'monthly_payment': d.monthly_payment,
        'archived': d.archived,
        'created_at': d.created_at.isoformat(),
        'updated_at': d.updated_at.isoformat()
    } for d in debts]), 200


@debts_bp.route('', methods=['POST'])
@jwt_required()
def create_debt():
    """Create a new debt."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    # Validate required fields
    if not data or not data.get('name') or not data.get('current_balance'):
        return jsonify({'error': 'Name and current balance are required'}), 400

    try:
        current_balance = int(data['current_balance'])
        if current_balance < 0:
            return jsonify({'error': 'Balance cannot be negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid balance amount'}), 400

    # Original amount defaults to current balance if not provided
    original_amount = data.get('original_amount', current_balance)
    try:
        original_amount = int(original_amount)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid original amount'}), 400

    # Monthly payment is optional, defaults to 0
    monthly_payment = data.get('monthly_payment', 0)
    try:
        monthly_payment = int(monthly_payment)
        if monthly_payment < 0:
            return jsonify({'error': 'Monthly payment cannot be negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid monthly payment'}), 400

    debt = Debt(
        user_id=current_user_id,
        name=data['name'],
        original_amount=original_amount,
        current_balance=current_balance,
        monthly_payment=monthly_payment
    )

    db.session.add(debt)
    db.session.commit()

    return jsonify({
        'message': 'Debt created successfully',
        'debt': {
            'id': debt.id,
            'name': debt.name,
            'original_amount': debt.original_amount,
            'current_balance': debt.current_balance,
            'monthly_payment': debt.monthly_payment
        }
    }), 201


@debts_bp.route('/<int:debt_id>', methods=['GET'])
@jwt_required()
def get_debt(debt_id):
    """Get a specific debt."""
    current_user_id = int(get_jwt_identity())
    debt = Debt.query.filter_by(id=debt_id, user_id=current_user_id).first()

    if not debt:
        return jsonify({'error': 'Debt not found'}), 404

    return jsonify({
        'id': debt.id,
        'name': debt.name,
        'original_amount': debt.original_amount,
        'current_balance': debt.current_balance,
        'monthly_payment': debt.monthly_payment,
        'archived': debt.archived,
        'created_at': debt.created_at.isoformat(),
        'updated_at': debt.updated_at.isoformat()
    }), 200


@debts_bp.route('/<int:debt_id>', methods=['PUT'])
@jwt_required()
def update_debt(debt_id):
    """Update a debt."""
    current_user_id = int(get_jwt_identity())
    debt = Debt.query.filter_by(id=debt_id, user_id=current_user_id).first()

    if not debt:
        return jsonify({'error': 'Debt not found'}), 404

    data = request.get_json()

    if 'name' in data:
        debt.name = data['name']

    if 'original_amount' in data:
        try:
            debt.original_amount = int(data['original_amount'])
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid original amount'}), 400

    if 'current_balance' in data:
        try:
            balance = int(data['current_balance'])
            if balance < 0:
                return jsonify({'error': 'Balance cannot be negative'}), 400
            debt.current_balance = balance
            # Auto-archive if balance reaches 0
            if balance == 0:
                debt.archived = True
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid balance amount'}), 400

    if 'monthly_payment' in data:
        try:
            payment = int(data['monthly_payment'])
            if payment < 0:
                return jsonify({'error': 'Monthly payment cannot be negative'}), 400
            debt.monthly_payment = payment
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid monthly payment'}), 400

    if 'archived' in data:
        debt.archived = bool(data['archived'])

    db.session.commit()

    return jsonify({'message': 'Debt updated successfully'}), 200


@debts_bp.route('/<int:debt_id>', methods=['DELETE'])
@jwt_required()
def delete_debt(debt_id):
    """Delete a debt."""
    current_user_id = int(get_jwt_identity())
    debt = Debt.query.filter_by(id=debt_id, user_id=current_user_id).first()

    if not debt:
        return jsonify({'error': 'Debt not found'}), 404

    db.session.delete(debt)
    db.session.commit()

    return jsonify({'message': 'Debt deleted successfully'}), 200
