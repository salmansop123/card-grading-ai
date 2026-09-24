import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.card import Card
from app.models.ebay_sold_listings import EbaySoldListing
from app.models.price_history import PriceHistory
from app.models.scan_result import AIScanResult
from app.schemas.card import (
    CardDetailResponse,
    CardInsightSummary,
    CardResponse,
    CardSearchResult,
    CardStatusResponse,
    EbaySaleResponse,
    PriceHistoryPoint,
    PriceSnapshot,
    ScanInitResponse,
    ScanStatusResponse,
)
from app.services.card_identity_service import CardIdentityService
from app.services.card_scan_service import CardScanService
from app.services.ai_insights_service import GradingService
from app.services.tcg_price_service import fetch_and_store_tcg_prices
from app.tasks.price_tasks import fetch_card_prices
from app.utils.auth_utils import CurrentUser, get_current_user

router = APIRouter(prefix="/cards", tags=["cards"])


async def _ensure_card_price(db: Session, card: Card) -> None:
    """Fetch TCGPlayer price on-the-fly if no price history exists."""
    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.card_id == card.id)
        .order_by(desc(PriceHistory.recorded_at))
        .first()
    )
    if history or not card.pokemon_tcg_id:
        return
    await fetch_and_store_tcg_prices(db, card)


