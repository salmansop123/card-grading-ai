"""portfolio sold tracking and partial unique index for active holdings

Revision ID: 005
Revises: 004
Create Date: 2026-06-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "portfolio_holdings",
        sa.Column("is_sold", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "portfolio_holdings",
        sa.Column("sold_price", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "portfolio_holdings",
        sa.Column("sold_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "portfolio_holdings",
        sa.Column("sold_quantity", sa.Integer(), nullable=True),
    )

    op.drop_constraint("uq_portfolio_holding_identity", "portfolio_holdings", type_="unique")
    op.create_index(
        "uq_holding_identity_active",
        "portfolio_holdings",
        ["user_id", "card_id", "condition", "is_graded", "grading_company", "grade"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false AND is_sold = false"),
    )


def downgrade() -> None:
    op.drop_index("uq_holding_identity_active", table_name="portfolio_holdings")
    op.create_unique_constraint(
        "uq_portfolio_holding_identity",
        "portfolio_holdings",
        ["user_id", "card_id", "condition", "is_graded", "grading_company", "grade"],
    )
    op.drop_column("portfolio_holdings", "sold_quantity")
    op.drop_column("portfolio_holdings", "sold_date")
    op.drop_column("portfolio_holdings", "sold_price")
    op.drop_column("portfolio_holdings", "is_sold")
