"""
Add flexible sub-periods support

Adds num_sub_periods column to salary_periods table and removes the
hardcoded week_number BETWEEN 1 AND 4 constraint from budget_periods.
This enables users to choose how many sub-periods to divide their budget into.

Revision ID: j1k2l3m4n5o6
Revises: i1j2k3l4m5n6
Create Date: 2026-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "j1k2l3m4n5o6"
down_revision = "i1j2k3l4m5n6"
branch_labels = None
depends_on = None


def upgrade():
    # Add num_sub_periods column to salary_periods
    # Default 4 for backward compatibility with existing data
    with op.batch_alter_table("salary_periods", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "num_sub_periods", sa.Integer(), nullable=False, server_default="4"
            )
        )

    # Update the constraint on budget_periods to allow any positive week_number
    # SQLite doesn't support DROP CONSTRAINT directly, so we need to recreate the table
    # For PostgreSQL, we can drop and add the constraint
    # Using batch mode which handles both SQLite and PostgreSQL
    with op.batch_alter_table("budget_periods", schema=None) as batch_op:
        # Drop old constraint (only if it exists - PostgreSQL)
        try:
            batch_op.drop_constraint("check_budget_period_week_number", type_="check")
        except Exception:
            pass  # Constraint may not exist or may have different handling

        # Add new constraint allowing any positive week_number
        batch_op.create_check_constraint(
            "check_budget_period_week_number",
            "week_number IS NULL OR week_number >= 1",
        )


def downgrade():
    # Remove num_sub_periods column
    with op.batch_alter_table("salary_periods", schema=None) as batch_op:
        batch_op.drop_column("num_sub_periods")

    # Restore original constraint (week_number BETWEEN 1 AND 4)
    with op.batch_alter_table("budget_periods", schema=None) as batch_op:
        try:
            batch_op.drop_constraint("check_budget_period_week_number", type_="check")
        except Exception:
            pass

        batch_op.create_check_constraint(
            "check_budget_period_week_number",
            "week_number IS NULL OR (week_number BETWEEN 1 AND 4)",
        )
