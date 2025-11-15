"""
Migration script to add recurring expenses support.

Adds:
1. recurring_expenses table
2. recurring_template_id column to expenses table
"""

import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.models.database import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Check if recurring_expenses table exists
        result = db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_expenses'"))
        table_exists = result.fetchone() is not None

        if not table_exists:
            print("Creating recurring_expenses table...")
            db.session.execute(text("""
                CREATE TABLE recurring_expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(200) NOT NULL,
                    amount INTEGER NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    subcategory VARCHAR(100),
                    payment_method VARCHAR(20) NOT NULL DEFAULT 'credit',
                    frequency VARCHAR(20) NOT NULL,
                    frequency_value INTEGER,
                    day_of_month INTEGER,
                    day_of_week INTEGER,
                    start_date DATE NOT NULL,
                    end_date DATE,
                    next_due_date DATE NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """))
            print("✓ recurring_expenses table created successfully")
        else:
            print("✓ recurring_expenses table already exists")

        # Check if recurring_template_id column exists in expenses table
        result = db.session.execute(text("PRAGMA table_info(expenses)"))
        columns = [row[1] for row in result.fetchall()]

        if 'recurring_template_id' not in columns:
            print("Adding recurring_template_id column to expenses table...")
            db.session.execute(text("""
                ALTER TABLE expenses
                ADD COLUMN recurring_template_id INTEGER
                REFERENCES recurring_expenses(id)
            """))
            print("✓ recurring_template_id column added successfully")
        else:
            print("✓ recurring_template_id column already exists")

        db.session.commit()
        print("\n✓ Migration complete! Recurring expenses support added.")

    except Exception as e:
        db.session.rollback()
        print(f"\n✗ Migration failed: {str(e)}")
        raise
