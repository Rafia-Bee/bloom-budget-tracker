"""
Bloom - Password Reset Routes

Handles password reset functionality including token generation and validation.
"""

import secrets
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app
from backend.models.database import db, User, PasswordResetToken
from backend.utils.validators import validate_email, validate_password_strength
from backend.utils.rate_limiter import rate_limit
from backend.services.email_service import email_service
from sqlalchemy.exc import SQLAlchemyError

password_reset_bp = Blueprint("password_reset", __name__)


@password_reset_bp.route("/forgot-password", methods=["POST"])
@rate_limit("password_reset.forgot_password")
def forgot_password():
    """Request a password reset token for the given email address."""
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()

        # Validate email format
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            # Don't reveal whether email exists for security
            return (
                jsonify(
                    {
                        "message": "If an account exists with this email, a password reset link has been sent."
                    }
                ),
                200,
            )

        # Deactivate any existing reset tokens for this user
        PasswordResetToken.query.filter_by(user_id=user.id, is_used=False).update(
            {"is_used": True}
        )

        # Generate a secure random token
        token = secrets.token_urlsafe(32)

        # Create reset token (expires in 1 hour)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )

        db.session.add(reset_token)
        db.session.commit()

        # Send password reset email
        frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
        email_result = email_service.send_password_reset_email(
            to_email=user.email, reset_token=token, frontend_url=frontend_url
        )

        # Log email sending result but don't expose it to user
        if not email_result.get("success"):
            current_app.logger.error(
                f"Failed to send password reset email: {email_result.get('error')}"
            )

        # Always return success message for security (don't reveal if email exists)
        response_data = {
            "message": "If an account exists with this email, a password reset link has been sent."
        }

        # Security fix (#82): Never include token in response
        # Development testing should use proper email service or check server logs
        if current_app.config.get("DEBUG"):
            # Log without exposing token value
            current_app.logger.info(
                f"Development mode: Password reset email sent to {user.email}"
            )

        return jsonify(response_data), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"Database error processing password reset request: {e}",
            exc_info=True,
        )
        return (
            jsonify({"error": "An error occurred while processing your request"}),
            500,
        )


@password_reset_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset password using a valid token."""
    try:
        # Cleanup expired tokens before processing (on-access cleanup)
        from backend.services.cleanup_service import cleanup_service

        try:
            cleanup_service.cleanup_expired_password_reset_tokens(hours_old=24)
        except SQLAlchemyError as cleanup_error:
            current_app.logger.warning(
                f"Token cleanup failed but continuing with reset: {cleanup_error}"
            )

        data = request.get_json()
        token = data.get("token", "").strip()
        new_password = data.get("password", "")

        # Validate input
        if not token:
            return jsonify({"error": "Reset token is required"}), 400

        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({"error": error_msg}), 400

        # Find valid, unused token
        reset_token = PasswordResetToken.query.filter_by(
            token=token, is_used=False
        ).first()

        if not reset_token:
            return jsonify({"error": "Invalid or expired reset token"}), 400

        # Check if token has expired
        if reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(
            timezone.utc
        ):
            return jsonify({"error": "Reset token has expired"}), 400

        # Get the user
        user = db.session.get(User, reset_token.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 400

        # Check if new password is the same as current password
        if user.check_password(new_password):
            return (
                jsonify(
                    {
                        "error": "New password must be different from your current password"
                    }
                ),
                400,
            )

        # Update user's password
        user.set_password(new_password)

        # Mark token as used
        reset_token.is_used = True

        db.session.commit()

        return jsonify({"message": "Password successfully reset"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"Database error resetting password: {e}",
            exc_info=True,
        )
        return (
            jsonify({"error": "An error occurred while resetting your password"}),
            500,
        )


@password_reset_bp.route("/validate-reset-token", methods=["POST"])
def validate_reset_token():
    """Validate if a reset token is still valid."""
    try:
        data = request.get_json()
        token = data.get("token", "").strip()

        if not token:
            return jsonify({"error": "Token is required"}), 400

        # Find valid, unused token
        reset_token = PasswordResetToken.query.filter_by(
            token=token, is_used=False
        ).first()

        if not reset_token:
            return jsonify({"valid": False, "error": "Invalid token"}), 200

        # Check if token has expired
        if reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(
            timezone.utc
        ):
            return jsonify({"valid": False, "error": "Token has expired"}), 200

        return jsonify({"valid": True}), 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error validating reset token: {e}",
            exc_info=True,
        )
        return jsonify({"error": "An error occurred while validating the token"}), 500
