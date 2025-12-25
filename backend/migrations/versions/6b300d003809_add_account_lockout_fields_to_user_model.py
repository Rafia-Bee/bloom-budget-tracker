"""Add account lockout fields to User model

Revision ID: 6b300d003809
Revises: 96250a305e91
Create Date: 2025-12-17 19:33:46.693977

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6b300d003809"
down_revision = "96250a305e91"
branch_labels = None
depends_on = None


def upgrade():
    # Add account lockout columns with safe defaults for existing rows
    op.add_column(
        "users",
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("users", sa.Column("locked_until", sa.DateTime(), nullable=True))


def downgrade():
    # Remove account lockout columns
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
