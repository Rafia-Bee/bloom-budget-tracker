"""add recurring_lookahead_days to User model

Revision ID: c5d8e9a2b1f3
Revises: e8f5c3a1b9d4
Create Date: 2025-12-23

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c5d8e9a2b1f3"
down_revision = "e8f5c3a1b9d4"
branch_labels = None
depends_on = None


def upgrade():
    # Add recurring_lookahead_days column with default 14 days
    op.add_column(
        "users",
        sa.Column(
            "recurring_lookahead_days",
            sa.Integer(),
            nullable=False,
            server_default="14",
        ),
    )

    # Add check constraint for valid range (7-90 days)
    op.create_check_constraint(
        "check_user_lookahead_range",
        "users",
        "recurring_lookahead_days >= 7 AND recurring_lookahead_days <= 90",
    )


def downgrade():
    # Drop the check constraint first
    op.drop_constraint("check_user_lookahead_range", "users", type_="check")

    # Drop the column
    op.drop_column("users", "recurring_lookahead_days")
