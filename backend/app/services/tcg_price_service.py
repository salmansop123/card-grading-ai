"""Shared helpers for storing TCGPlayer / Cardmarket prices from Pokémon TCG API."""

import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.price_history import PriceHistory
from app.services.card_identity_service import CardIdentityService
from app.utils.cache_utils import cache_delete


def store_tcg_price_history(
    db: Session,
    card: Card,
    price_data: dict,
    *,
    commit: bool = True,
) -> Optional[PriceHistory]:
    """Persist a price_history row from extract_market_prices() output."""
    estimated = price_data.get("estimated_value")
    if estimated is None:
        card.pricing_status = "unavailable"
        if commit:
            db.commit()
        return None

    history = PriceHistory(
        card_id=card.id,
        estimated_value=Decimal(str(estimated)),
        confidence_score=0.6,
        raw_price=Decimal(str(estimated)),
        ebay_sales_count=0,
    )
    db.add(history)
    card.pricing_status = "complete"
    if commit:
        db.commit()
        db.refresh(history)
    cache_delete(f"card_price:{card.id}")
    return history


async def fetch_and_store_tcg_prices(db: Session, card: Card) -> Optional[PriceHistory]:
    """Fetch fresh TCGPlayer/Cardmarket prices for a card and store them."""
    if not card.pokemon_tcg_id:
        return None

    identity = CardIdentityService()
    raw = await identity.get_raw_card_by_id(card.pokemon_tcg_id)
    if not raw:
        return None

    price_data = CardIdentityService.extract_market_prices(raw)
    return store_tcg_price_history(db, card, price_data)
