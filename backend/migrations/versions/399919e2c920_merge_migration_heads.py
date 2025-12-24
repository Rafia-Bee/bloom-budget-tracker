"""Merge migration heads

Revision ID: 399919e2c920
Revises: b1c2d3e4f5a6, c5d8e9a2b1f3
Create Date: 2025-12-24 17:41:34.577108

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "399919e2c920"
down_revision = ("b1c2d3e4f5a6", "c5d8e9a2b1f3")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
