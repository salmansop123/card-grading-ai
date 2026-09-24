import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    market_trend: Mapped[str | None] = mapped_column(String(50), nullable=True)
    trend_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    investment_signal: Mapped[str | None] = mapped_column(String(50), nullable=True)
    signal_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    grade_recommendation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    grade_roi_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    key_risks: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_catalysts: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    card = relationship("Card", back_populates="insights")
    user = relationship("User", back_populates="insights")
