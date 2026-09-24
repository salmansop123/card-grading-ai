from datetime import datetime, timedelta, timezone

from celery import shared_task
from sqlalchemy import desc

from app.database import SessionLocal
from app.models.card import Card
from app.models.portfolio import PortfolioHolding
from app.models.price_history import PriceHistory
from app.utils.cache_utils import set_cached
import logging

logger = logging.getLogger(__name__)


@shared_task
def compute_trending_cards():
    db = SessionLocal()
    try:
        cards = db.query(Card).all()
        trending = []

        for card in cards:
            latest = (
                db.query(PriceHistory)
                .filter(PriceHistory.card_id == card.id)
                .order_by(desc(PriceHistory.recorded_at))
                .first()
            )
            if latest and latest.pct_change_7d is not None:
                trending.append(
                    {
                        "card_id": str(card.id),
                        "card_name": card.card_name,
                        "set_name": card.set_name,
                        "image_url": card.image_url,
                        "current_value": float(latest.estimated_value) if latest.estimated_value else None,
                        "pct_change_7d": latest.pct_change_7d,
                        "trend": "rising" if latest.pct_change_7d > 0 else "declining",
                    }
                )

        trending.sort(key=lambda x: abs(x.get("pct_change_7d", 0)), reverse=True)
        set_cached("trending_cards", trending[:20], ttl=3600)
        return {"count": len(trending[:20])}
    finally:
        db.close()


@shared_task
def purge_old_trash():
    """
    Cron: Daily
    Permanently deletes portfolio_holdings in trash for 30+ days.
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)

    db = SessionLocal()
    try:
        deleted_count = (
            db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.is_deleted == True,  # noqa: E712
                PortfolioHolding.deleted_at <= cutoff_date,
            )
            .delete()
        )
        db.commit()
        logger.info("Auto-purged %s cards from trash (30+ days old)", deleted_count)
        return {"deleted_count": deleted_count}
    finally:
        db.close()
