"""
Stamp Production Database with Baseline Migration

This script connects to the production database and runs `flask db stamp head`
to establish the baseline for Flask-Migrate without modifying existing tables.

Run this ONCE on production after switching from db.create_all() to Flask-Migrate.

Usage:
    python scripts/stamp_production_baseline.py

Environment Variables Required:
    DATABASE_URL - PostgreSQL connection string (from Render/Neon)
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from flask_migrate import stamp

def stamp_baseline():
    """Stamp production database with baseline migration"""

    # Check for production database URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("\nUsage:")
        print("  export DATABASE_URL='postgresql://...'")
        print("  python scripts/stamp_production_baseline.py")
        return False

    if 'sqlite' in database_url.lower():
        print("⚠️  WARNING: Detected SQLite database")
        print("   This script is for production PostgreSQL databases only")
        response = input("   Continue anyway? (y/N): ")
        if response.lower() != 'y':
            return False

    print(f"\n🔗 Connecting to database:")
    # Hide password in output
    safe_url = database_url.split('@')[1] if '@' in database_url else database_url
    print(f"   {safe_url}\n")

    print("⚠️  WARNING: This will mark the current database schema as the baseline.")
    print("   Make sure:")
    print("   1. Database has all expected tables")
    print("   2. You're connected to the PRODUCTION database")
    print("   3. You've backed up the database\n")

    response = input("Proceed with stamping baseline? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Aborted")
        return False

    try:
        # Create app with production config
        app = create_app('production')

        with app.app_context():
            print("\n🏷️  Stamping database with baseline migration...\n")
            stamp(revision='head')
            print("\n✅ Database stamped successfully!")
            print("\nNext steps:")
            print("  1. Create new migrations for account lockout features")
            print("  2. Test migrations locally")
            print("  3. Deploy to production")
            print("  4. Monitor Render build logs for 'flask db upgrade'")

        return True

    except Exception as e:
        print(f"\n❌ Error stamping database:")
        print(f"   {str(e)}\n")
        print("Troubleshooting:")
        print("  - Verify DATABASE_URL is correct")
        print("  - Check network connectivity to Neon")
        print("  - Ensure migrations/ directory exists")
        print("  - Run 'flask db init' if needed")
        return False

if __name__ == '__main__':
    success = stamp_baseline()
    sys.exit(0 if success else 1)
