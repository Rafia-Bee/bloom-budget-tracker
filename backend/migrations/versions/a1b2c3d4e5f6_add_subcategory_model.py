"""Add Subcategory model for custom user subcategories

Revision ID: a1b2c3d4e5f6
Revises: 6b300d003809
Create Date: 2025-12-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "f7b2d9e4c8a1"
branch_labels = None
depends_on = None


def upgrade():
    # Create subcategories table
    op.create_table(
        "subcategories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_subcategory_user", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for performance
    op.create_index("ix_subcategories_user_id", "subcategories", ["user_id"])
    op.create_index("ix_subcategories_category", "subcategories", ["category"])

    # Insert system default subcategories
    now = datetime.utcnow()

    # System subcategories (user_id = NULL, is_system = True)
    system_subcategories = [
        # Fixed Expenses
        ("Fixed Expenses", "Rent"),
        ("Fixed Expenses", "Utilities"),
        ("Fixed Expenses", "Insurance"),
        ("Fixed Expenses", "Subscriptions"),
        ("Fixed Expenses", "Other"),
        # Flexible Expenses
        ("Flexible Expenses", "Food"),
        ("Flexible Expenses", "Transportation"),
        ("Flexible Expenses", "Entertainment"),
        ("Flexible Expenses", "Shopping"),
        ("Flexible Expenses", "Health"),
        ("Flexible Expenses", "Other"),
        # Savings & Investments (only "Other" - user creates specific goals via Goals page)
        ("Savings & Investments", "Other"),
        # Debt Payments
        ("Debt Payments", "Credit Card"),
        ("Debt Payments", "Other"),
    ]

    # Build insert statement
    subcategories_table = sa.table(
        "subcategories",
        sa.column("user_id", sa.Integer),
        sa.column("category", sa.String),
        sa.column("name", sa.String),
        sa.column("is_system", sa.Boolean),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )

    for category, name in system_subcategories:
        op.execute(
            subcategories_table.insert().values(
                user_id=None,
                category=category,
                name=name,
                is_system=True,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )


def downgrade():
    op.drop_index("ix_subcategories_category", "subcategories")
    op.drop_index("ix_subcategories_user_id", "subcategories")
    op.drop_table("subcategories")
