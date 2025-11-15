"""
Bloom - Recurring Expense Generation Routes

Endpoints for triggering and previewing recurring expense generation.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.utils.recurring_generator import generate_due_expenses, get_upcoming_recurring_expenses

recurring_generation_bp = Blueprint('recurring_generation', __name__)


@recurring_generation_bp.route('/generate', methods=['POST'])
@jwt_required()
def trigger_generation():
    """
    Manually trigger generation of due recurring expenses for current user.
    Supports days_ahead parameter to generate future expenses.
    """
    try:
        current_user_id = int(get_jwt_identity())
        dry_run = request.args.get('dry_run', 'false').lower() == 'true'
        days_ahead = int(request.args.get('days_ahead', 60))  # Default 60 days

        result = generate_due_expenses(user_id=current_user_id, dry_run=dry_run, days_ahead=days_ahead)

        return jsonify({
            'success': True,
            'message': f"{'Would generate' if dry_run else 'Generated'} {result['generated_count']} expenses",
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recurring_generation_bp.route('/generate/all', methods=['POST'])
@jwt_required()
def trigger_generation_all():
    """
    Generate due recurring expenses for all users (admin only in production).
    For development, available to any authenticated user.
    """
    try:
        dry_run = request.args.get('dry_run', 'false').lower() == 'true'
        days_ahead = int(request.args.get('days_ahead', 60))

        result = generate_due_expenses(dry_run=dry_run, days_ahead=days_ahead)

        return jsonify({
            'success': True,
            'message': f"{'Would generate' if dry_run else 'Generated'} {result['generated_count']} expenses for all users",
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@recurring_generation_bp.route('/preview', methods=['GET'])
@jwt_required()
def preview_upcoming():
    """
    Preview upcoming recurring expenses for the next X days.
    """
    try:
        current_user_id = int(get_jwt_identity())
        days = int(request.args.get('days', 30))

        upcoming = get_upcoming_recurring_expenses(current_user_id, days=days)

        return jsonify({
            'success': True,
            'upcoming': upcoming,
            'days': days
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
