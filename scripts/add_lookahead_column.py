"""
Add recurring_lookahead_days column to User model
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app, db

if __name__ == "__main__":
    app = create_app("development")
    with app.app_context():
        print("Adding recurring_lookahead_days column to users table...")

        # Check if column exists
        from sqlalchemy import inspect

        inspector = inspect(db.engine)
        columns = [col["name"] for col in inspector.get_columns("users")]

        if "recurring_lookahead_days" in columns:
            print("✓ Column already exists!")
        else:
            # Add the column using raw SQL
            with db.engine.connect() as conn:
                # For SQLite, we need to handle this differently
                conn.execute(
                    db.text(
                        "ALTER TABLE users ADD COLUMN recurring_lookahead_days INTEGER NOT NULL DEFAULT 14"
                    )
                )
                conn.commit()
                print("✓ Column added successfully!")

        print("Migration complete!")
