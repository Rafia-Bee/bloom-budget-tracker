"""
Bloom - Flask Application

This is the main Flask application entry point.
Initializes the app, database, and registers routes.

Functions:
- create_app: Factory function to create and configure Flask app
"""

import os
import time
from flask import Flask, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.config import config
from backend.models.database import db
from backend.routes.api_v1 import create_v1_blueprint
from backend.routes.auth import auth_bp
from backend.routes.expenses import expenses_bp
from backend.routes.income import income_bp
from backend.routes.budget_periods import budget_periods_bp
from backend.routes.debts import debts_bp
from backend.routes.recurring_expenses import recurring_expenses_bp
from backend.routes.recurring_generation import recurring_generation_bp
from backend.routes.salary_periods import salary_periods_bp
from backend.routes.password_reset import password_reset_bp
from backend.routes.export_import import export_import_bp


def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Validate production secrets (warn but don't fail during import for development)
    if config_name == "production":
        secret_key = os.getenv("SECRET_KEY")
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        if not secret_key or secret_key == "dev-secret-key-change-in-production":
            print("WARNING: SECRET_KEY not properly set in production!")
        if not jwt_secret or jwt_secret == "jwt-secret-key-change-in-production":
            print("WARNING: JWT_SECRET_KEY not properly set in production!")

    # CORS configuration - restrict to frontend domain only
    cors_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3000,http://localhost:3001",
    ).split(",")
    CORS(app, origins=cors_origins, supports_credentials=True)

    db.init_app(app)

    jwt = JWTManager(app)

    # Register versioned API (v1)
    v1_bp = create_v1_blueprint()
    app.register_blueprint(v1_bp)

    # Keep legacy routes for backward compatibility (will deprecate later)
    app.register_blueprint(auth_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(income_bp, url_prefix="/income")
    app.register_blueprint(budget_periods_bp)
    app.register_blueprint(debts_bp)
    app.register_blueprint(recurring_expenses_bp, url_prefix="/recurring-expenses")
    app.register_blueprint(recurring_generation_bp, url_prefix="/recurring-generation")
    app.register_blueprint(salary_periods_bp, url_prefix="/salary-periods")
    app.register_blueprint(password_reset_bp, url_prefix="/auth")
    app.register_blueprint(export_import_bp)

    with app.app_context():
        db.create_all()

    # DEVELOPMENT ONLY: Simulate cold start delay (only on first request)
    first_request_done = {"value": False}

    @app.before_request
    def simulate_cold_start():
        if config_name == "development" and os.getenv("SIMULATE_COLD_START") == "true":
            if (
                not first_request_done["value"]
                and request.path != "/"
                and not request.path.startswith("/auth/")
            ):
                first_request_done["value"] = True
                print(f"Simulating cold start delay for: {request.path}")
                time.sleep(4)

    # Security headers
    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content Security Policy
        csp_policy = (
            "default-src 'self'; "
            f"connect-src 'self' {' '.join(cors_origins)}; "
            "img-src 'self' data: blob:; "
            "media-src 'self' blob:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "font-src 'self' data:; "
            "frame-ancestors 'none'; "
            "form-action 'self'; "
            "base-uri 'self';"
        )
        response.headers["Content-Security-Policy"] = csp_policy

        if config_name == "production":
            response.headers[
                "Strict-Transport-Security"
            ] = "max-age=31536000; includeSubDomains"
        return response

    @app.route("/")
    def index():
        return {"message": "Bloom API - Financial Habits That Grow With You"}

    return app


# Create app instance for gunicorn
# Determine environment from FLASK_ENV or default to production for deployed environments
config_name = os.getenv("FLASK_ENV", "production")
app = create_app(config_name)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
