"""
Bloom - Test Configuration

Pytest fixtures and configuration for backend tests.
Sets up test database, test client, and common fixtures.
"""

import pytest
from backend.app import create_app
from backend.models.database import db
from backend.config import Config


class TestConfig(Config):
    """Test configuration - uses in-memory SQLite"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_SECRET_KEY = 'test-secret-key-for-testing-only'
    WTF_CSRF_ENABLED = False
    RATELIMIT_ENABLED = False  # Disable rate limiting for tests


@pytest.fixture(scope='function')
def app():
    """Create Flask app for testing"""
    app = create_app()
    app.config.from_object(TestConfig)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def auth_headers(client):
    """Register and login a test user, return auth headers"""
    # Register and use token directly from registration
    register_response = client.post('/api/v1/auth/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'TestPassword123!'
    })

    if register_response.status_code == 201:
        # Registration successful, use that token
        token = register_response.json['access_token']
        return {'Authorization': f'Bearer {token}'}

    # If registration failed, try login (user might exist)
    login_response = client.post('/api/v1/auth/login', json={
        'email': 'test@example.com',
        'password': 'TestPassword123!'
    })

    if login_response.status_code != 200:
        raise Exception(
            f"Auth failed - Register: {register_response.status_code}, Login: {login_response.status_code}")

    token = login_response.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture(scope='function')
def test_user(client, auth_headers):
    """Return test user info"""
    response = client.get('/api/v1/auth/user', headers=auth_headers)
    return response.json


@pytest.fixture(scope='function')
def salary_period(client, auth_headers):
    """Create a test salary period"""
    response = client.post('/api/v1/salary-periods', json={
        'start_date': '2025-11-20',
        'debit_balance': 500000,  # €5000
        'credit_balance': 100000,  # €1000 available
        'credit_limit': 150000,  # €1500 limit
        'credit_allowance': 30000,  # €300 per week
        'fixed_bills': []
    }, headers=auth_headers)

    if response.status_code != 201:
        raise Exception(
            f"Failed to create salary period: {response.status_code} - {response.json}")

    # Return just the salary period data
    return response.json.get('salary_period', response.json)