def _latest_price_snapshot(history: list[PriceHistory]) -> Optional[PriceSnapshot]:
    latest = history[0] if history else None
    if not latest:
        return None
    return PriceSnapshot(
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


@router.post("/scan", response_model=ScanInitResponse)
async def scan_card(
    image: UploadFile = File(...),
    card_type_hint: Optional[str] = Form(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not os.getenv("OPENROUTER_API_KEY"):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "AI card scanning is currently unavailable. Please use Manual Add instead.",
                "code": "AI_UNAVAILABLE",
            },
        )

    image_data = await image.read()
    service = CardScanService()
    scan_result = await service.scan_card_image(db, image_data, current_user.id, card_type_hint)

    if scan_result.card_id and scan_result.status in ("success", "requires_confirmation"):
        fetch_card_prices.delay(str(scan_result.card_id))

    return ScanInitResponse(
        scan_id=scan_result.id,
        status=scan_result.status or "processing",
        poll_url=f"/api/cards/scan/{scan_result.id}/status",
    )


@router.get("/scan/{scan_id}/status", response_model=ScanStatusResponse)
async def get_scan_status(
    scan_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scan = (
        db.query(AIScanResult)
        .filter(AIScanResult.id == scan_id, AIScanResult.user_id == current_user.id)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    card = None
    if scan.card_id:
        card = db.query(Card).filter(Card.id == scan.card_id).first()

    status_map = {
        "success": "complete",
        "requires_confirmation": "requires_confirmation",
        "low_confidence": "low_confidence",
        "failed": "failed",
        "processing": "processing",
    }

    return ScanStatusResponse(
        status=status_map.get(scan.status, scan.status or "processing"),
        confidence=scan.confidence,
        requires_confirmation=scan.status == "requires_confirmation",
        card=CardResponse.model_validate(card) if card else None,
        extracted_data=scan.extracted_data,
        error_message=scan.error_message,
    )


@router.post("/scan/{scan_id}/confirm", response_model=CardResponse)
async def confirm_scan(
    scan_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = CardScanService()
    card = service.confirm_scan(db, scan_id, current_user.id)
    if not card:
        raise HTTPException(status_code=404, detail="Scan not found or cannot be confirmed")
    fetch_card_prices.delay(str(card.id))
    return CardResponse.model_validate(card)


@router.get("/search", response_model=list[CardSearchResult])
async def search_cards(
    q: str = Query(..., min_length=2),
    page_size: int = Query(20, le=50),
    set: Optional[str] = None,
    type: Optional[str] = "pokemon",
    current_user: CurrentUser = Depends(get_current_user),
):
    if type != "pokemon":
        raise HTTPException(status_code=400, detail="Only Pokémon search is supported in MVP")

    from app.utils.cache_utils import get_cached, set_cached

    cache_key = f"pokemon_tcg:search:{q.lower().strip()}:{page_size}"
    cached = get_cached(cache_key)
    if cached:
        return [CardSearchResult(**item) for item in cached]

    service = CardIdentityService()
    results = await service.search_cards(query=q, set_code=set, page_size=page_size)
    response = [
        CardSearchResult.from_pokemon_data(r.to_search_dict())
        for r in results
    ]
    set_cached(cache_key, [r.model_dump() for r in response], ttl=43200)
    return response


@router.get("/{card_id}/status", response_model=CardStatusResponse)
async def get_card_status(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return CardStatusResponse(
        card_id=card.id,
        pricing_status=card.pricing_status,
        scan_status=card.scan_status,
    )


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return CardResponse.model_validate(card)


@router.get("/{card_id}/detail", response_model=CardDetailResponse)
async def get_card_detail(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await _ensure_card_price(db, card)

    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.card_id == card_id)
        .order_by(desc(PriceHistory.recorded_at))
        .limit(30)
        .all()
    )
    ebay_sales = (
        db.query(EbaySoldListing)
        .filter(EbaySoldListing.card_id == card_id)
        .order_by(desc(EbaySoldListing.sold_date))
        .limit(10)
        .all()
    )

    latest_price = _latest_price_snapshot(history)

    return CardDetailResponse(
        **CardResponse.model_validate(card).model_dump(),
        latest_price=latest_price,
        price_history=[
            PriceHistoryPoint(
                recorded_at=h.recorded_at,
                estimated_value=float(h.estimated_value) if h.estimated_value else None,
                raw_price=float(h.raw_price) if h.raw_price else None,
                psa8_price=float(h.psa8_price) if h.psa8_price else None,
                psa9_price=float(h.psa9_price) if h.psa9_price else None,
                psa10_price=float(h.psa10_price) if h.psa10_price else None,
            )
            for h in history
        ],
        ebay_sales=[EbaySaleResponse.model_validate(s) for s in ebay_sales],
    )


@router.get("/{card_id}/price-history", response_model=list[PriceHistoryPoint])
async def get_price_history(
    card_id: uuid.UUID,
    days: int = 30,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.card_id == card_id)
        .order_by(desc(PriceHistory.recorded_at))
        .limit(days)
        .all()
    )
    return [
        PriceHistoryPoint(
            recorded_at=h.recorded_at,
            estimated_value=float(h.estimated_value) if h.estimated_value else None,
            raw_price=float(h.raw_price) if h.raw_price else None,
            psa8_price=float(h.psa8_price) if h.psa8_price else None,
            psa9_price=float(h.psa9_price) if h.psa9_price else None,
            psa10_price=float(h.psa10_price) if h.psa10_price else None,
        )
        for h in history
    ]


@router.get("/{card_id}/ebay-sales", response_model=list[EbaySaleResponse])
async def get_ebay_sales(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sales = (
        db.query(EbaySoldListing)
        .filter(EbaySoldListing.card_id == card_id)
        .order_by(desc(EbaySoldListing.sold_date))
        .limit(10)
        .all()
    )
    return [EbaySaleResponse.model_validate(s) for s in sales]


@router.post("/{card_id}/refresh-price")
async def refresh_card_price(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if card.pokemon_tcg_id:
        await fetch_and_store_tcg_prices(db, card)
        return {"status": "complete", "card_id": str(card_id), "pricing_status": card.pricing_status}
    card.pricing_status = "pending"
    db.commit()
    fetch_card_prices.delay(str(card_id))
    return {"status": "refreshing", "card_id": str(card_id)}


@router.get("/{card_id}/grading-roi")
async def get_grading_roi(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = GradingService()
    return service.get_grading_roi(db, card_id)
