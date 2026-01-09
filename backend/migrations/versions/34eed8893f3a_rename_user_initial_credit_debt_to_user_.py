"""Rename user_initial_credit_debt to user_initial_credit_available

Revision ID: 34eed8893f3a
Revises: 9ef3d960b257
Create Date: 2026-01-08 19:29:51.195986

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "34eed8893f3a"
down_revision = "9ef3d960b257"
branch_labels = None
depends_on = None


def upgrade():
    # Add new column with default value
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_initial_credit_available",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )

    # Migrate data: available = limit - debt
    # For users with credit data, convert debt to available
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET user_initial_credit_available = user_initial_credit_limit - user_initial_credit_debt
            WHERE user_initial_credit_limit > 0
        """
        )
    )

    # Drop old column
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("user_initial_credit_debt")


def downgrade():
    # Add old column back
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_initial_credit_debt",
                sa.INTEGER(),
                server_default=sa.text("'0'"),
                nullable=False,
            )
        )

    # Migrate data back: debt = limit - available
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET user_initial_credit_debt = user_initial_credit_limit - user_initial_credit_available
            WHERE user_initial_credit_limit > 0
        """
        )
    )

    # Drop new column
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("user_initial_credit_available")
