"""
Database Backup Script

Automatically backs up the PostgreSQL database to GitHub repository.
Supports both production (PostgreSQL) and development (SQLite) databases.

Functions:
- backup_postgres: Dump PostgreSQL database using pg_dump
- backup_sqlite: Copy SQLite database file
- compress_backup: Compress backup with gzip
- upload_to_github: Upload backup to GitHub via API
- cleanup_old_backups: Remove backups older than retention period
"""

import os
import sys
import subprocess
import gzip
import shutil
import requests
from datetime import datetime, timedelta
from pathlib import Path


def get_database_url():
    """Get database URL from environment"""
    return os.getenv("DATABASE_URL")


def get_github_token():
    """Get GitHub token from environment"""
    token = os.getenv("GITHUB_BACKUP_TOKEN")
    if not token:
        raise ValueError("GITHUB_BACKUP_TOKEN environment variable not set")
    return token


def backup_postgres(database_url, backup_dir):
    """Backup PostgreSQL database using pg_dump"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"bloom_backup_{timestamp}.sql"

    print(f"Starting PostgreSQL backup to {backup_file}...")

    try:
        # Run pg_dump
        result = subprocess.run(
            ["pg_dump", database_url, "-f", str(backup_file)],
            capture_output=True,
            text=True,
            check=True
        )

        print(f"✓ PostgreSQL backup successful: {backup_file}")
        return backup_file

    except subprocess.CalledProcessError as e:
        print(f"✗ PostgreSQL backup failed: {e.stderr}")
        raise
    except FileNotFoundError:
        print("✗ pg_dump not found. Install PostgreSQL client tools.")
        raise


def backup_sqlite(database_path, backup_dir):
    """Backup SQLite database by copying the file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"bloom_backup_{timestamp}.db"

    print(f"Starting SQLite backup to {backup_file}...")

    try:
        shutil.copy2(database_path, backup_file)
        print(f"✓ SQLite backup successful: {backup_file}")
        return backup_file

    except Exception as e:
        print(f"✗ SQLite backup failed: {e}")
        raise


def compress_backup(backup_file):
    """Compress backup file with gzip"""
    compressed_file = Path(f"{backup_file}.gz")

    print(f"Compressing {backup_file}...")

    try:
        with open(backup_file, "rb") as f_in:
            with gzip.open(compressed_file, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)

        # Remove uncompressed file
        backup_file.unlink()

        file_size_mb = compressed_file.stat().st_size / (1024 * 1024)
        print(
            f"✓ Compression successful: {compressed_file} ({file_size_mb:.2f} MB)")
        return compressed_file

    except Exception as e:
        print(f"✗ Compression failed: {e}")
        raise


def upload_to_github(backup_file, github_token):
    """Upload backup to GitHub repository via API"""
    repo_owner = "Rafia-Bee"
    repo_name = "bloom-budget-tracker"
    branch = "main"

    # GitHub path for backup file
    github_path = f"backups/{backup_file.name}"

    print(f"Uploading to GitHub: {github_path}...")

    try:
        # Read backup file
        with open(backup_file, "rb") as f:
            content = f.read()

        # Convert to base64
        import base64
        content_base64 = base64.b64encode(content).decode("utf-8")

        # GitHub API endpoint
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{github_path}"

        # Check if file already exists
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        response = requests.get(url, headers=headers)
        sha = None
        if response.status_code == 200:
            sha = response.json()["sha"]

        # Upload/update file
        commit_message = f"chore: automated database backup - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        data = {
            "message": commit_message,
            "content": content_base64,
            "branch": branch
        }

        if sha:
            data["sha"] = sha

        response = requests.put(url, json=data, headers=headers)

        if response.status_code in [200, 201]:
            print(f"✓ Upload successful: {github_path}")
            return True
        else:
            print(f"✗ Upload failed: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"✗ Upload failed: {e}")
        return False


def cleanup_old_backups(backup_dir, retention_days=30):
    """Remove backups older than retention period"""
    cutoff_date = datetime.now() - timedelta(days=retention_days)

    print(f"Cleaning up backups older than {retention_days} days...")

    removed_count = 0
    for backup_file in backup_dir.glob("bloom_backup_*.gz"):
        # Extract timestamp from filename
        try:
            timestamp_str = backup_file.stem.split(
                "_", 2)[2]  # bloom_backup_TIMESTAMP
            timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")

            if timestamp < cutoff_date:
                backup_file.unlink()
                removed_count += 1
                print(f"  Removed: {backup_file.name}")

        except (ValueError, IndexError):
            # Skip files with invalid format
            continue

    if removed_count > 0:
        print(f"✓ Removed {removed_count} old backup(s)")
    else:
        print("  No old backups to remove")


def main():
    """Main backup execution"""
    print("=" * 60)
    print("Bloom Database Backup")
    print("=" * 60)

    # Create backup directory
    backup_dir = Path(__file__).parent / "backups"
    backup_dir.mkdir(exist_ok=True)

    try:
        # Get database info
        database_url = get_database_url()

        if not database_url:
            # Default to SQLite (check Render path first, then local)
            print("No DATABASE_URL found, using SQLite...")

            # Try Render persistent disk path first
            render_db_path = Path("/opt/render/project/data/bloom.db")
            if render_db_path.exists():
                database_path = render_db_path
            else:
                # Fallback to local development path
                database_path = Path(__file__).parent.parent / \
                    "instance" / "bloom.db"

            if not database_path.exists():
                print(f"✗ SQLite database not found at {database_path}")
                sys.exit(1)

            backup_file = backup_sqlite(database_path, backup_dir)

        elif database_url.startswith("postgresql"):
            # PostgreSQL backup
            backup_file = backup_postgres(database_url, backup_dir)

        else:
            print(f"✗ Unsupported database type: {database_url}")
            sys.exit(1)

        # Compress backup
        compressed_file = compress_backup(backup_file)

        # Upload to GitHub (if token available)
        github_token = os.getenv("GITHUB_BACKUP_TOKEN")
        if github_token:
            upload_to_github(compressed_file, github_token)
        else:
            print("⚠ GITHUB_BACKUP_TOKEN not set, skipping upload")

        # Cleanup old backups
        cleanup_old_backups(backup_dir)

        print("=" * 60)
        print("✓ Backup completed successfully")
        print("=" * 60)

    except Exception as e:
        print("=" * 60)
        print(f"✗ Backup failed: {e}")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
