"""
Bloom - Cleanup Service

Handles periodic cleanup tasks like removing expired password reset tokens
and permanently deleting soft-deleted records past retention period.
"""

import logging
from datetime import datetime, timezone, timedelta, timezone
from backend.models.database import (
    db,
    PasswordResetToken,
    Expense,
    Income,
    Debt,
    RecurringExpense,
    Goal,
)

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
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours_old)

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
            cutoff_time = datetime.now(timezone.utc) - timedelta(days=days_old)

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
            results["expired_tokens_deleted"] = (
                CleanupService.cleanup_expired_password_reset_tokens(hours_old=24)
            )

            # Cleanup used tokens (older than 7 days)
            results["used_tokens_deleted"] = (
                CleanupService.cleanup_used_password_reset_tokens(days_old=7)
            )

            results["total_deleted"] = (
                results["expired_tokens_deleted"] + results["used_tokens_deleted"]
            )

            logger.info(
                f"Total cleanup completed: {results['total_deleted']} tokens deleted"
            )

            return results

        except Exception as e:
            logger.error(f"Cleanup operation failed: {str(e)}")
            raise

    @staticmethod
    def purge_soft_deleted_records(days_old=30):
        """
        Permanently delete soft-deleted records older than specified days.

        This implements the "auto-purge after 30 days" feature for:
        - Expenses
        - Income
        - Debts
        - RecurringExpenses
        - Goals

        Args:
            days_old: Purge records deleted more than this many days ago (default: 30)

        Returns:
            dict: Summary of purged records by type

        Raises:
            Exception: If purge fails
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=days_old)
        results = {
            "expenses": 0,
            "income": 0,
            "debts": 0,
            "recurring_expenses": 0,
            "goals": 0,
            "total": 0,
        }

        try:
            # Purge old soft-deleted expenses
            results["expenses"] = Expense.query.filter(
                Expense.deleted_at.isnot(None),
                Expense.deleted_at < cutoff_time,
            ).delete()

            # Purge old soft-deleted income
            results["income"] = Income.query.filter(
                Income.deleted_at.isnot(None),
                Income.deleted_at < cutoff_time,
            ).delete()

            # Purge old soft-deleted debts
            results["debts"] = Debt.query.filter(
                Debt.deleted_at.isnot(None),
                Debt.deleted_at < cutoff_time,
            ).delete()

            # Purge old soft-deleted recurring expenses
            results["recurring_expenses"] = RecurringExpense.query.filter(
                RecurringExpense.deleted_at.isnot(None),
                RecurringExpense.deleted_at < cutoff_time,
            ).delete()

            # Purge old soft-deleted goals
            results["goals"] = Goal.query.filter(
                Goal.deleted_at.isnot(None),
                Goal.deleted_at < cutoff_time,
            ).delete()

            results["total"] = sum(
                [
                    results["expenses"],
                    results["income"],
                    results["debts"],
                    results["recurring_expenses"],
                    results["goals"],
                ]
            )

            db.session.commit()

            logger.info(
                f"Purged {results['total']} soft-deleted records "
                f"(deleted more than {days_old} days ago): "
                f"expenses={results['expenses']}, "
                f"income={results['income']}, "
                f"debts={results['debts']}, "
                f"recurring={results['recurring_expenses']}, "
                f"goals={results['goals']}"
            )

            return results

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to purge soft-deleted records: {str(e)}")
            raise

    @staticmethod
    def run_all_cleanup_tasks():
        """
        Run all cleanup operations including token cleanup and soft delete purge.

        Returns:
            dict: Summary of all cleanup operations
        """
        results = {
            "password_reset_tokens": {},
            "soft_deleted_records": {},
        }

        try:
            results["password_reset_tokens"] = (
                CleanupService.cleanup_all_password_reset_tokens()
            )
            results["soft_deleted_records"] = CleanupService.purge_soft_deleted_records(
                days_old=30
            )

            logger.info("All cleanup tasks completed successfully")
            return results

        except Exception as e:
            logger.error(f"Cleanup tasks failed: {str(e)}")
            raise


# Create singleton instance
cleanup_service = CleanupService()
