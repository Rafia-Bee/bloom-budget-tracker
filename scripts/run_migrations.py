"""
Run Flask-Migrate upgrade to apply all pending migrations.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app, db
from flask_migrate import upgrade

if __name__ == "__main__":
    app = create_app("development")
    with app.app_context():
        print("Running database migrations...")
        upgrade()
        print("✓ Migrations complete!")
