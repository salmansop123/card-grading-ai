from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.card import PriceSnapshot


class MarketPriceResponse(BaseModel):
    card_id: UUID
    prices: PriceSnapshot


class TrendingCard(BaseModel):
    card_id: UUID
    card_name: str
    set_name: Optional[str] = None
    image_url: Optional[str] = None
    current_value: Optional[float] = None
    pct_change_7d: Optional[float] = None
    trend: str


class TrendingResponse(BaseModel):
    cards: list[TrendingCard]
    updated_at: Optional[datetime] = None


class MoverCard(BaseModel):
    card_id: UUID
    card_name: str
    set_name: Optional[str] = None
    image_url: Optional[str] = None
    pct_change_24h: Optional[float] = None
    current_value: Optional[float] = None


class MoversResponse(BaseModel):
    gainers: list[MoverCard]
    losers: list[MoverCard]
