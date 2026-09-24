from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class AddFromSearchRequest(BaseModel):
    pokemon_tcg_id: str
    name: str
    set_name: Optional[str] = None
    set_code: Optional[str] = None
    card_number: Optional[str] = None
    rarity: Optional[str] = None
    image_url: Optional[str] = None
    year: Optional[int] = None
    quantity: int = 1
    condition: str = "raw"
    purchase_price: Optional[float] = None
