import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"
    __table_args__ = (
        Index(
            "uq_holding_identity_active",
            "user_id",
            "card_id",
            "condition",
            "is_graded",
            "grading_company",
            "grade",
            unique=True,
            postgresql_where=text("is_deleted = false AND is_sold = false"),
        ),
        Index("idx_portfolio_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    condition: Mapped[str | None] = mapped_column(String(50), default="raw")
    is_graded: Mapped[bool] = mapped_column(Boolean, default=False)
    grading_company: Mapped[str | None] = mapped_column(String(10), nullable=True)
    grade: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_uploaded_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_sold: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sold_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    sold_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sold_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="holdings")
    card = relationship("Card", back_populates="holdings")
