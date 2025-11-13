"""
Bloom - Budget Period Routes

This module handles budget period management endpoints.

Endpoints:
- GET /budget-periods: Get all budget periods for current user
- POST /budget-periods: Create new budget period
- GET /budget-periods/<id>: Get specific budget period
- GET /budget-periods/active: Get current active period
- PUT /budget-periods/<id>: Update budget period
- DELETE /budget-periods/<id>: Delete budget period
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from backend.models.database import db, BudgetPeriod

budget_periods_bp = Blueprint('budget_periods', __name__, url_prefix='/budget-periods')


@budget_periods_bp.route('', methods=['GET'])
@jwt_required()
def get_budget_periods():
    """Get all budget periods for current user."""
    current_user_id = int(get_jwt_identity())

    periods = BudgetPeriod.query.filter_by(user_id=current_user_id)\
        .order_by(BudgetPeriod.start_date.desc()).all()

    return jsonify([{
        'id': p.id,
        'start_date': p.start_date.strftime('%Y-%m-%d'),
        'end_date': p.end_date.strftime('%Y-%m-%d'),
        'period_type': p.period_type,
        'created_at': p.created_at.isoformat()
    } for p in periods]), 200


@budget_periods_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_period():
    """Get the current active budget period (period containing today's date)."""
    current_user_id = int(get_jwt_identity())
    today = datetime.now().date()

    active_period = BudgetPeriod.query.filter(
        BudgetPeriod.user_id == current_user_id,
        BudgetPeriod.start_date <= today,
        BudgetPeriod.end_date >= today
    ).first()

    if not active_period:
        return jsonify({'error': 'No active budget period found'}), 404

    return jsonify({
        'id': active_period.id,
        'start_date': active_period.start_date.strftime('%Y-%m-%d'),
        'end_date': active_period.end_date.strftime('%Y-%m-%d'),
        'period_type': active_period.period_type,
        'created_at': active_period.created_at.isoformat()
    }), 200


@budget_periods_bp.route('', methods=['POST'])
@jwt_required()
def create_budget_period():
    """Create a new budget period."""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or not data.get('period_type'):
        return jsonify({'error': 'Period type is required'}), 400

    period_type = data['period_type']

    # Calculate dates based on period type
    if period_type == 'monthly':
        # Get start date from request or use today
        if 'start_date' in data:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        else:
            start_date = datetime.now().date()

        # Calculate end date (30 days from start)
        end_date = start_date + timedelta(days=29)  # 30 days total (start + 29)

    elif period_type == 'weekly':
        if 'start_date' in data:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        else:
            start_date = datetime.now().date()
        end_date = start_date + timedelta(days=6)

    elif period_type == 'custom':
        if not data.get('start_date') or not data.get('end_date'):
            return jsonify({'error': 'Start and end dates required for custom period'}), 400

        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()

        if end_date <= start_date:
            return jsonify({'error': 'End date must be after start date'}), 400

    else:
        return jsonify({'error': 'Invalid period type. Use monthly, weekly, or custom'}), 400

    # Check for overlapping periods
    overlapping = BudgetPeriod.query.filter(
        BudgetPeriod.user_id == current_user_id,
        BudgetPeriod.start_date <= end_date,
        BudgetPeriod.end_date >= start_date
    ).first()

    if overlapping:
        return jsonify({'error': 'This period overlaps with an existing budget period'}), 400

    period = BudgetPeriod(
        user_id=current_user_id,
        start_date=start_date,
        end_date=end_date,
        period_type=period_type
    )

    db.session.add(period)
    db.session.commit()

    return jsonify({
        'message': 'Budget period created successfully',
        'period': {
            'id': period.id,
            'start_date': period.start_date.strftime('%Y-%m-%d'),
            'end_date': period.end_date.strftime('%Y-%m-%d'),
            'period_type': period.period_type
        }
    }), 201


@budget_periods_bp.route('/<int:period_id>', methods=['GET'])
@jwt_required()
def get_budget_period(period_id):
    """Get a specific budget period."""
    current_user_id = int(get_jwt_identity())
    period = BudgetPeriod.query.filter_by(id=period_id, user_id=current_user_id).first()

    if not period:
        return jsonify({'error': 'Budget period not found'}), 404

    return jsonify({
        'id': period.id,
        'start_date': period.start_date.strftime('%Y-%m-%d'),
        'end_date': period.end_date.strftime('%Y-%m-%d'),
        'period_type': period.period_type,
        'created_at': period.created_at.isoformat()
    }), 200


@budget_periods_bp.route('/<int:period_id>', methods=['PUT'])
@jwt_required()
def update_budget_period(period_id):
    """Update a budget period."""
    current_user_id = int(get_jwt_identity())
    period = BudgetPeriod.query.filter_by(id=period_id, user_id=current_user_id).first()

    if not period:
        return jsonify({'error': 'Budget period not found'}), 404

    data = request.get_json()

    if 'start_date' in data:
        period.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()

    if 'end_date' in data:
        period.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()

    if 'period_type' in data:
        period.period_type = data['period_type']

    # Validate dates
    if period.end_date <= period.start_date:
        return jsonify({'error': 'End date must be after start date'}), 400

    db.session.commit()

    return jsonify({'message': 'Budget period updated successfully'}), 200


@budget_periods_bp.route('/<int:period_id>', methods=['DELETE'])
@jwt_required()
def delete_budget_period(period_id):
    """Delete a budget period."""
    current_user_id = int(get_jwt_identity())
    period = BudgetPeriod.query.filter_by(id=period_id, user_id=current_user_id).first()

    if not period:
        return jsonify({'error': 'Budget period not found'}), 404

    db.session.delete(period)
    db.session.commit()

    return jsonify({'message': 'Budget period deleted successfully'}), 200
