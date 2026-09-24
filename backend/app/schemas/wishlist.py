from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.card import CardResponse


class WishlistAddRequest(BaseModel):
    pokemon_tcg_id: str
    target_price: Optional[float] = Field(default=None, ge=0)


class WishlistItemResponse(BaseModel):
    id: UUID
    card: CardResponse
    target_price: Optional[float] = None
    current_price: Optional[float] = None
    price_source: Optional[str] = None
    at_target: bool = False
    added_at: datetime

    model_config = {"from_attributes": True}


class WishlistResponse(BaseModel):
    items: list[WishlistItemResponse]
