"""add race condition constraints

Adds unique constraints to prevent race conditions in:
- Subcategories: (user_id, category, name)
- Income Initial Balance: partial unique index on user_id where type='Initial Balance'
- Expenses from recurring: partial unique index on (user_id, recurring_template_id, date)

Fixes issues #108, #109, #110, #111

Revision ID: g1h2i3j4k5l6
Revises: f65eb8a43054
Create Date: 2025-12-25
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "g1h2i3j4k5l6"
down_revision = "f65eb8a43054"
branch_labels = None
depends_on = None


def upgrade():
    # Add unique constraint for subcategories
    # Prevents duplicate subcategory names within same category for a user
    op.create_unique_constraint(
        "uq_subcategory_user_category_name",
        "subcategories",
        ["user_id", "category", "name"],
    )

    # Add partial unique index for Initial Balance income entries
    # Only one "Initial Balance" entry per user
    # Note: PostgreSQL-specific partial index syntax
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_income_initial_balance_per_user
        ON income (user_id)
        WHERE type = 'Initial Balance'
        """
    )

    # Add partial unique index for recurring expense instances
    # Prevents duplicate expense generation for same template on same date
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_recurring_date
        ON expenses (user_id, recurring_template_id, date)
        WHERE recurring_template_id IS NOT NULL
        """
    )


def downgrade():
    # Remove partial indexes
    op.execute("DROP INDEX IF EXISTS uq_expense_recurring_date")
    op.execute("DROP INDEX IF EXISTS uq_income_initial_balance_per_user")

    # Remove subcategory constraint
    op.drop_constraint("uq_subcategory_user_category_name", "subcategories", type_="unique")
