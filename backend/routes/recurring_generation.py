"""
Bloom - Recurring Expense Generation Routes

Endpoints for triggering and previewing recurring expense generation.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import User
from backend.utils.recurring_generator import (
    generate_due_expenses,
    get_upcoming_recurring_expenses,
)
from sqlalchemy.exc import SQLAlchemyError

recurring_generation_bp = Blueprint("recurring_generation", __name__)


@recurring_generation_bp.route("/generate", methods=["POST"])
@jwt_required()
def trigger_generation():
    """
    Manually trigger generation of due recurring expenses for current user.
    Uses user's recurring_lookahead_days setting unless overridden with days_ahead parameter.
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        dry_run = request.args.get("dry_run", "false").lower() == "true"

        # Use user's setting unless explicitly overridden
        days_ahead = request.args.get("days_ahead")
        if days_ahead:
            days_ahead = int(days_ahead)
        else:
            days_ahead = user.recurring_lookahead_days

        result = generate_due_expenses(
            user_id=current_user_id, dry_run=dry_run, days_ahead=days_ahead
        )

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"{'Would generate' if dry_run else 'Generated'} {result['generated_count']} expenses",
                    "data": result,
                    "days_ahead": days_ahead,
                    "using_user_setting": request.args.get("days_ahead") is None,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(f"[trigger_generation] Error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate expenses. Please try again."}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@recurring_generation_bp.route("/generate/all", methods=["POST"])
@jwt_required()
def trigger_generation_all():
    """
    Generate due recurring expenses for all users (admin only in production).
    For development, available to any authenticated user.
    """
    try:
        dry_run = request.args.get("dry_run", "false").lower() == "true"
        days_ahead = int(request.args.get("days_ahead", 60))

        result = generate_due_expenses(dry_run=dry_run, days_ahead=days_ahead)

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"{'Would generate' if dry_run else 'Generated'} {result['generated_count']} expenses for all users",
                    "data": result,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[trigger_generation_all] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to generate expenses. Please try again."}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@recurring_generation_bp.route("/preview", methods=["GET"])
@jwt_required()
def preview_upcoming():
    """
    Preview upcoming recurring expenses.
    Uses user's recurring_lookahead_days setting unless overridden with 'days' parameter.
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Use user's setting unless explicitly overridden
        days = request.args.get("days")
        if days:
            days = int(days)
        else:
            days = user.recurring_lookahead_days

        upcoming = get_upcoming_recurring_expenses(current_user_id, days=days)

        return (
            jsonify(
                {
                    "success": True,
                    "upcoming": upcoming,
                    "days": days,
                    "using_user_setting": request.args.get("days") is None,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(f"[preview_upcoming] Error: {str(e)}", exc_info=True)
        return (
            jsonify(
                {"error": "Failed to preview upcoming expenses. Please try again."}
            ),
            500,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
