"""Add updated_at audit columns to Expense, Income, and SalaryPeriod

Adds updated_at column to track when records were last modified.
Part of simplified Issue #63 - audit trail for debugging and troubleshooting.

Revision ID: i1j2k3l4m5n6
Revises: h1i2j3k4l5m6
Create Date: 2024-12-31

"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


# revision identifiers, used by Alembic.
revision = "i1j2k3l4m5n6"
down_revision = "h1i2j3k4l5m6"
branch_labels = None
depends_on = None


def upgrade():
    # Add updated_at to expenses table
    op.add_column(
        "expenses",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True,
        ),
    )
    # Set initial value to created_at for existing records
    op.execute("UPDATE expenses SET updated_at = created_at WHERE updated_at IS NULL")

    # Add updated_at to income table
    op.add_column(
        "income",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True,
        ),
    )
    # Set initial value to created_at for existing records
    op.execute("UPDATE income SET updated_at = created_at WHERE updated_at IS NULL")

    # Add updated_at to salary_periods table
    op.add_column(
        "salary_periods",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True,
        ),
    )
    # Set initial value to created_at for existing records
    op.execute(
        "UPDATE salary_periods SET updated_at = created_at WHERE updated_at IS NULL"
    )


def downgrade():
    op.drop_column("salary_periods", "updated_at")
    op.drop_column("income", "updated_at")
    op.drop_column("expenses", "updated_at")
