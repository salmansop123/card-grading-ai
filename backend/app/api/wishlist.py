import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.card import Card
from app.models.price_history import PriceHistory
from app.models.wishlist import WishlistItem
from app.schemas.card import CardResponse
from app.schemas.wishlist import WishlistAddRequest, WishlistItemResponse, WishlistResponse
from app.services.card_identity_service import CardIdentityService
from app.services.tcg_price_service import fetch_and_store_tcg_prices, store_tcg_price_history
from app.utils.auth_utils import CurrentUser, get_current_user

router = APIRouter(prefix="/wishlist", tags=["wishlist"])
identity_service = CardIdentityService()


async def _get_or_create_card(db: Session, pokemon_tcg_id: str) -> tuple[Card, dict]:
    raw_card = await identity_service.get_raw_card_by_id(pokemon_tcg_id)
    if not raw_card:
        raise HTTPException(status_code=404, detail="Card not found in Pokémon TCG database")

    card_data = CardIdentityService.parse_card_identity(raw_card)
    price_data = CardIdentityService.extract_market_prices(raw_card)

    card = db.query(Card).filter(Card.pokemon_tcg_id == pokemon_tcg_id).first()
    if not card:
        card = Card(
            card_name=card_data["card_name"],
            set_name=card_data["set_name"],
            set_code=card_data["set_code"],
            card_number=card_data["card_number"],
            rarity=card_data["rarity"],
            image_url=card_data["image_url"],
            thumbnail_url=card_data["thumbnail_url"] or card_data["image_url"],
            year=card_data["year"],
            pokemon_tcg_id=card_data["pokemon_tcg_id"],
            card_type="pokemon",
            scan_status="identified",
            pricing_status="pending",
        )
        db.add(card)
        db.flush()
    store_tcg_price_history(db, card, price_data, commit=False)
    return card, price_data


def _latest_price(db: Session, card_id: uuid.UUID) -> tuple[float | None, str | None]:
    latest = (
        db.query(PriceHistory)
        .filter(PriceHistory.card_id == card_id)
        .order_by(desc(PriceHistory.recorded_at))
        .first()
    )
    if not latest or not latest.estimated_value:
        return None, None
    return float(latest.estimated_value), "tcgplayer"


async def _maybe_refresh_price(db: Session, card: Card, item: WishlistItem) -> tuple[float | None, str | None]:
    stale_cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    latest = (
        db.query(PriceHistory)
        .filter(PriceHistory.card_id == card.id)
        .order_by(desc(PriceHistory.recorded_at))
        .first()
    )
    if latest and latest.recorded_at and latest.recorded_at > stale_cutoff:
        return (
            float(latest.estimated_value) if latest.estimated_value else None,
            "tcgplayer",
        )
    if card.pokemon_tcg_id:
        await fetch_and_store_tcg_prices(db, card)
    return _latest_price(db, card.id)


def _item_response(
    item: WishlistItem,
    current_price: float | None,
    price_source: str | None,
) -> WishlistItemResponse:
    target = float(item.target_price) if item.target_price else None
    at_target = target is not None and current_price is not None and current_price <= target
    return WishlistItemResponse(
        id=item.id,
        card=CardResponse.model_validate(item.card),
        target_price=target,
        current_price=current_price,
        price_source=price_source,
        at_target=at_target,
        added_at=item.added_at,
    )


@router.get("", response_model=WishlistResponse)
async def get_wishlist(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.card))
        .filter(WishlistItem.user_id == current_user.id)
        .order_by(desc(WishlistItem.added_at))
        .all()
    )
    responses = []
    for item in items:
        current_price, price_source = await _maybe_refresh_price(db, item.card, item)
        responses.append(_item_response(item, current_price, price_source))
    return WishlistResponse(items=responses)


@router.post("/add", response_model=WishlistItemResponse)
async def add_to_wishlist(
    payload: WishlistAddRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card, price_data = await _get_or_create_card(db, payload.pokemon_tcg_id)

    existing = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == current_user.id, WishlistItem.card_id == card.id)
        .first()
    )
    if existing:
        if payload.target_price is not None:
            existing.target_price = Decimal(str(payload.target_price))
        db.commit()
        db.refresh(existing)
        item = existing
    else:
        item = WishlistItem(
            user_id=current_user.id,
            card_id=card.id,
            target_price=Decimal(str(payload.target_price)) if payload.target_price else None,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

    item = (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.card))
        .filter(WishlistItem.id == item.id)
        .first()
    )
    estimated = float(price_data["estimated_value"]) if price_data.get("estimated_value") else None
    return _item_response(item, estimated, price_data.get("source"))


@router.delete("/{wishlist_item_id}")
async def remove_from_wishlist(
    wishlist_item_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(WishlistItem)
        .filter(WishlistItem.id == wishlist_item_id, WishlistItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    db.delete(item)
    db.commit()
    return {"status": "removed"}
