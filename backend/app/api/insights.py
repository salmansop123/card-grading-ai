import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.insights import CardInsightResponse, PortfolioInsightResponse
from app.services.ai_insights_service import AIInsightsService
from app.utils.auth_utils import CurrentUser, get_current_user

router = APIRouter(prefix="/insights", tags=["insights"])
insights_service = AIInsightsService()


@router.get("/card/{card_id}")
async def get_card_insight(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not os.getenv("OPENROUTER_API_KEY"):
        return {
            "available": False,
            "message": "AI insights are not currently enabled.",
        }
    try:
        return await insights_service.get_card_insight(db, card_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/portfolio", response_model=PortfolioInsightResponse)
async def get_portfolio_insight(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await insights_service.get_portfolio_insight(db, current_user.id)


@router.post("/generate/{card_id}", response_model=CardInsightResponse)
async def regenerate_card_insight(
    card_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not os.getenv("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=503, detail="AI insights are not currently enabled.")
    try:
        return await insights_service.get_card_insight(db, card_id, current_user.id, force=True)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
