"""
Bloom - Authentication Tests

Test user registration, login, token refresh, and password validation.
"""

import pytest


class TestAuthRegistration:
    """Test user registration endpoint"""

    def test_register_success(self, client):
        """Valid registration should succeed"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'ValidPass123!'
        })

        assert response.status_code == 201
        assert response.json['message'] == 'User registered successfully'
        assert 'access_token' in response.json

    def test_register_duplicate_username(self, client):
        """Cannot register with existing username"""
        client.post('/api/v1/auth/register', json={
            'username': 'testuser',
            'email': 'test1@example.com',
            'password': 'TestPass123!'
        })

        response = client.post('/api/v1/auth/register', json={
            'username': 'testuser',
            'email': 'test2@example.com',
            'password': 'TestPass123!'
        })

        assert response.status_code == 400
        assert 'already exists' in response.json['error'].lower()

    def test_register_duplicate_email(self, client):
        """Cannot register with existing email"""
        client.post('/api/v1/auth/register', json={
            'username': 'user1',
            'email': 'same@example.com',
            'password': 'TestPass123!'
        })

        response = client.post('/api/v1/auth/register', json={
            'username': 'user2',
            'email': 'same@example.com',
            'password': 'TestPass123!'
        })

        assert response.status_code == 400
        assert 'already exists' in response.json['error'].lower()

    def test_register_weak_password(self, client):
        """Weak passwords should be rejected"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'weak'
        })

        assert response.status_code == 400
        assert 'password' in response.json['error'].lower()

    def test_register_missing_fields(self, client):
        """Missing required fields should fail"""
        response = client.post('/api/v1/auth/register', json={
            'username': 'testuser'
        })

        assert response.status_code == 400


class TestAuthLogin:
    """Test user login endpoint"""

    def test_login_success(self, client):
        """Valid login should succeed"""
        # Register first
        client.post('/api/v1/auth/register', json={
            'username': 'logintest',
            'email': 'login@example.com',
            'password': 'TestPass123!'
        })

        # Login
        response = client.post('/api/v1/auth/login', json={
            'username': 'logintest',
            'password': 'TestPass123!'
        })

        assert response.status_code == 200
        assert 'access_token' in response.json
        assert 'refresh_token' in response.json

    def test_login_invalid_username(self, client):
        """Login with non-existent username should fail"""
        response = client.post('/api/v1/auth/login', json={
            'username': 'nonexistent',
            'password': 'TestPass123!'
        })

        assert response.status_code == 401

    def test_login_wrong_password(self, client):
        """Login with wrong password should fail"""
        client.post('/api/v1/auth/register', json={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'CorrectPass123!'
        })

        response = client.post('/api/v1/auth/login', json={
            'username': 'testuser',
            'password': 'WrongPass123!'
        })

        assert response.status_code == 401


class TestAuthToken:
    """Test token refresh and protected endpoints"""

    def test_access_protected_route(self, client, auth_headers):
        """Protected route should work with valid token"""
        response = client.get('/api/v1/auth/user', headers=auth_headers)

        assert response.status_code == 200
        assert response.json['username'] == 'testuser'

    def test_access_without_token(self, client):
        """Protected route should fail without token"""
        response = client.get('/api/v1/auth/user')

        assert response.status_code == 401

    def test_access_with_invalid_token(self, client):
        """Protected route should fail with invalid token"""
        response = client.get('/api/v1/auth/user', headers={
            'Authorization': 'Bearer invalid-token-123'
        })

        assert response.status_code == 422
