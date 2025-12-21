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
from backend.app import create_app
from backend.models.database import db
from backend.config import Config


class TestConfig(Config):
    """Test configuration - uses in-memory SQLite"""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-secret-key-for-testing-only"
    WTF_CSRF_ENABLED = False
    RATELIMIT_ENABLED = False  # Disable rate limiting for tests
    # Disable SendGrid to prevent real emails
    SENDGRID_API_KEY = None


# SAFETY: Force DATABASE_URL to in-memory DB IMMEDIATELY when conftest is imported
# This prevents test discovery from accidentally using the real database
os.environ["DATABASE_URL"] = "sqlite:///:memory:"


@pytest.fixture(scope="function", autouse=True)
def disable_sendgrid():
    """Ensure SendGrid is disabled for ALL tests by removing API key from environment"""
    original_key = os.environ.get("SENDGRID_API_KEY")
    if "SENDGRID_API_KEY" in os.environ:
        del os.environ["SENDGRID_API_KEY"]
    yield
    if original_key:
        os.environ["SENDGRID_API_KEY"] = original_key


@pytest.fixture(scope="function")
def app(disable_sendgrid):
    """Create Flask app for testing with email service properly mocked"""
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

        # CRITICAL FIX: Set DATABASE_URL before creating app to force in-memory DB
        original_db_url = os.environ.get("DATABASE_URL")
        os.environ["DATABASE_URL"] = "sqlite:///:memory:"

        app = create_app()
        app.config.from_object(TestConfig)

        with app.app_context():
            # Clear rate limiter state before each test
            from backend.utils.rate_limiter import _request_history

            _request_history.clear()

            db.create_all()
            yield app
            db.session.remove()
            db.drop_all()

        # Restore original DATABASE_URL
        if original_db_url:
            os.environ["DATABASE_URL"] = original_db_url
        elif "DATABASE_URL" in os.environ:
            del os.environ["DATABASE_URL"]


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
