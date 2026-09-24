import asyncio
import uuid

from celery import shared_task
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.card import Card
from app.models.portfolio import PortfolioHolding
from app.services.market_data_service import MarketDataService


def _get_db() -> Session:
    return SessionLocal()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def fetch_card_prices(self, card_id: str):
    db = _get_db()
    try:
        card = db.query(Card).filter(Card.id == uuid.UUID(card_id)).first()
        if not card:
            return {"status": "not_found"}

        service = MarketDataService()
        asyncio.get_event_loop().run_until_complete(service.fetch_and_store_prices(db, card))
        return {"status": "complete", "card_id": card_id}
    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()


@shared_task
def refresh_all_portfolio_prices():
    db = _get_db()
    try:
        card_ids = (
            db.query(PortfolioHolding.card_id)
            .filter(
                PortfolioHolding.is_deleted == False,  # noqa: E712
                PortfolioHolding.is_sold == False,  # noqa: E712
            )
            .distinct()
            .all()
        )
        for (card_id,) in card_ids:
            fetch_card_prices.delay(str(card_id))
        return {"refreshed": len(card_ids)}
    finally:
        db.close()
