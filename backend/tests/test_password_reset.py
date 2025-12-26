"""
Bloom - Password Reset Routes Tests

Tests for password reset functionality including forgot password
and reset password endpoints.
"""

import pytest
import secrets
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from backend.models.database import db, User, PasswordResetToken


@pytest.fixture(scope="function")
def user_id(client, auth_headers):
    """Get the logged-in user's ID"""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    return response.json["id"]


class TestForgotPassword:
    """Tests for forgot-password endpoint"""

    def test_forgot_password_valid_email(self, client):
        """Should accept valid email and return success message"""
        with patch("backend.routes.password_reset.email_service") as mock_email_service:
            mock_email_service.send_password_reset_email.return_value = {
                "success": True
            }

            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "test@example.com"},
            )

            assert response.status_code == 200
            assert "password reset link has been sent" in response.json["message"]

    def test_forgot_password_nonexistent_email(self, client):
        """Should return same response for non-existent email (security)"""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"},
        )

        # Should return 200 with same message (don't reveal if email exists)
        assert response.status_code == 200
        assert "password reset link has been sent" in response.json["message"]

    def test_forgot_password_invalid_email_format(self, client):
        """Should reject invalid email format"""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "notanemail"},
        )

        assert response.status_code == 400
        assert "email format" in response.json["error"].lower()

    def test_forgot_password_empty_email(self, client):
        """Should reject empty email"""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": ""},
        )

        assert response.status_code == 400
        assert "email" in response.json["error"].lower()

    def test_forgot_password_creates_token(self, client, user_id):
        """Should create a password reset token in database"""
        # Get user email
        user = db.session.get(User, user_id)
        email = user.email

        with patch("backend.routes.password_reset.email_service") as mock_email_service:
            mock_email_service.send_password_reset_email.return_value = {
                "success": True
            }

            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": email},
            )

            assert response.status_code == 200

            # Verify token was created
            token = PasswordResetToken.query.filter_by(
                user_id=user_id, is_used=False
            ).first()
            assert token is not None
            assert token.expires_at > datetime.utcnow()

    def test_forgot_password_invalidates_old_tokens(self, client, user_id):
        """Should invalidate any existing tokens for the user"""
        user = db.session.get(User, user_id)
        email = user.email

        # Create an existing token
        old_token = PasswordResetToken(
            user_id=user_id,
            token="old_token_123",
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(old_token)
        db.session.commit()
        old_token_id = old_token.id

        with patch("backend.routes.password_reset.email_service") as mock_email_service:
            mock_email_service.send_password_reset_email.return_value = {
                "success": True
            }

            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": email},
            )

            assert response.status_code == 200

            # Verify old token was marked as used
            old_token = db.session.get(PasswordResetToken, old_token_id)
            assert old_token.is_used is True

    def test_forgot_password_sends_email(self, client, user_id):
        """Should call email service with correct parameters"""
        user = db.session.get(User, user_id)
        email = user.email

        with patch("backend.routes.password_reset.email_service") as mock_email_service:
            mock_email_service.send_password_reset_email.return_value = {
                "success": True
            }

            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": email},
            )

            assert response.status_code == 200
            # Verify email service was called
            mock_email_service.send_password_reset_email.assert_called_once()
            call_kwargs = mock_email_service.send_password_reset_email.call_args.kwargs
            assert call_kwargs["to_email"] == email
            assert "reset_token" in call_kwargs

    def test_forgot_password_email_failure_still_returns_success(self, client, user_id):
        """Should return success even if email fails (security)"""
        user = db.session.get(User, user_id)
        email = user.email

        with patch("backend.routes.password_reset.email_service") as mock_email_service:
            mock_email_service.send_password_reset_email.return_value = {
                "success": False,
                "error": "SMTP failure",
            }

            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": email},
            )

            # Should still return 200 to not leak info
            assert response.status_code == 200


