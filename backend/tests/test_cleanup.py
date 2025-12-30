"""
Bloom - Cleanup Service Tests

Test cleanup functionality for expired tokens and other database maintenance.
"""


from datetime import datetime, timedelta, timezone
from backend.models.database import PasswordResetToken, User
from backend.services.cleanup_service import cleanup_service


class TestPasswordResetTokenCleanup:
    """Test password reset token cleanup functionality"""

    def test_cleanup_expired_tokens(self, client, app):
        """Cleanup should remove tokens expired > 24 hours ago"""
        with app.app_context():
            # Create a test user
            user = User(email="cleanup_test@example.com")
            user.set_password("TestPass123!")
            from backend.models.database import db

            db.session.add(user)
            db.session.commit()

            # Create expired tokens (25 hours old)
            old_expired_token = PasswordResetToken(
                user_id=user.id,
                token="old_expired_token",
                expires_at=datetime.now(timezone.utc) - timedelta(hours=25),
                is_used=False,
            )

            # Create recently expired token (1 hour old - should NOT be deleted)
            recent_expired_token = PasswordResetToken(
                user_id=user.id,
                token="recent_expired_token",
                expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
                is_used=False,
            )

            # Create valid token (should NOT be deleted)
            valid_token = PasswordResetToken(
                user_id=user.id,
                token="valid_token",
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                is_used=False,
            )

            db.session.add_all([old_expired_token, recent_expired_token, valid_token])
            db.session.commit()

            # Run cleanup (default: 24 hours)
            deleted_count = cleanup_service.cleanup_expired_password_reset_tokens(
                hours_old=24
            )

            # Should delete only the old expired token
            assert deleted_count == 1

            # Verify tokens
            assert (
                PasswordResetToken.query.filter_by(token="old_expired_token").first()
                is None
            )
            assert (
                PasswordResetToken.query.filter_by(token="recent_expired_token").first()
                is not None
            )
            assert (
                PasswordResetToken.query.filter_by(token="valid_token").first()
                is not None
            )

    def test_cleanup_used_tokens(self, client, app):
        """Cleanup should remove used tokens older than specified days"""
        with app.app_context():
            # Create a test user
            user = User(email="cleanup_used@example.com")
            user.set_password("TestPass123!")
            from backend.models.database import db

            db.session.add(user)
            db.session.commit()

            # Create old used token (8 days old - should be deleted)
            old_used_token = PasswordResetToken(
                user_id=user.id,
                token="old_used_token",
                expires_at=datetime.now(timezone.utc) - timedelta(days=8),
                is_used=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=8),
            )

            # Create recent used token (3 days old - should NOT be deleted)
            recent_used_token = PasswordResetToken(
                user_id=user.id,
                token="recent_used_token",
                expires_at=datetime.now(timezone.utc) - timedelta(days=3),
                is_used=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=3),
            )

            # Create unused token (should NOT be deleted)
            unused_token = PasswordResetToken(
                user_id=user.id,
                token="unused_token",
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                is_used=False,
            )

            db.session.add_all([old_used_token, recent_used_token, unused_token])
            db.session.commit()

            # Run cleanup (default: 7 days)
            deleted_count = cleanup_service.cleanup_used_password_reset_tokens(
                days_old=7
            )

            # Should delete only the old used token
            assert deleted_count == 1

            # Verify tokens
            assert (
                PasswordResetToken.query.filter_by(token="old_used_token").first()
                is None
            )
            assert (
                PasswordResetToken.query.filter_by(token="recent_used_token").first()
                is not None
            )
            assert (
                PasswordResetToken.query.filter_by(token="unused_token").first()
                is not None
            )

    def test_cleanup_all_tokens(self, client, app):
        """Cleanup all should remove both expired and used tokens"""
        with app.app_context():
            # Create a test user
            user = User(email="cleanup_all@example.com")
            user.set_password("TestPass123!")
            from backend.models.database import db

            db.session.add(user)
            db.session.commit()

            # Create old expired token
            old_expired = PasswordResetToken(
                user_id=user.id,
                token="old_expired",
                expires_at=datetime.now(timezone.utc) - timedelta(hours=25),
                is_used=False,
            )

            # Create old used token (not expired, but used 8 days ago)
            old_used = PasswordResetToken(
                user_id=user.id,
                token="old_used",
                expires_at=datetime.now(timezone.utc)
                + timedelta(days=30),  # Still valid
                is_used=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=8),
            )

            # Create valid token
            valid = PasswordResetToken(
                user_id=user.id,
                token="valid",
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                is_used=False,
            )

            db.session.add_all([old_expired, old_used, valid])
            db.session.commit()

            # Run full cleanup
            results = cleanup_service.cleanup_all_password_reset_tokens()

            # Should delete both old expired and old used
            assert results["expired_tokens_deleted"] == 1
            assert results["used_tokens_deleted"] == 1
            assert results["total_deleted"] == 2

            # Verify tokens
            assert (
                PasswordResetToken.query.filter_by(token="old_expired").first() is None
            )
            assert PasswordResetToken.query.filter_by(token="old_used").first() is None
            assert PasswordResetToken.query.filter_by(token="valid").first() is not None

    def test_cleanup_empty_table(self, client, app):
        """Cleanup should handle empty table gracefully"""
        with app.app_context():
            from backend.models.database import db, PasswordResetToken

            # Ensure table is empty
            PasswordResetToken.query.delete()
            db.session.commit()

            # Run cleanup
            deleted_count = cleanup_service.cleanup_expired_password_reset_tokens()

            # Should return 0
            assert deleted_count == 0

    def test_on_access_cleanup_during_reset(self, client, app):
        """Password reset endpoint should trigger cleanup"""
        with app.app_context():
            from backend.models.database import db

            # Create a test user
            user = User(email="onaccess@example.com")
            user.set_password("OldPass123!")
            db.session.add(user)
            db.session.commit()

            # Create old expired token (should be cleaned up)
            old_token = PasswordResetToken(
                user_id=user.id,
                token="old_token",
                expires_at=datetime.now(timezone.utc) - timedelta(hours=25),
                is_used=False,
            )

            # Create valid token for reset
            valid_token = PasswordResetToken(
                user_id=user.id,
                token="valid_token",
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
                is_used=False,
            )

            db.session.add_all([old_token, valid_token])
            db.session.commit()

            # Reset password (should trigger cleanup)
            response = client.post(
                "/auth/reset-password",
                json={"token": "valid_token", "password": "NewPass123!"},
            )

            assert response.status_code == 200

            # Old token should have been cleaned up
            assert PasswordResetToken.query.filter_by(token="old_token").first() is None

            # Valid token should be marked as used
            used_token = PasswordResetToken.query.filter_by(token="valid_token").first()
            assert used_token is not None
            assert used_token.is_used is True
