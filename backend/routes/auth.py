"""
Bloom - Authentication Routes

This module handles user authentication endpoints.

Endpoints:
- POST /auth/register: Create new user account
- POST /auth/login: Authenticate and get JWT token
- POST /auth/refresh: Refresh access token
- GET /auth/me: Get current user info
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from backend.models.database import db, User, UserDefaults, CreditCardSettings
from backend.utils.rate_limiter import rate_limit
from backend.services.email_service import email_service

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/register", methods=["POST"])
@rate_limit("auth.register")
def register():
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    # Validate email format
    email = data["email"].strip().lower()
    if len(email) > 120 or "@" not in email:
        return jsonify({"error": "Invalid email format"}), 400

    # Validate password strength
    password = data["password"]
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    defaults = UserDefaults(user_id=user.id)
    credit_settings = CreditCardSettings(user_id=user.id)

    db.session.add(defaults)
    db.session.add(credit_settings)
    db.session.commit()

    # Send welcome email
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    email_result = email_service.send_welcome_email(
        to_email=user.email, user_name=user.email, frontend_url=frontend_url
    )

    # Log email result but don't block registration if email fails
    if email_result.get("success"):
        current_app.logger.info(f"Welcome email sent to {user.email}")
    else:
        current_app.logger.warning(
            f"Failed to send welcome email to {user.email}: {email_result.get('error')}"
        )

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return (
        jsonify(
            {
                "message": "User created successfully",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {"id": user.id, "email": user.email},
            }
        ),
        201,
    )


@auth_bp.route("/login", methods=["POST"])
@rate_limit("auth.login")
def login():
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    email = data["email"].strip().lower()
    user = User.query.filter_by(email=email).first()

    # Check if account exists
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Check if account is locked
    if user.is_locked():
        lockout_time = (
            user.locked_until.strftime("%H:%M") if user.locked_until else "unknown"
        )
        return (
            jsonify(
                {
                    "error": f"Account locked due to too many failed login attempts. Please try again after {lockout_time}."
                }
            ),
            403,
        )

    # Verify password
    if not user.check_password(data["password"]):
        # Increment failed attempts
        user.failed_login_attempts += 1

        # Lock account if threshold reached (5 attempts)
        MAX_FAILED_ATTEMPTS = 5
        LOCKOUT_MINUTES = 15

        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
            db.session.commit()

            # Send email notification
            try:
                email_service.send_account_lockout_email(
                    to_email=user.email, lockout_minutes=LOCKOUT_MINUTES
                )
            except Exception as e:
                current_app.logger.error(
                    f"Failed to send lockout email to {user.email}: {str(e)}"
                )

            return (
                jsonify(
                    {
                        "error": f"Account locked due to too many failed login attempts. Please try again in {LOCKOUT_MINUTES} minutes."
                    }
                ),
                403,
            )

        db.session.commit()
        remaining_attempts = MAX_FAILED_ATTEMPTS - user.failed_login_attempts
        return (
            jsonify(
                {
                    "error": f"Invalid email or password. {remaining_attempts} attempt(s) remaining before account lockout."
                }
            ),
            401,
        )

    # Successful login - reset failed attempts
    user.reset_failed_attempts()
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return (
        jsonify(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {"id": user.id, "email": user.email},
            }
        ),
        200,
    )


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(current_user_id))

    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return (
        jsonify(
            {
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at.isoformat(),
            }
        ),
        200,
    )
