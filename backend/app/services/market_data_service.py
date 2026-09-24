import os
import statistics
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.ebay_sold_listings import EbaySoldListing
from app.models.price_history import PriceHistory
from app.services.card_identity_service import CardIdentityService
from app.services.ebay_service import EbayService
from app.services.price_charting_service import PriceChartingService
from app.services.pricing_engine import PricingEngine
from app.services.tcg_price_service import fetch_and_store_tcg_prices, store_tcg_price_history
from app.utils.cache_utils import cache_delete, get_cached, set_cached

EBAY_ENABLED = bool(os.getenv("EBAY_APP_ID"))


class MarketDataService:
    def __init__(self):
        self.price_charting = PriceChartingService()
        self.ebay = EbayService()
        self.pricing_engine = PricingEngine()
        self.identity = CardIdentityService()

    async def fetch_and_store_prices(self, db: Session, card: Card) -> PriceHistory:
        # Prefer synchronous TCGPlayer prices when pokemon_tcg_id is available
        if card.pokemon_tcg_id:
            tcg_history = await fetch_and_store_tcg_prices(db, card)
            if tcg_history:
                return tcg_history

        pc_prices = await self.price_charting.get_card_prices(card)
        ebay_sales = []
        if EBAY_ENABLED:
            ebay_sales = await self.ebay.get_sold_listings(card, limit=10)
        raw_prices = [s.price for s in ebay_sales]

        try:
            estimate = self.pricing_engine.calculate_estimated_value(
                pricecharting_raw=pc_prices.raw,
                ebay_sales=raw_prices,
            )
        except ValueError:
            last_price = self.get_latest_price(db, card.id)
            if last_price:
                card.pricing_status = "complete"
                db.commit()
                return last_price
            card.pricing_status = "unavailable"
            db.commit()
            raise

        volatility = self.pricing_engine.calculate_volatility_score(raw_prices)
        price_7d, price_30d = self._get_historical_prices(db, card.id)

        history = PriceHistory(
            card_id=card.id,
            estimated_value=Decimal(str(estimate.estimated_value)),
            confidence_score=estimate.confidence,
            raw_price=Decimal(str(estimate.estimated_value)),
            psa8_price=Decimal(str(pc_prices.psa8)) if pc_prices.psa8 else None,
            psa9_price=Decimal(str(pc_prices.psa9)) if pc_prices.psa9 else None,
            psa10_price=Decimal(str(pc_prices.psa10)) if pc_prices.psa10 else None,
            pricecharting_raw=Decimal(str(pc_prices.raw)) if pc_prices.raw else None,
            pricecharting_psa9=Decimal(str(pc_prices.psa9)) if pc_prices.psa9 else None,
            pricecharting_psa10=Decimal(str(pc_prices.psa10)) if pc_prices.psa10 else None,
            ebay_avg_last_10=Decimal(str(statistics.mean(raw_prices))) if raw_prices else None,
            ebay_median_last_10=Decimal(str(statistics.median(raw_prices))) if raw_prices else None,
            ebay_sales_count=len(raw_prices),
            price_7d_ago=price_7d,
            price_30d_ago=price_30d,
            pct_change_7d=self._pct_change(float(estimate.estimated_value), float(price_7d) if price_7d else None),
            pct_change_30d=self._pct_change(float(estimate.estimated_value), float(price_30d) if price_30d else None),
            volatility_score=volatility,
        )
        db.add(history)

        if EBAY_ENABLED:
            for sale in ebay_sales:
                db.add(
                    EbaySoldListing(
                        card_id=card.id,
                        ebay_item_id=sale.ebay_item_id,
                        title=sale.title,
                        sold_price=Decimal(str(sale.price)),
                        condition=sale.condition,
                        sold_date=sale.sold_date,
                        listing_url=sale.listing_url,
                    )
                )

        card.pricing_status = "complete"
        db.commit()
        db.refresh(history)

        cache_delete(f"card_price:{card.id}")
        set_cached(
            f"card_price:{card.id}",
            {
                "estimated_value": float(history.estimated_value) if history.estimated_value else None,
                "raw_price": float(history.raw_price) if history.raw_price else None,
                "psa8_price": float(history.psa8_price) if history.psa8_price else None,
                "psa9_price": float(history.psa9_price) if history.psa9_price else None,
                "psa10_price": float(history.psa10_price) if history.psa10_price else None,
                "pct_change_7d": history.pct_change_7d,
                "pct_change_30d": history.pct_change_30d,
                "volatility_score": history.volatility_score,
                "recorded_at": history.recorded_at.isoformat(),
            },
            ttl=3600,
        )
        return history

    def get_latest_price(self, db: Session, card_id: uuid.UUID) -> Optional[PriceHistory]:
        cached = get_cached(f"card_price:{card_id}")
        if cached:
            history = (
                db.query(PriceHistory)
                .filter(PriceHistory.card_id == card_id)
                .order_by(desc(PriceHistory.recorded_at))
                .first()
            )
            return history

        return (
            db.query(PriceHistory)
            .filter(PriceHistory.card_id == card_id)
            .order_by(desc(PriceHistory.recorded_at))
            .first()
        )

    def _get_historical_prices(self, db: Session, card_id: uuid.UUID) -> tuple[Optional[Decimal], Optional[Decimal]]:
        now = datetime.now(timezone.utc)
        price_7d = self._price_at_date(db, card_id, now - timedelta(days=7))
        price_30d = self._price_at_date(db, card_id, now - timedelta(days=30))
        return price_7d, price_30d

    def _price_at_date(self, db: Session, card_id: uuid.UUID, target: datetime) -> Optional[Decimal]:
        record = (
            db.query(PriceHistory)
            .filter(PriceHistory.card_id == card_id, PriceHistory.recorded_at <= target)
            .order_by(desc(PriceHistory.recorded_at))
            .first()
        )
        return record.estimated_value if record else None

    def _pct_change(self, current: float, previous: Optional[float]) -> Optional[float]:
        if previous is None or previous == 0:
            return None
        return round(((current - previous) / previous) * 100, 2)
