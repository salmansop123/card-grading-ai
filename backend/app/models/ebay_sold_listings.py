import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EbaySoldListing(Base):
    __tablename__ = "ebay_sold_listings"
    __table_args__ = (
        Index("idx_ebay_card_id", "card_id"),
        Index("idx_ebay_sold_date", "sold_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    ebay_item_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    sold_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    condition: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sold_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    listing_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    card = relationship("Card", back_populates="ebay_listings")
