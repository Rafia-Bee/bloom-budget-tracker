"""
Bloom - Cleanup Service

Handles periodic cleanup tasks like removing expired password reset tokens.
"""

import logging
from datetime import datetime, timedelta
from backend.models.database import db, PasswordResetToken

logger = logging.getLogger(__name__)


class CleanupService:
    """Service for database cleanup operations."""

    @staticmethod
    def cleanup_expired_password_reset_tokens(hours_old=24):
        """
        Delete expired password reset tokens older than specified hours.

        Args:
            hours_old: Delete tokens expired for this many hours (default: 24)

        Returns:
            int: Number of tokens deleted

        Raises:
            Exception: If cleanup fails
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours_old)

            # Delete tokens that expired before cutoff time
            deleted_count = PasswordResetToken.query.filter(
                PasswordResetToken.expires_at < cutoff_time
            ).delete()

            db.session.commit()

            logger.info(
                f"Cleaned up {deleted_count} expired password reset tokens "
                f"(older than {hours_old} hours)"
            )

            return deleted_count

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to cleanup expired password reset tokens: {str(e)}")
            raise

    @staticmethod
    def cleanup_used_password_reset_tokens(days_old=7):
        """
        Delete used password reset tokens older than specified days.

        Args:
            days_old: Delete used tokens older than this many days (default: 7)

        Returns:
            int: Number of tokens deleted

        Raises:
            Exception: If cleanup fails
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=days_old)

            # Delete used tokens created before cutoff time
            deleted_count = PasswordResetToken.query.filter(
                PasswordResetToken.is_used == True,
                PasswordResetToken.created_at < cutoff_time,
            ).delete()

            db.session.commit()

            logger.info(
                f"Cleaned up {deleted_count} used password reset tokens "
                f"(older than {days_old} days)"
            )

            return deleted_count

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to cleanup used password reset tokens: {str(e)}")
            raise

    @staticmethod
    def cleanup_all_password_reset_tokens():
        """
        Run all password reset token cleanup operations.

        Returns:
            dict: Summary of cleanup operations
        """
        results = {
            "expired_tokens_deleted": 0,
            "used_tokens_deleted": 0,
            "total_deleted": 0,
        }

        try:
            # Cleanup expired tokens (older than 24 hours)
            results[
                "expired_tokens_deleted"
            ] = CleanupService.cleanup_expired_password_reset_tokens(hours_old=24)

            # Cleanup used tokens (older than 7 days)
            results["used_tokens_deleted"] = CleanupService.cleanup_used_password_reset_tokens(
                days_old=7
            )

            results["total_deleted"] = (
                results["expired_tokens_deleted"] + results["used_tokens_deleted"]
            )

            logger.info(f"Total cleanup completed: {results['total_deleted']} tokens deleted")

            return results

        except Exception as e:
            logger.error(f"Cleanup operation failed: {str(e)}")
            raise


# Create singleton instance
cleanup_service = CleanupService()
