"""
Bloom - Scheduled Cleanup Script

Run periodic cleanup tasks for the database.
Can be executed manually or via scheduled task (cron, GitHub Actions, etc.).

Usage:
    python scripts/cleanup_scheduler_fixed.py [--task TOKEN_CLEANUP]
    python scripts/cleanup_scheduler_fixed.py --all
"""

import sys
import os
import argparse
from datetime import datetime, timezone


def setup_backend_imports():
    """Setup path and import backend modules."""
    # Add parent directory to path so we can import backend modules
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    # Import after path setup - these imports happen at runtime
    try:
        from backend.services.cleanup_service import cleanup_service
        from backend.app import create_app

        return cleanup_service, create_app
    except ImportError as e:
        print(f"Error importing backend modules: {e}")
        print("Make sure you're running this script from the project root directory.")
        sys.exit(1)


def run_token_cleanup():
    """Run password reset token cleanup."""
    cleanup_service, create_app = setup_backend_imports()

    print(f"[{datetime.now(timezone.utc)}] Starting password reset token cleanup...")

    try:
        # Create Flask app context (skip production validation for maintenance scripts)
        os.environ['SKIP_SECRET_VALIDATION'] = '1'
        app = create_app()
        with app.app_context():
            results = cleanup_service.cleanup_all_password_reset_tokens()

            print(f"  - Expired tokens deleted: {results['expired_tokens_deleted']}")
            print(f"  - Used tokens deleted: {results['used_tokens_deleted']}")
            print(f"  - Total tokens deleted: {results['total_deleted']}")
            print(
                f"[{datetime.now(timezone.utc)}] Token cleanup completed successfully!"
            )

            return results["total_deleted"]

    except Exception as e:
        print(f"[{datetime.now(timezone.utc)}] ERROR: Token cleanup failed: {e}")
        return 0


def run_all_cleanups():
    """Run all cleanup tasks."""
    print(f"\n{'='*60}")
    print(f"Bloom Scheduled Cleanup - {datetime.now(timezone.utc)}")
    print(f"{'='*60}\n")

    total_removed = 0

    # Run token cleanup
    total_removed += run_token_cleanup()

    # Add other cleanup tasks here in the future
    # total_removed += run_other_cleanup()

    print(f"\n{'='*60}")
    print(f"Cleanup Summary: {total_removed} total items removed")
    print(f"{'='*60}")

    return total_removed


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Run periodic cleanup tasks for Bloom database"
    )
    parser.add_argument(
        "--task", choices=["TOKEN_CLEANUP"], help="Run a specific cleanup task"
    )
    parser.add_argument(
        "--all", action="store_true", help="Run all available cleanup tasks"
    )

    args = parser.parse_args()

    if args.all:
        run_all_cleanups()
    elif args.task == "TOKEN_CLEANUP":
        run_token_cleanup()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
