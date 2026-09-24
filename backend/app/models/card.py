import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Card(Base):
    __tablename__ = "cards"
    __table_args__ = (
        Index("idx_cards_card_name", "card_name"),
        Index("idx_cards_set_code", "set_code"),
        Index("idx_cards_card_type", "card_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_name: Mapped[str] = mapped_column(String(255), nullable=False)
    set_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    set_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    card_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rarity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    card_type: Mapped[str | None] = mapped_column(String(50), default="pokemon")
    language: Mapped[str | None] = mapped_column(String(50), default="English")
    pokemon_tcg_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pricecharting_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    scan_status: Mapped[str] = mapped_column(String(50), default="pending")
    pricing_status: Mapped[str] = mapped_column(String(50), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    holdings = relationship("PortfolioHolding", back_populates="card", cascade="all, delete-orphan")
    price_history = relationship("PriceHistory", back_populates="card", cascade="all, delete-orphan")
    scan_results = relationship("AIScanResult", back_populates="card")
    insights = relationship("AIInsight", back_populates="card", cascade="all, delete-orphan")
    ebay_listings = relationship("EbaySoldListing", back_populates="card", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="card", cascade="all, delete-orphan")
