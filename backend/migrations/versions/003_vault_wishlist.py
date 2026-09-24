"""vault and wishlist schema

Revision ID: 003
Revises: 002
Create Date: 2026-06-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "portfolio_holdings",
        sa.Column("user_uploaded_image_url", sa.Text(), nullable=True),
    )

    op.create_table(
        "wishlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "card_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("target_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "card_id", name="uq_wishlist_user_card"),
    )
    op.create_index("idx_wishlist_user_id", "wishlist_items", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_wishlist_user_id", table_name="wishlist_items")
    op.drop_table("wishlist_items")
    op.drop_column("portfolio_holdings", "user_uploaded_image_url")
