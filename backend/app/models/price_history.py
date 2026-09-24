import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PriceHistory(Base):
    __tablename__ = "price_history"
    __table_args__ = (
        Index("idx_price_history_card_id", "card_id"),
        Index("idx_price_history_recorded_at", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    psa8_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    psa9_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    psa10_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    pricecharting_raw: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    pricecharting_psa9: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    pricecharting_psa10: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ebay_avg_last_10: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ebay_median_last_10: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ebay_sales_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_7d_ago: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    price_30d_ago: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    pct_change_7d: Mapped[float | None] = mapped_column(Float, nullable=True)
    pct_change_30d: Mapped[float | None] = mapped_column(Float, nullable=True)
    volatility_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    card = relationship("Card", back_populates="price_history")
