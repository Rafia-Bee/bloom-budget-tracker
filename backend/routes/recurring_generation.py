"""
Bloom - Recurring Transaction Generation Routes

Endpoints for triggering and previewing recurring expense and income generation.
Issue #177 - Extended to support recurring income generation.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, User
from backend.utils.recurring_generator import (
    generate_due_expenses,
    generate_due_income,
    generate_all_recurring,
    get_upcoming_recurring_expenses,
    get_upcoming_recurring_income,
    get_all_upcoming_recurring,
)
from sqlalchemy.exc import SQLAlchemyError

recurring_generation_bp = Blueprint("recurring_generation", __name__)


@recurring_generation_bp.route("/generate", methods=["POST"])
@jwt_required()
def trigger_generation():
    """
    Manually trigger generation of due recurring transactions for current user.
    Generates both expenses and income.
    Uses user's recurring_lookahead_days setting unless overridden with days_ahead parameter.
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        dry_run = request.args.get("dry_run", "false").lower() == "true"
        include_income = request.args.get("include_income", "true").lower() == "true"

        # Use user's setting unless explicitly overridden
        days_ahead = request.args.get("days_ahead")
        if days_ahead:
            days_ahead = int(days_ahead)
        else:
            days_ahead = user.recurring_lookahead_days

        if include_income:
            # Generate both expenses and income
            result = generate_all_recurring(
                user_id=current_user_id, dry_run=dry_run, days_ahead=days_ahead
            )
            message = f"{'Would generate' if dry_run else 'Generated'} {result['total_generated']} transactions (expenses: {result['expenses']['generated_count']}, income: {result['income']['generated_count']})"
        else:
            # Generate only expenses (backwards compatible)
            result = generate_due_expenses(
                user_id=current_user_id, dry_run=dry_run, days_ahead=days_ahead
            )
            message = f"{'Would generate' if dry_run else 'Generated'} {result['generated_count']} expenses"

        return (
            jsonify(
                {
                    "success": True,
                    "message": message,
                    "data": result,
                    "days_ahead": days_ahead,
                    "using_user_setting": request.args.get("days_ahead") is None,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(f"[trigger_generation] Error: {str(e)}", exc_info=True)
        return (
            jsonify({"error": "Failed to generate transactions. Please try again."}),
            500,
        )
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
        user = db.session.get(User, current_user_id)

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


@recurring_generation_bp.route("/preview-income", methods=["GET"])
@jwt_required()
def preview_upcoming_income():
    """
    Preview upcoming recurring income.
    Uses user's recurring_lookahead_days setting unless overridden with 'days' parameter.
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        days = request.args.get("days")
        if days:
            days = int(days)
        else:
            days = user.recurring_lookahead_days

        upcoming = get_upcoming_recurring_income(current_user_id, days=days)

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
        current_app.logger.error(
            f"[preview_upcoming_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to preview upcoming income. Please try again."}),
            500,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@recurring_generation_bp.route("/preview-all", methods=["GET"])
@jwt_required()
def preview_all_upcoming():
    """
    Preview all upcoming recurring transactions (expenses and income).
    Uses user's recurring_lookahead_days setting unless overridden with 'days' parameter.
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        days = request.args.get("days")
        if days:
            days = int(days)
        else:
            days = user.recurring_lookahead_days

        result = get_all_upcoming_recurring(current_user_id, days=days)

        return (
            jsonify(
                {
                    "success": True,
                    **result,
                    "days": days,
                    "using_user_setting": request.args.get("days") is None,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[preview_all_upcoming] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify(
                {"error": "Failed to preview upcoming transactions. Please try again."}
            ),
            500,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
