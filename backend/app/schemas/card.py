from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CardBase(BaseModel):
    card_name: str
    set_name: Optional[str] = None
    set_code: Optional[str] = None
    card_number: Optional[str] = None
    year: Optional[int] = None
    rarity: Optional[str] = None
    card_type: Optional[str] = "pokemon"
    language: Optional[str] = "English"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class CardResponse(CardBase):
    id: UUID
    pokemon_tcg_id: Optional[str] = None
    scan_status: str
    pricing_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CardDetailResponse(CardResponse):
    latest_price: Optional["PriceSnapshot"] = None
    price_history: list["PriceHistoryPoint"] = []
    ebay_sales: list["EbaySaleResponse"] = []
    insight: Optional["CardInsightSummary"] = None


class CardSearchResult(BaseModel):
    pokemon_tcg_id: str
    card_name: str
    set_name: Optional[str] = None
    set_code: Optional[str] = None
    card_number: Optional[str] = None
    rarity: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    year: Optional[int] = None
    card_type: str = "pokemon"
    hp: Optional[str] = None
    types: list[str] = []
    # Backward-compatible aliases for existing search page
    id: Optional[str] = None
    name: Optional[str] = None
    number: Optional[str] = None

    @classmethod
    def from_pokemon_data(cls, data: dict) -> "CardSearchResult":
        return cls(
            pokemon_tcg_id=data["pokemon_tcg_id"],
            card_name=data["card_name"],
            set_name=data.get("set_name"),
            set_code=data.get("set_code"),
            card_number=data.get("card_number"),
            rarity=data.get("rarity"),
            image_url=data.get("image_url"),
            thumbnail_url=data.get("thumbnail_url"),
            year=data.get("year"),
            card_type=data.get("card_type", "pokemon"),
            hp=data.get("hp"),
            types=data.get("types") or [],
            id=data["pokemon_tcg_id"],
            name=data["card_name"],
            number=data.get("card_number"),
        )


class CardStatusResponse(BaseModel):
    card_id: UUID
    pricing_status: str
    scan_status: str


class ScanInitResponse(BaseModel):
    scan_id: UUID
    status: str
    poll_url: str


class ScanStatusResponse(BaseModel):
    status: str
    confidence: Optional[float] = None
    requires_confirmation: bool = False
    card: Optional[CardResponse] = None
    extracted_data: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None


class PriceSnapshot(BaseModel):
    estimated_value: Optional[float] = None
    confidence_score: Optional[float] = None
    raw_price: Optional[float] = None
    psa8_price: Optional[float] = None
    psa9_price: Optional[float] = None
    psa10_price: Optional[float] = None
    pct_change_7d: Optional[float] = None
    pct_change_30d: Optional[float] = None
    volatility_score: Optional[float] = None
    recorded_at: Optional[datetime] = None


class PriceHistoryPoint(BaseModel):
    recorded_at: datetime
    estimated_value: Optional[float] = None
    raw_price: Optional[float] = None
    psa8_price: Optional[float] = None
    psa9_price: Optional[float] = None
    psa10_price: Optional[float] = None


class EbaySaleResponse(BaseModel):
    id: UUID
    title: Optional[str] = None
    sold_price: Optional[float] = None
    condition: Optional[str] = None
    sold_date: Optional[datetime] = None
    listing_url: Optional[str] = None

    model_config = {"from_attributes": True}


class CardInsightSummary(BaseModel):
    market_trend: Optional[str] = None
    investment_signal: Optional[str] = None
    summary: Optional[str] = None
    grade_recommendation: Optional[bool] = None
    grade_roi_estimate: Optional[float] = None


class CardSearchParams(BaseModel):
    q: str = Field(..., min_length=1)
    set: Optional[str] = None
    type: Optional[str] = "pokemon"


CardDetailResponse.model_rebuild()
