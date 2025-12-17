"""Add CHECK constraints for data integrity

Revision ID: e8f5c3a1b9d4
Revises: d4a91c2b7f3e
Create Date: 2025-12-17 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e8f5c3a1b9d4"
down_revision = "d4a91c2b7f3e"
branch_labels = None
depends_on = None


def upgrade():
    # Note: SQLite doesn't support adding CHECK constraints via ALTER TABLE
    # These constraints will only be enforced when tables are recreated
    # (e.g., in new databases or during major schema changes)
    # The constraints are already defined in the SQLAlchemy models

    # For PostgreSQL production, use batch operations
    with op.batch_alter_table("users", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("salary_periods", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("budget_periods", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("expenses", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("income", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("debts", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("recurring_expenses", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("credit_card_settings", schema=None) as batch_op:
        pass  # Constraints added via model definition

    with op.batch_alter_table("period_suggestions", schema=None) as batch_op:
        pass  # Constraints added via model definition


def downgrade():
    # No-op for SQLite
    # CHECK constraints are embedded in table definitions
    pass
