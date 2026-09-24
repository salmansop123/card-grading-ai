"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("card_name", sa.String(255), nullable=False),
        sa.Column("set_name", sa.String(255), nullable=True),
        sa.Column("set_code", sa.String(50), nullable=True),
        sa.Column("card_number", sa.String(50), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("rarity", sa.String(100), nullable=True),
        sa.Column("card_type", sa.String(50), server_default="pokemon"),
        sa.Column("language", sa.String(50), server_default="English"),
        sa.Column("pokemon_tcg_id", sa.String(100), nullable=True),
        sa.Column("pricecharting_id", sa.String(100), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("scan_status", sa.String(50), server_default="pending"),
        sa.Column("pricing_status", sa.String(50), server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_cards_card_name", "cards", ["card_name"])
    op.create_index("idx_cards_set_code", "cards", ["set_code"])
    op.create_index("idx_cards_card_type", "cards", ["card_type"])

    op.create_table(
        "portfolio_holdings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1"),
        sa.Column("condition", sa.String(50), nullable=True),
        sa.Column("purchase_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "card_id", "condition", name="uq_portfolio_user_card_condition"),
    )
    op.create_index("idx_portfolio_user_id", "portfolio_holdings", ["user_id"])

    op.create_table(
        "price_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("estimated_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("raw_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("psa8_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("psa9_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("psa10_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("pricecharting_raw", sa.Numeric(10, 2), nullable=True),
        sa.Column("pricecharting_psa9", sa.Numeric(10, 2), nullable=True),
        sa.Column("pricecharting_psa10", sa.Numeric(10, 2), nullable=True),
        sa.Column("ebay_avg_last_10", sa.Numeric(10, 2), nullable=True),
        sa.Column("ebay_median_last_10", sa.Numeric(10, 2), nullable=True),
        sa.Column("ebay_sales_count", sa.Integer(), nullable=True),
        sa.Column("price_7d_ago", sa.Numeric(10, 2), nullable=True),
        sa.Column("price_30d_ago", sa.Numeric(10, 2), nullable=True),
        sa.Column("pct_change_7d", sa.Float(), nullable=True),
        sa.Column("pct_change_30d", sa.Float(), nullable=True),
        sa.Column("volatility_score", sa.Float(), nullable=True),
    )
    op.create_index("idx_price_history_card_id", "price_history", ["card_id"])
    op.create_index("idx_price_history_recorded_at", "price_history", ["recorded_at"])

    op.create_table(
        "ai_scan_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cards.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("raw_ai_response", postgresql.JSONB(), nullable=True),
        sa.Column("extracted_data", postgresql.JSONB(), nullable=True),
        sa.Column("model_used", sa.String(100), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "ai_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("market_trend", sa.String(50), nullable=True),
        sa.Column("trend_reason", sa.Text(), nullable=True),
        sa.Column("investment_signal", sa.String(50), nullable=True),
        sa.Column("signal_reasoning", sa.Text(), nullable=True),
        sa.Column("grade_recommendation", sa.Boolean(), nullable=True),
        sa.Column("grade_roi_estimate", sa.Float(), nullable=True),
        sa.Column("key_risks", sa.Text(), nullable=True),
        sa.Column("key_catalysts", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("model_used", sa.String(100), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "ebay_sold_listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ebay_item_id", sa.String(100), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("sold_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("condition", sa.String(100), nullable=True),
        sa.Column("sold_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("listing_url", sa.Text(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_ebay_card_id", "ebay_sold_listings", ["card_id"])
    op.create_index("idx_ebay_sold_date", "ebay_sold_listings", ["sold_date"])


def downgrade() -> None:
    op.drop_table("ebay_sold_listings")
    op.drop_table("ai_insights")
    op.drop_table("ai_scan_results")
    op.drop_table("price_history")
    op.drop_table("portfolio_holdings")
    op.drop_index("idx_cards_card_type", table_name="cards")
    op.drop_index("idx_cards_set_code", table_name="cards")
    op.drop_index("idx_cards_card_name", table_name="cards")
    op.drop_table("cards")
    op.drop_table("users")
