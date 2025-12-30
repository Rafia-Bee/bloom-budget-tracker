"""
Bloom - Test Configuration

Pytest fixtures and configuration for backend tests.
Sets up test database, test client, and common fixtures.

🛡️ SERVICE QUOTA PROTECTION:
- Uses in-memory SQLite (no Neon DB usage)
- Mocks EmailService globally (no SendGrid emails)
- Disables rate limiting (RATELIMIT_ENABLED = False)
- Safe to run unlimited times - zero service consumption
"""

import pytest
import os
from unittest.mock import patch, MagicMock

# CRITICAL: Set TESTING=1 BEFORE any imports that load config
# This tells Config.get_database_uri() to use in-memory SQLite
os.environ["TESTING"] = "1"

from backend.app import create_app
from backend.models.database import db


class TestConfig:
    """
    Test configuration values to apply after app creation.
    Database URI is handled by Config.get_database_uri() based on TESTING env var.
    """

    TESTING = True
    DEBUG = True

    # JWT config
    SECRET_KEY = "test-secret-key-for-testing-only"
    JWT_SECRET_KEY = "test-jwt-secret-key-for-testing-only"
    from datetime import timedelta

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=1)

    # JWT Cookie config (matches app.py settings)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = False  # HTTP OK in tests
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_REFRESH_COOKIE_PATH = "/auth/refresh"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_COOKIE_SAMESITE = "Lax"

    # Disable features that could cause issues
    WTF_CSRF_ENABLED = False
    RATELIMIT_ENABLED = False

    # Disable email
    SENDGRID_API_KEY = None
    SENDGRID_FROM_EMAIL = "test@test.com"
    FRONTEND_URL = "http://localhost:3000"


@pytest.fixture(scope="function", autouse=True)
def isolate_environment():
    """
    Ensure test environment is completely isolated from development.
    Runs automatically before each test.
    """
    # Store original values
    original_env = {
        "TESTING": os.environ.get("TESTING"),
        "SENDGRID_API_KEY": os.environ.get("SENDGRID_API_KEY"),
    }

    # Force test environment
    os.environ["TESTING"] = "1"
    if "SENDGRID_API_KEY" in os.environ:
        del os.environ["SENDGRID_API_KEY"]

    yield

    # Restore original environment (keep TESTING=1 for other tests in session)
    if original_env["SENDGRID_API_KEY"] is not None:
        os.environ["SENDGRID_API_KEY"] = original_env["SENDGRID_API_KEY"]


@pytest.fixture(scope="function")
def app(isolate_environment):
    """Create Flask app for testing with completely isolated database"""
    # Patch the email service at the routes level to prevent ANY emails
    with patch("backend.routes.auth.email_service") as mock_auth_email, patch(
        "backend.routes.password_reset.email_service"
    ) as mock_pwd_email, patch(
        "backend.services.email_service.email_service"
    ) as mock_service:
        # Configure all mocks to return success without sending emails
        for mock in [mock_auth_email, mock_pwd_email, mock_service]:
            mock.enabled = False
            mock.send_email.return_value = {
                "success": True,
                "status_code": 200,
                "message": "Mocked email (not actually sent)",
            }
            mock.send_welcome_email.return_value = {
                "success": True,
                "status_code": 200,
                "message": "Mocked email (not actually sent)",
            }
            mock.send_password_reset_email.return_value = {
                "success": True,
                "status_code": 200,
                "message": "Mocked email (not actually sent)",
            }

        # Create app - Config.get_database_uri() will return in-memory SQLite
        # because TESTING=1 is set
        app = create_app("development")

        # Apply additional test config values
        app.config["TESTING"] = True
        app.config["DEBUG"] = True
        app.config["RATELIMIT_ENABLED"] = False
        for key in dir(TestConfig):
            if key.isupper():
                app.config[key] = getattr(TestConfig, key)

        with app.app_context():
            # Verify we're using in-memory database (safety check)
            uri = str(db.engine.url)
            assert (
                ":memory:" in uri or uri == "sqlite://"
            ), f"SAFETY CHECK FAILED: Using real database! URI: {uri}"

            # Create fresh tables in in-memory database
            db.create_all()

            yield app

            # Cleanup - safe because it's in-memory
            db.session.remove()
            db.drop_all()


@pytest.fixture(scope="function")
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope="function")
def auth_headers(client):
    """Register and login a test user, return empty dict (auth via cookies)"""
    # Register user - tokens set in httpOnly cookies automatically
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    if register_response.status_code == 201:
        # Registration successful, cookies are set automatically in test client
        # Return empty dict since auth is now cookie-based
        return {}

    # If registration failed, try login (user might exist)
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "TestPassword123!"},
    )

    if login_response.status_code != 200:
        raise Exception(
            f"Auth failed - Register: {register_response.status_code}, Login: {login_response.status_code}"
        )

    # Return empty dict since auth is now cookie-based
    return {}


@pytest.fixture(scope="function")
def test_user(client, auth_headers):
    """Return test user info"""
    response = client.get("/api/v1/auth/user", headers=auth_headers)
    return response.json


@pytest.fixture(scope="function")
def salary_period(client, auth_headers):
    """Create a test salary period that contains today"""
    from datetime import date, timedelta

    # Create period starting 2 weeks ago (so today is in week 3)
    start_date = (date.today() - timedelta(days=14)).isoformat()

    response = client.post(
        "/api/v1/salary-periods",
        json={
            "start_date": start_date,
            "debit_balance": 500000,  # €5000
            "credit_balance": 100000,  # €1000 available
            "credit_limit": 150000,  # €1500 limit
            "credit_allowance": 30000,  # €300 per week
            "fixed_bills": [],
        },
        headers=auth_headers,
    )

    if response.status_code != 201:
        raise Exception(
            f"Failed to create salary period: {response.status_code} - {response.json}"
        )

    # Return the created period ID
    return response.json["id"]