class TestResetPassword:
    """Tests for reset-password endpoint"""

    def test_reset_password_success(self, client, user_id):
        """Should reset password with valid token"""
        # Create a valid reset token
        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(reset_token)
        db.session.commit()

        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"token": token_value, "password": "newpassword123"},
            )

            assert response.status_code == 200
            assert "successfully reset" in response.json["message"]

            # Verify token is now used
            token = db.session.get(PasswordResetToken, reset_token.id)
            assert token.is_used is True

    def test_reset_password_invalid_token(self, client):
        """Should reject invalid token"""
        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"token": "invalid_token_xyz", "password": "newpassword123"},
            )

            assert response.status_code == 400
            assert "Invalid" in response.json["error"]

    def test_reset_password_expired_token(self, client, user_id):
        """Should reject expired token"""
        # Create an expired token
        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
        )
        db.session.add(reset_token)
        db.session.commit()

        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"token": token_value, "password": "newpassword123"},
            )

            assert response.status_code == 400
            assert "expired" in response.json["error"].lower()

    def test_reset_password_already_used_token(self, client, user_id):
        """Should reject already used token"""
        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() + timedelta(hours=1),
            is_used=True,  # Already used
        )
        db.session.add(reset_token)
        db.session.commit()

        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"token": token_value, "password": "newpassword123"},
            )

            assert response.status_code == 400
            assert "Invalid" in response.json["error"]

    def test_reset_password_missing_token(self, client):
        """Should reject missing token"""
        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"password": "newpassword123"},
            )

            assert response.status_code == 400
            assert "token" in response.json["error"].lower()

    def test_reset_password_short_password(self, client, user_id):
        """Should reject password shorter than 8 characters"""
        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(reset_token)
        db.session.commit()

        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"token": token_value, "password": "short"},
            )

            assert response.status_code == 400
            assert "8 characters" in response.json["error"]

    def test_reset_password_same_as_current(self, client, user_id):
        """Should reject if new password is same as current"""
        # The test user is created with password 'TestPassword123!'
        user = db.session.get(User, user_id)
        current_password = "TestPassword123!"

        # Verify the user has this password
        assert user.check_password(current_password)

        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(reset_token)
        db.session.commit()

        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"token": token_value, "password": current_password},
            )

            assert response.status_code == 400
            assert "different" in response.json["error"].lower()

    def test_reset_password_changes_password(self, client, user_id):
        """Should actually change the user's password"""
        user = db.session.get(User, user_id)
        old_password = "TestPassword123!"
        new_password = "brandnewpassword123"

        # Verify old password works
        assert user.check_password(old_password)

        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(reset_token)
        db.session.commit()

        with patch("backend.services.cleanup_service.cleanup_service") as mock_cleanup:
            mock_cleanup.cleanup_expired_password_reset_tokens.return_value = None

            response = client.post(
                "/api/v1/auth/reset-password",
                json={"token": token_value, "password": new_password},
            )

            assert response.status_code == 200

            # Refresh user from database
            db.session.refresh(user)

            # Verify new password works and old doesn't
            assert user.check_password(new_password)
            assert not user.check_password(old_password)


class TestValidateResetToken:
    """Tests for validate-reset-token endpoint"""

    def test_validate_token_valid(self, client, user_id):
        """Should return valid=true for valid token"""
        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(reset_token)
        db.session.commit()

        response = client.post(
            "/api/v1/auth/validate-reset-token",
            json={"token": token_value},
        )

        assert response.status_code == 200
        assert response.json["valid"] is True

    def test_validate_token_invalid(self, client):
        """Should return valid=false for invalid token"""
        response = client.post(
            "/api/v1/auth/validate-reset-token",
            json={"token": "nonexistent_token"},
        )

        assert response.status_code == 200
        assert response.json["valid"] is False
        assert "Invalid" in response.json.get("error", "")

    def test_validate_token_expired(self, client, user_id):
        """Should return valid=false for expired token"""
        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
        )
        db.session.add(reset_token)
        db.session.commit()

        response = client.post(
            "/api/v1/auth/validate-reset-token",
            json={"token": token_value},
        )

        assert response.status_code == 200
        assert response.json["valid"] is False
        assert "expired" in response.json.get("error", "").lower()

    def test_validate_token_already_used(self, client, user_id):
        """Should return valid=false for used token"""
        token_value = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token_value,
            expires_at=datetime.utcnow() + timedelta(hours=1),
            is_used=True,
        )
        db.session.add(reset_token)
        db.session.commit()

        response = client.post(
            "/api/v1/auth/validate-reset-token",
            json={"token": token_value},
        )

        assert response.status_code == 200
        assert response.json["valid"] is False

    def test_validate_token_missing(self, client):
        """Should reject request without token"""
        response = client.post(
            "/api/v1/auth/validate-reset-token",
            json={},
        )

        assert response.status_code == 400
        assert "required" in response.json["error"].lower()
