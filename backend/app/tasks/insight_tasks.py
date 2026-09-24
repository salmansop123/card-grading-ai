import asyncio
import logging
import os
import uuid

from celery import shared_task
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.services.ai_insights_service import AIInsightsService

logger = logging.getLogger(__name__)


def _get_db() -> Session:
    return SessionLocal()


@shared_task
def generate_card_insight(card_id: str, user_id: str):
    if not os.getenv("OPENROUTER_API_KEY"):
        logger.warning(
            "OPENROUTER_API_KEY not set — skipping card insight generation for card_id=%s",
            card_id,
        )
        return {"status": "skipped", "reason": "OPENROUTER_API_KEY not set", "card_id": card_id}

    db = _get_db()
    try:
        service = AIInsightsService()
        asyncio.get_event_loop().run_until_complete(
            service.get_card_insight(db, uuid.UUID(card_id), uuid.UUID(user_id), force=True)
        )
        return {"status": "complete", "card_id": card_id}
    finally:
        db.close()


@shared_task
def generate_all_portfolio_reports():
    db = _get_db()
    try:
        users = db.query(User).all()
        service = AIInsightsService()
        for user in users:
            asyncio.get_event_loop().run_until_complete(service.get_portfolio_insight(db, user.id))
        return {"reports_generated": len(users)}
    finally:
        db.close()
