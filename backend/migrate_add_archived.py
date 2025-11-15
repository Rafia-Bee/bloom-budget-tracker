"""
Migration script to add 'archived' column to debts table.
Run this once to update the database schema.
"""

from backend.app import create_app
from backend.models.database import db

def migrate():
    app = create_app()

    with app.app_context():
        # Add archived column to debts table
        with db.engine.connect() as conn:
            try:
                # Check if column exists
                result = conn.execute(db.text("PRAGMA table_info(debts)"))
                columns = [row[1] for row in result]

                if 'archived' not in columns:
                    print("Adding 'archived' column to debts table...")
                    conn.execute(db.text("ALTER TABLE debts ADD COLUMN archived BOOLEAN DEFAULT 0 NOT NULL"))
                    conn.commit()
                    print("✓ Migration complete! 'archived' column added.")
                else:
                    print("✓ Column 'archived' already exists. No migration needed.")
            except Exception as e:
                print(f"Error during migration: {e}")
                conn.rollback()

if __name__ == '__main__':
    migrate()
