"""
Backup Helper - Automatic database backup before destructive operations

Creates timestamped backups in instance/ directory.
"""

import os
import shutil
from datetime import datetime
from pathlib import Path


def create_backup(db_path=None):
    """
    Create timestamped backup of SQLite database.

    Args:
        db_path: Path to database file (default: instance/bloom.db)

    Returns:
        Path to backup file or None if backup failed
    """
    if db_path is None:
        # Default to development database
        project_root = Path(__file__).parent.parent
        db_path = project_root / "instance" / "bloom.db"
    else:
        db_path = Path(db_path)

    if not db_path.exists():
        print(f"⚠ Database not found: {db_path}")
        return None

    # Create backup with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = db_path.parent
    backup_file = backup_dir / f"{db_path.stem}.backup_{timestamp}{db_path.suffix}"

    try:
        shutil.copy2(db_path, backup_file)
        file_size_mb = backup_file.stat().st_size / (1024 * 1024)
        print(f"✓ Backup created: {backup_file.name} ({file_size_mb:.2f} MB)")
        return backup_file
    except Exception as e:
        print(f"✗ Backup failed: {e}")
        return None


def confirm_operation(operation_name):
    """
    Prompt user to confirm dangerous operation.

    Args:
        operation_name: Description of what will be deleted/modified

    Returns:
        True if user confirms, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"⚠️  DESTRUCTIVE OPERATION: {operation_name}")
    print(f"{'='*60}")
    print("A backup will be created automatically before proceeding.")
    print(
        "You can restore with: cp instance/bloom.backup_XXXXXX_XXXXXX.db instance/bloom.db"
    )

    response = input("\nContinue? (yes/no): ").lower().strip()
    return response in ["yes", "y"]


if __name__ == "__main__":
    # Test backup creation
    backup_path = create_backup()
    if backup_path:
        print(f"\n✓ Test backup successful: {backup_path}")
    else:
        print("\n✗ Test backup failed")
