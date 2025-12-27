"""add soft delete columns

Adds deleted_at column to support soft delete pattern for:
- expenses
- income
- debts
- recurring_expenses

This allows users to recover accidentally deleted data and maintains
an audit trail. Records with deleted_at = NULL are active; records
with a timestamp are soft-deleted.

Issue: #61

Revision ID: h1i2j3k4l5m6
Revises: g1h2i3j4k5l6
Create Date: 2025-12-27
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "h1i2j3k4l5m6"
down_revision = "g1h2i3j4k5l6"
branch_labels = None
depends_on = None


def upgrade():
    # Add deleted_at column to expenses table
    op.add_column(
        "expenses",
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "idx_expenses_deleted_at",
        "expenses",
        ["deleted_at"],
        unique=False,
    )

    # Add deleted_at column to income table
    op.add_column(
        "income",
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "idx_income_deleted_at",
        "income",
        ["deleted_at"],
        unique=False,
    )

    # Add deleted_at column to debts table
    op.add_column(
        "debts",
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "idx_debts_deleted_at",
        "debts",
        ["deleted_at"],
        unique=False,
    )

    # Add deleted_at column to recurring_expenses table
    op.add_column(
        "recurring_expenses",
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "idx_recurring_expenses_deleted_at",
        "recurring_expenses",
        ["deleted_at"],
        unique=False,
    )


def downgrade():
    # Remove indexes first, then columns
    op.drop_index("idx_recurring_expenses_deleted_at", table_name="recurring_expenses")
    op.drop_column("recurring_expenses", "deleted_at")

    op.drop_index("idx_debts_deleted_at", table_name="debts")
    op.drop_column("debts", "deleted_at")

    op.drop_index("idx_income_deleted_at", table_name="income")
    op.drop_column("income", "deleted_at")

    op.drop_index("idx_expenses_deleted_at", table_name="expenses")
    op.drop_column("expenses", "deleted_at")
