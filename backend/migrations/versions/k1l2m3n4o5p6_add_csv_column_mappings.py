"""
Add csv_column_mappings table for flexible bank import

Stores per-user column mapping preferences keyed by the CSV headers fingerprint,
so the app can auto-fill the column mapping the next time the user imports from
the same bank export format.

Revision ID: k1l2m3n4o5p6
Revises: j1k2l3m4n5o6
Create Date: 2026-02-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "k1l2m3n4o5p6"
down_revision = "j1k2l3m4n5o6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "csv_column_mappings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("headers_key", sa.String(500), nullable=False),
        sa.Column("date_column", sa.String(200), nullable=False),
        sa.Column("amount_column", sa.String(200), nullable=False),
        sa.Column("name_column", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "headers_key", name="uq_user_headers_mapping"
        ),
    )


def downgrade():
    op.drop_table("csv_column_mappings")
