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
from flask_migrate import Migrate
from flask_talisman import Talisman
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from backend.config import config, _validate_production_secrets
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
from backend.routes.admin import admin_bp
from backend.routes.subcategories import subcategories_bp


def _check_pending_migrations(app):
    """
    Check if there are any pending database migrations.
    Raises RuntimeError if database is out of sync in production.
    """
    with app.app_context():
        try:
            # Get current revision from database
            conn = db.engine.connect()
            context = MigrationContext.configure(conn)
            current_rev = context.get_current_revision()

            # Get head revision from migration scripts
            # Migrations are in backend/migrations
            migrations_dir = os.path.join(app.root_path, "migrations")
            script = ScriptDirectory(migrations_dir)
            head_rev = script.get_current_head()

            if current_rev != head_rev:
                app.logger.warning(
                    f"Database schema out of sync! DB: {current_rev}, Code: {head_rev}"
                )
                # In production, we want to fail fast to prevent data corruption
                if app.config.get("ENV") == "production":
                    raise RuntimeError(
                        f"Pending migrations detected! DB: {current_rev}, Code: {head_rev}. "
                        "Please run migrations before starting the server."
                    )
            else:
                app.logger.info(
                    f"Database schema is up to date (Revision: {current_rev})"
                )

        except Exception as e:
            # Don't block startup if check fails (e.g. first run or DB not ready), but log it
            app.logger.warning(f"Failed to check migration status: {str(e)}")


def create_app(config_name="development"):
    # Validate production secrets before app creation
    if config_name == "production":
        _validate_production_secrets()

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # CRITICAL: Set database URI dynamically to support test isolation
    # This must happen AFTER from_object but BEFORE db.init_app
    from backend.config import Config

    app.config["SQLALCHEMY_DATABASE_URI"] = Config.get_database_uri()
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = Config.get_engine_options()

    # Production secret validation is now handled before app creation
    # Development mode allows weak defaults for convenience

    # CORS configuration - allow local network access for mobile testing
    # Add your computer's IP address (e.g., http://192.168.1.100:3000)
    cors_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000",
    ).split(",")

    # For development mobile testing, add specific local network IPs via env var
    # Usage: set DEV_MOBILE_ORIGINS=http://192.168.1.100:3000,http://192.168.1.100:3001
    # SECURITY: Removed wildcard (*) to prevent accidental production exposure
    if config_name == "development":
        dev_mobile = os.getenv("DEV_MOBILE_ORIGINS", "")
        if dev_mobile:
            for origin in dev_mobile.split(","):
                origin = origin.strip()
                # Only allow local network patterns (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
                if origin.startswith(("http://192.168.", "http://10.", "http://172.")):
                    cors_origins.append(origin)

    CORS(app, origins=cors_origins, supports_credentials=True)

    db.init_app(app)

    # Security headers with Flask-Talisman (production only)
    if config_name == "production":
        Talisman(
            app,
            force_https=True,
            strict_transport_security=True,
            strict_transport_security_max_age=31536000,  # 1 year
            content_security_policy={
                "default-src": "'self'",
                "script-src": "'self'",
                "style-src": "'self' 'unsafe-inline'",  # Tailwind needs inline styles
                "img-src": "'self' data: blob:",
                "font-src": "'self'",
                "connect-src": "'self' https://bloom-backend-b44r.onrender.com",
            },
            frame_options="DENY",
            # Note: content_type_nosniff removed in Flask-Talisman 1.1.0 (now always enabled)
        )

    # Check for pending migrations (Issue #124)
    _check_pending_migrations(app)

    # Configure JWT for httpOnly cookies (#80)
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
    app.config["JWT_COOKIE_SECURE"] = not app.config.get(
        "DEBUG", False
    )  # HTTPS only in production
    app.config["JWT_ACCESS_COOKIE_PATH"] = "/"
    app.config["JWT_REFRESH_COOKIE_PATH"] = "/auth/refresh"
    # CSRF protection disabled for cross-origin setup (Issue #122)
    # Security rationale: SameSite=Lax + CORS already prevents CSRF attacks
    # The CSRF cookie cannot be read cross-origin (frontend on bloom-tracker.app,
    # backend on onrender.com), causing 401 errors on POST requests.
    # SameSite=Lax prevents cross-site request forgery by refusing to send
    # cookies on cross-origin POST requests from third-party sites.
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    # SameSite=Lax: Prevents CSRF while allowing same-site navigation
    app.config["JWT_COOKIE_SAMESITE"] = "Lax"

    # Flask-Migrate: migrations folder is in backend/migrations
    migrate = Migrate(app, db, directory="backend/migrations")

    jwt = JWTManager(app)

    # Register versioned API (v1)
    v1_bp = create_v1_blueprint()
    app.register_blueprint(v1_bp)

    # Database tables are now managed by Flask-Migrate
    # with app.app_context():
    #     db.create_all()

    # DEVELOPMENT ONLY: Simulate cold start delay (only on first request)
    first_request_done = {"value": False}

    @app.before_request
    def before_request_handler():
        # Store request start time for performance monitoring
        request.start_time = time.time()

        # Simulate cold start (development only)
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
        # Log slow requests (>1 second) for performance monitoring
        if hasattr(request, "start_time"):
            duration = time.time() - request.start_time
            if duration > 1.0:
                app.logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"took {duration:.2f}s (status: {response.status_code})"
                )

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Don't set CSP for API-only backend
        # Frontend (Cloudflare Pages) should set its own CSP if needed

        if config_name == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response

    @app.route("/")
    def index():
        return {"message": "Bloom API - Financial Habits That Grow With You"}

    return app


# Create app instance for gunicorn
# Determine environment from FLASK_ENV. For local dev, run.py passes 'development' explicitly.
# For production (Render), DATABASE_URL indicates production environment.
database_url = os.getenv("DATABASE_URL", "")
if "postgresql" in database_url:
    # Production environment (Neon PostgreSQL)
    config_name = "production"
else:
    # Local development (SQLite)
    config_name = os.getenv("FLASK_ENV", "development")

app = create_app(config_name)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
