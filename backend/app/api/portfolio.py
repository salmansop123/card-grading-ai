import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.card import Card
from app.models.portfolio import PortfolioHolding
from app.schemas.search import AddFromSearchRequest
from app.schemas.portfolio import (
    BatchAddRequestSchema,
    ManualAddCardResponse,
    ManualAddCardSchema,
    MarkSoldSchema,
    PortfolioAddRequest,
    PortfolioCompositionResponse,
    PortfolioHoldingResponse,
    PortfolioPerformanceResponse,
    PortfolioResponse,
    PortfolioSummary,
    PortfolioUpdateRequest,
    TrashHoldingResponse,
    TrashResponse,
)
from app.services.card_identity_service import CardIdentityService
from app.services.portfolio_service import PortfolioService
from app.services.tcg_price_service import fetch_and_store_tcg_prices, store_tcg_price_history
from app.tasks.price_tasks import fetch_card_prices, refresh_all_portfolio_prices
from app.utils.auth_utils import CurrentUser, get_current_user
from app.utils.cache_utils import cache_delete
from app.schemas.card import CardResponse

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
portfolio_service = PortfolioService()


@router.get("", response_model=PortfolioResponse)
async def get_portfolio(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return portfolio_service.get_portfolio(db, current_user.id)


@router.post("/add-from-search")
async def add_from_search(
    request: AddFromSearchRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Card).filter(Card.pokemon_tcg_id == request.pokemon_tcg_id).first()
    if not card:
        card = Card(
            card_name=request.name,
            set_name=request.set_name,
            set_code=request.set_code,
            card_number=request.card_number,
            rarity=request.rarity,
            image_url=request.image_url,
            thumbnail_url=request.image_url,
            year=request.year,
            pokemon_tcg_id=request.pokemon_tcg_id,
            card_type="pokemon",
            scan_status="identified",
            pricing_status="pending",
        )
        db.add(card)
        db.flush()

    holding, _merged = portfolio_service.add_holding(
        db,
        current_user.id,
        card.id,
        quantity=request.quantity,
        condition=request.condition,
        purchase_price=request.purchase_price,
    )
    fetch_card_prices.delay(str(card.id))
    return {"holding_id": str(holding.id), "card_id": str(card.id), "status": "added"}


@router.post("/manual-add", response_model=ManualAddCardResponse)
async def manual_add_card(
    payload: ManualAddCardSchema,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a card via pokemon_tcg_id with synchronous TCGPlayer price fetch."""
    identity_service = CardIdentityService()
    raw_card = await identity_service.get_raw_card_by_id(payload.pokemon_tcg_id)
    if not raw_card:
        raise HTTPException(status_code=404, detail="Card not found in Pokémon TCG database")

    card_data = CardIdentityService.parse_card_identity(raw_card)
    price_data = CardIdentityService.extract_market_prices(raw_card)

    card = db.query(Card).filter(Card.pokemon_tcg_id == payload.pokemon_tcg_id).first()
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
    else:
        if not card.image_url and card_data["image_url"]:
            card.image_url = card_data["image_url"]
        if not card.thumbnail_url and card_data["thumbnail_url"]:
            card.thumbnail_url = card_data["thumbnail_url"]
        db.flush()

    try:
        holding, merged = portfolio_service.add_holding(
            db,
            current_user.id,
            card.id,
            quantity=payload.quantity,
            condition=payload.condition,
            purchase_price=payload.purchase_price,
            purchase_date=payload.purchase_date,
            notes=payload.notes,
            is_graded=payload.is_graded,
            grading_company=payload.grading_company,
            grade=payload.grade,
            commit=False,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    store_tcg_price_history(db, card, price_data, commit=False)
    db.commit()
    db.refresh(holding)
    db.refresh(card)
    cache_delete(f"portfolio:{current_user.id}")

    estimated = float(price_data["estimated_value"]) if price_data.get("estimated_value") else None

    merge_message = None
    if merged:
        merge_message = (
            f"Updated quantity — you now own {holding.quantity} of this exact "
            "card/condition/grade combination"
        )

    return ManualAddCardResponse(
        holding_id=holding.id,
        card_id=card.id,
        card=CardResponse.model_validate(card),
        pricing_status=card.pricing_status,
        estimated_value=estimated,
        price_source=price_data.get("source"),
        merged=merged,
        message=merge_message,
        quantity=holding.quantity,
    )


@router.post("/batch-add")
async def batch_add_cards(
    payload: BatchAddRequestSchema,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add multiple cards with multiple condition/grade stacks in one request."""
    identity_service = CardIdentityService()
    results = []
    errors = []

    for card_entry in payload.cards:
        try:
            raw_card = await identity_service.get_raw_card_by_id(card_entry.pokemon_tcg_id)
            if not raw_card:
                errors.append(
                    {"pokemon_tcg_id": card_entry.pokemon_tcg_id, "error": "Card not found"}
                )
                continue

            card_data = CardIdentityService.parse_card_identity(raw_card)
            price_data = CardIdentityService.extract_market_prices(raw_card)

            card = db.query(Card).filter(Card.pokemon_tcg_id == card_entry.pokemon_tcg_id).first()
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
            else:
                if not card.image_url and card_data["image_url"]:
                    card.image_url = card_data["image_url"]
                if not card.thumbnail_url and card_data["thumbnail_url"]:
                    card.thumbnail_url = card_data["thumbnail_url"]
                db.flush()

            store_tcg_price_history(db, card, price_data, commit=False)

            card_holdings = []
            for stack in card_entry.stacks:
                condition = stack.condition if not stack.is_graded else (stack.condition or "Near Mint")
                holding, merged = portfolio_service.add_holding(
                    db,
                    current_user.id,
                    card.id,
                    quantity=stack.quantity,
                    condition=condition,
                    purchase_price=stack.purchase_price,
                    purchase_date=stack.purchase_date,
                    notes=stack.notes,
                    is_graded=stack.is_graded,
                    grading_company=stack.grading_company,
                    grade=stack.grade,
                    commit=False,
                )
                db.flush()
                card_holdings.append(
                    {
                        "holding_id": str(holding.id),
                        "merged": merged,
                        "quantity": holding.quantity,
                    }
                )

            estimated = (
                float(price_data["estimated_value"]) if price_data.get("estimated_value") else None
            )
            results.append(
                {
                    "pokemon_tcg_id": card_entry.pokemon_tcg_id,
                    "card_id": str(card.id),
                    "card_name": card_data["card_name"],
                    "image_url": card_data.get("image_url"),
                    "estimated_value": estimated,
                    "holdings": card_holdings,
                }
            )
        except Exception as exc:
            errors.append({"pokemon_tcg_id": card_entry.pokemon_tcg_id, "error": str(exc)})

    db.commit()
    cache_delete(f"portfolio:{current_user.id}")

    return {
        "success_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors,
    }


@router.post("/add")
async def add_to_portfolio(
    request: PortfolioAddRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        holding, _merged = portfolio_service.add_holding(
            db,
            current_user.id,
            request.card_id,
            quantity=request.quantity,
            condition=request.condition,
            purchase_price=request.purchase_price,
            purchase_date=request.purchase_date,
            notes=request.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    card = db.query(Card).filter(Card.id == request.card_id).first()
    if card and card.pricing_status != "complete":
        fetch_card_prices.delay(str(card.id))

    return {"holding_id": str(holding.id), "status": "added"}


@router.get("/holdings-for-card/{pokemon_tcg_id}", response_model=list[PortfolioHoldingResponse])
async def get_holdings_for_card(
    pokemon_tcg_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return portfolio_service.get_holdings_for_card(db, current_user.id, pokemon_tcg_id)


@router.get("/sold", response_model=list[PortfolioHoldingResponse])
async def get_sold_cards(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return portfolio_service.get_sold_holdings(db, current_user.id)


@router.post("/sold/{holding_id}/revert")
async def revert_sold_card(
    holding_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return portfolio_service.revert_sold_card(db, current_user.id, holding_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{holding_id}")
async def update_holding(
    holding_id: uuid.UUID,
    request: PortfolioUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    holding = portfolio_service.update_holding(
        db,
        holding_id,
        current_user.id,
        quantity=request.quantity,
        condition=request.condition,
        purchase_price=request.purchase_price,
        purchase_date=request.purchase_date,
        notes=request.notes,
    )
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"status": "updated", "holding_id": str(holding.id)}


@router.get("/trash", response_model=TrashResponse)
async def get_trash(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = portfolio_service.get_trash(db, current_user.id)
    return TrashResponse(items=items)


@router.delete("/trash")
async def empty_trash(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted_count = portfolio_service.empty_trash(db, current_user.id)
    return {"message": f"Trash emptied — {deleted_count} cards permanently deleted"}


@router.post("/trash/{holding_id}/restore")
async def restore_from_trash(
    holding_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    restored = portfolio_service.restore_holding(db, holding_id, current_user.id)
    if not restored:
        raise HTTPException(status_code=404, detail="Trashed card not found")
    return {"message": "Card restored", "holding_id": str(holding_id)}


@router.delete("/trash/{holding_id}")
async def permanently_delete(
    holding_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = portfolio_service.permanent_delete_holding(db, holding_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Trashed card not found")
    return {"message": "Card permanently deleted"}


@router.post("/{holding_id}/mark-sold")
async def mark_card_sold(
    holding_id: uuid.UUID,
    payload: MarkSoldSchema,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return portfolio_service.mark_card_sold(
            db,
            current_user.id,
            holding_id,
            payload.sold_price,
            payload.sold_date,
            payload.sold_quantity,
        )
    except ValueError as exc:
        status = 400 if "Cannot sell" in str(exc) else 404
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.delete("/{holding_id}")
async def remove_holding(
    holding_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    removed = portfolio_service.remove_holding(db, holding_id, current_user.id)
    if not removed:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"message": "Card moved to trash", "holding_id": str(holding_id)}


@router.post("/refresh")
async def refresh_portfolio(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cache_delete(f"portfolio:{current_user.id}")

    try:
        refresh_all_portfolio_prices.delay()
        return {"status": "refreshing", "mode": "async"}
    except Exception:
        holdings = (
            db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.user_id == current_user.id,
                PortfolioHolding.is_deleted == False,  # noqa: E712
                PortfolioHolding.is_sold == False,  # noqa: E712
            )
            .all()
        )
        card_ids = list({h.card_id for h in holdings})
        refreshed = 0
        for card_id in card_ids:
            card = db.query(Card).filter(Card.id == card_id).first()
            if not card:
                continue
            try:
                result = await fetch_and_store_tcg_prices(db, card)
                if result:
                    refreshed += 1
            except Exception:
                continue

        cache_delete(f"portfolio:{current_user.id}")
        return {"status": "refreshed", "mode": "sync", "count": refreshed}


@router.get("/stats", response_model=PortfolioSummary)
async def get_portfolio_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = portfolio_service.get_portfolio(db, current_user.id)
    return portfolio.summary


@router.get("/performance", response_model=PortfolioPerformanceResponse)
async def get_portfolio_performance(
    days: int = Query(30, ge=1, le=365),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    points = portfolio_service.get_performance(db, current_user.id, days=days)
    return PortfolioPerformanceResponse(points=points)


@router.get("/composition", response_model=PortfolioCompositionResponse)
async def get_portfolio_composition(
    group_by: str = Query("set", pattern="^(set|rarity)$"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return portfolio_service.get_composition(db, current_user.id, group_by=group_by)
