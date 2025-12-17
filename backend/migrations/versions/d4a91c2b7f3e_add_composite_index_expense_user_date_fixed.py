"""Add composite index for expense user_date_fixed query pattern

Revision ID: d4a91c2b7f3e
Revises: 6b300d003809
Create Date: 2025-12-17 20:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d4a91c2b7f3e"
down_revision = "6b300d003809"
branch_labels = None
depends_on = None


def upgrade():
    # Add composite index on (user_id, date, is_fixed_bill)
    # Optimizes common query pattern: filtering expenses by user, date range, and is_fixed_bill status
    # Use CONCURRENTLY for production (PostgreSQL) to avoid table lock during creation
    op.create_index(
        "idx_expense_user_date_fixed",
        "expenses",
        ["user_id", "date", "is_fixed_bill"],
        unique=False,
        postgresql_concurrently=True,
    )


def downgrade():
    # Remove the composite index
    op.drop_index("idx_expense_user_date_fixed", table_name="expenses")
