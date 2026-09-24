"""portfolio grading fields

Revision ID: 002
Revises: 001
Create Date: 2026-06-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "portfolio_holdings",
        sa.Column("is_graded", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "portfolio_holdings",
        sa.Column("grading_company", sa.String(10), nullable=True),
    )
    op.add_column(
        "portfolio_holdings",
        sa.Column("grade", sa.Numeric(3, 1), nullable=True),
    )
    op.drop_constraint("uq_portfolio_user_card_condition", "portfolio_holdings", type_="unique")
    op.create_unique_constraint(
        "uq_portfolio_holding_identity",
        "portfolio_holdings",
        ["user_id", "card_id", "condition", "is_graded", "grading_company", "grade"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_portfolio_holding_identity", "portfolio_holdings", type_="unique")
    op.create_unique_constraint(
        "uq_portfolio_user_card_condition",
        "portfolio_holdings",
        ["user_id", "card_id", "condition"],
    )
    op.drop_column("portfolio_holdings", "grade")
    op.drop_column("portfolio_holdings", "grading_company")
    op.drop_column("portfolio_holdings", "is_graded")
