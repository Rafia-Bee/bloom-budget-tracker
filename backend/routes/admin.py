"""
Bloom - Admin Routes

Admin endpoints for maintenance tasks. These endpoints require admin authentication.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, Income
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/remove-duplicate-initial-balances", methods=["POST"])
@jwt_required()
def remove_duplicate_initial_balances():
    """
    Remove duplicate Initial Balance entries, keeping only the earliest for each user.

    This is a one-time data cleanup for a bug that created multiple Initial Balance
    entries when creating salary periods.

    ⚠️ ADMIN ONLY - For personal app, only use this in development or when you're
    the only user. In production, use Neon SQL Editor instead.

    Returns:
        200: Success with details of removed entries
        500: Error if operation fails
    """
    try:
        current_user_id = int(get_jwt_identity())

        # Security: Only allow if user_id = 1 (the app owner)
        # Or if in development mode
        from flask import current_app

        if current_user_id != 1 and not current_app.config.get("DEBUG"):
            return (
                jsonify(
                    {
                        "error": "Unauthorized. Use Neon SQL Editor for production cleanup."
                    }
                ),
                403,
            )

        # Find all users with multiple Initial Balance entries
        users_with_duplicates = (
            db.session.query(Income.user_id, func.count(Income.id).label("count"))
            .filter(Income.type == "Initial Balance")
            .group_by(Income.user_id)
            .having(func.count(Income.id) > 1)
            .all()
        )

        if not users_with_duplicates:
            return (
                jsonify(
                    {
                        "message": "No duplicate Initial Balance entries found",
                        "deleted_count": 0,
                    }
                ),
                200,
            )

        total_deleted = 0
        details = []

        for user_id, count in users_with_duplicates:
            # Get all Initial Balance entries for this user, ordered by date
            entries = (
                Income.query.filter_by(user_id=user_id, type="Initial Balance")
                .order_by(Income.actual_date)
                .all()
            )

            # Keep the first (earliest) one
            keep_entry = entries[0]
            delete_entries = entries[1:]

            user_detail = {
                "user_id": user_id,
                "total_entries": len(entries),
                "kept": {
                    "id": keep_entry.id,
                    "amount": keep_entry.amount,
                    "date": keep_entry.actual_date.isoformat(),
                },
                "deleted": [],
            }

            for entry in delete_entries:
                user_detail["deleted"].append(
                    {
                        "id": entry.id,
                        "amount": entry.amount,
                        "date": entry.actual_date.isoformat(),
                    }
                )
                db.session.delete(entry)
                total_deleted += 1

            details.append(user_detail)

        # Commit all deletions
        db.session.commit()

        return (
            jsonify(
                {
                    "message": f"Successfully removed {total_deleted} duplicate Initial Balance entries",
                    "deleted_count": total_deleted,
                    "users_affected": len(users_with_duplicates),
                    "details": details,
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        from flask import current_app

        current_app.logger.error(
            f"Database error removing duplicate balances: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to remove duplicate balances"}), 500


@admin_bp.route("/cleanup-tokens", methods=["POST"])
@jwt_required()
def cleanup_password_reset_tokens():
    """
    Clean up expired and used password reset tokens.

    This removes:
    - Expired tokens older than 24 hours
    - Used tokens older than 7 days

    Can be run periodically to maintain database hygiene.

    Returns:
        200: Success with cleanup statistics
        500: Error if operation fails
    """
    try:
        from backend.services.cleanup_service import cleanup_service

        results = cleanup_service.cleanup_all_password_reset_tokens()

        return (
            jsonify(
                {
                    "message": "Password reset token cleanup completed",
                    "expired_tokens_deleted": results["expired_tokens_deleted"],
                    "used_tokens_deleted": results["used_tokens_deleted"],
                    "total_deleted": results["total_deleted"],
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        from flask import current_app

        current_app.logger.error(
            f"Database error during token cleanup: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Cleanup failed due to database error"}), 500
