import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.card import Card
from app.models.price_history import PriceHistory
from app.schemas.card import PriceSnapshot
from app.schemas.market import MarketPriceResponse, MoverCard, MoversResponse, TrendingCard, TrendingResponse
from app.services.market_data_service import MarketDataService
from app.utils.auth_utils import CurrentUser, get_current_user
from app.utils.cache_utils import get_cached

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/trending", response_model=TrendingResponse)
async def get_trending(current_user: CurrentUser = Depends(get_current_user)):
    cached = get_cached("trending_cards") or []
    cards = [TrendingCard(**c) for c in cached]
    return TrendingResponse(cards=cards, updated_at=datetime.now(timezone.utc))


@router.get("/prices/{card_id}", response_model=MarketPriceResponse)
async def get_market_prices(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MarketDataService()
    latest = service.get_latest_price(db, card_id)
    prices = PriceSnapshot()
    if latest:
        prices = PriceSnapshot(
            estimated_value=float(latest.estimated_value) if latest.estimated_value else None,
            confidence_score=latest.confidence_score,
            raw_price=float(latest.raw_price) if latest.raw_price else None,
            psa8_price=float(latest.psa8_price) if latest.psa8_price else None,
            psa9_price=float(latest.psa9_price) if latest.psa9_price else None,
            psa10_price=float(latest.psa10_price) if latest.psa10_price else None,
            pct_change_7d=latest.pct_change_7d,
            pct_change_30d=latest.pct_change_30d,
            volatility_score=latest.volatility_score,
            recorded_at=latest.recorded_at,
        )
    return MarketPriceResponse(card_id=card_id, prices=prices)


@router.get("/movers", response_model=MoversResponse)
async def get_movers(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cards = db.query(Card).all()
    movers = []

    for card in cards:
        latest = (
            db.query(PriceHistory)
            .filter(PriceHistory.card_id == card.id)
            .order_by(desc(PriceHistory.recorded_at))
            .first()
        )
        if latest and latest.pct_change_7d is not None:
            movers.append(
                MoverCard(
                    card_id=card.id,
                    card_name=card.card_name,
                    set_name=card.set_name,
                    image_url=card.image_url,
                    pct_change_24h=latest.pct_change_7d,
                    current_value=float(latest.estimated_value) if latest.estimated_value else None,
                )
            )

    gainers = sorted([m for m in movers if (m.pct_change_24h or 0) > 0], key=lambda x: x.pct_change_24h or 0, reverse=True)[:5]
    losers = sorted([m for m in movers if (m.pct_change_24h or 0) < 0], key=lambda x: x.pct_change_24h or 0)[:5]
    return MoversResponse(gainers=gainers, losers=losers)
