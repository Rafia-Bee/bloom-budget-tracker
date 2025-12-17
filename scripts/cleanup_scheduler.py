"""
Bloom - Scheduled Cleanup Script

Run periodic cleanup tasks for the database.
Can be executed manually or via scheduled task (cron, GitHub Actions, etc.).

Usage:
    python scripts/cleanup_scheduler.py [--task TOKEN_CLEANUP]
    python scripts/cleanup_scheduler.py --all
"""

from backend.services.cleanup_service import cleanup_service
from backend.app import create_app
import sys
import os
import argparse
from datetime import datetime

# Add parent directory to path so we can import backend modules
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")))


def run_token_cleanup():
    """Run password reset token cleanup."""
    print(f"[{datetime.utcnow()}] Starting password reset token cleanup...")

    try:
        results = cleanup_service.cleanup_all_password_reset_tokens()

        print(
            f"  - Expired tokens deleted: {results['expired_tokens_deleted']}")
        print(f"  - Used tokens deleted: {results['used_tokens_deleted']}")
        print(f"  - Total tokens deleted: {results['total_deleted']}")
        print(f"[{datetime.utcnow()}] Token cleanup completed successfully!")

        return results["total_deleted"]

    except Exception as e:
        print(f"[{datetime.utcnow()}] ERROR: Token cleanup failed: {e}")
        return 0


def run_all_cleanups():
    """Run all cleanup tasks."""
    print(f"\n{'='*60}")
    print(f"Bloom Scheduled Cleanup - {datetime.utcnow()}")
    print(f"{'='*60}\n")

    total_cleaned = 0

    # Run token cleanup
    total_cleaned += run_token_cleanup()

    # Add more cleanup tasks here in the future
    # total_cleaned += run_other_cleanup()

    print(f"\n{'='*60}")
    print(f"Cleanup Summary: {total_cleaned} total items removed")
    print(f"{'='*60}\n")

    return total_cleaned


def main():
    """Main entry point for cleanup script."""
    parser = argparse.ArgumentParser(
        description="Run scheduled cleanup tasks for Bloom database"
    )
    parser.add_argument(
        "--task",
        choices=["TOKEN_CLEANUP"],
        help="Run specific cleanup task",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all cleanup tasks",
    )

    args = parser.parse_args()

    # Create Flask app context
    app = create_app()

    with app.app_context():
        if args.task == "TOKEN_CLEANUP":
            run_token_cleanup()
        elif args.all or not args.task:
            run_all_cleanups()


if __name__ == "__main__":
    main()
