"""add_goal_model

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2025-01-22 15:30:00.000000

"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = "b1c2d3e4f5a6"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    # Create goals table
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_amount", sa.Integer(), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("subcategory_name", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_goal_user", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("target_amount > 0", name="check_goal_positive_amount"),
    )

    # Create indexes for performance
    op.create_index("idx_goal_user_active", "goals", ["user_id", "is_active"])
    op.create_index(
        "idx_goal_user_subcategory", "goals", ["user_id", "subcategory_name"]
    )


def downgrade():
    op.drop_index("idx_goal_user_subcategory", "goals")
    op.drop_index("idx_goal_user_active", "goals")
    op.drop_table("goals")
