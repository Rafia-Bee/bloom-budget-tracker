"""
Create fresh database with all tables
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app, db

if __name__ == "__main__":
    app = create_app("development")
    with app.app_context():
        print("Creating all database tables...")
        db.create_all()
        print("✓ Database created successfully!")
