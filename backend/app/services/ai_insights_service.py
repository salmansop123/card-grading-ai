import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.agents.market_agent import MarketAgent
from app.agents.portfolio_agent import PortfolioAgent
from app.models.ai_insights import AIInsight
from app.models.card import Card
from app.models.ebay_sold_listings import EbaySoldListing
from app.models.price_history import PriceHistory
from app.schemas.insights import CardInsightResponse, PortfolioInsightResponse
from app.services.portfolio_service import PortfolioService
from app.services.pricing_engine import PricingEngine
from app.utils.cache_utils import get_cached, set_cached


class AIInsightsService:
    def __init__(self):
        self.market_agent = MarketAgent()
        self.portfolio_agent = PortfolioAgent()
        self.portfolio_service = PortfolioService()
        self.pricing_engine = PricingEngine()

    async def get_card_insight(
        self, db: Session, card_id: uuid.UUID, user_id: uuid.UUID, force: bool = False
    ) -> CardInsightResponse:
        cache_key = f"ai_insight:{card_id}"
        if not force:
            cached = get_cached(cache_key)
            if cached:
                return CardInsightResponse(**cached)

            existing = (
                db.query(AIInsight)
                .filter(
                    AIInsight.card_id == card_id,
                    AIInsight.expires_at > datetime.now(timezone.utc),
                )
                .order_by(desc(AIInsight.generated_at))
                .first()
            )
            if existing:
                return self._insight_to_response(existing)

        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise ValueError("Card not found")

        latest = (
            db.query(PriceHistory)
            .filter(PriceHistory.card_id == card_id)
            .order_by(desc(PriceHistory.recorded_at))
            .first()
        )
        ebay_sales = (
            db.query(EbaySoldListing)
            .filter(EbaySoldListing.card_id == card_id)
            .order_by(desc(EbaySoldListing.sold_date))
            .limit(10)
            .all()
        )

        market_data = {
            "raw_price": float(latest.raw_price) if latest and latest.raw_price else None,
            "psa8_price": float(latest.psa8_price) if latest and latest.psa8_price else None,
            "psa9_price": float(latest.psa9_price) if latest and latest.psa9_price else None,
            "psa10_price": float(latest.psa10_price) if latest and latest.psa10_price else None,
            "pct_change_7d": latest.pct_change_7d if latest else None,
            "pct_change_30d": latest.pct_change_30d if latest else None,
            "volatility_score": latest.volatility_score if latest else None,
            "ebay_sales_summary": "\n".join(
                f"- ${s.sold_price} ({s.condition}) on {s.sold_date}" for s in ebay_sales
            ),
        }

        card_data = {
            "card_name": card.card_name,
            "set_name": card.set_name,
            "card_number": card.card_number,
            "card_type": card.card_type,
            "rarity": card.rarity,
        }

        if not os.getenv("OPENROUTER_API_KEY"):
            result = self.market_agent._fallback_insight(card_data, market_data)
        else:
            result = await self.market_agent.generate_insight(card_data, market_data)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        insight = AIInsight(
            card_id=card_id,
            user_id=user_id,
            market_trend=result.get("market_trend"),
            trend_reason=result.get("trend_reason"),
            investment_signal=result.get("investment_signal"),
            signal_reasoning=result.get("signal_reasoning"),
            grade_recommendation=result.get("grade_recommendation"),
            grade_roi_estimate=result.get("grade_roi_estimate"),
            key_risks=json.dumps(result.get("key_risks", [])),
            key_catalysts=json.dumps(result.get("key_catalysts", [])),
            summary=result.get("summary"),
            model_used=MarketAgent.MODEL,
            expires_at=expires_at,
        )
        db.add(insight)
        db.commit()

        response = self._insight_to_response(insight)
        set_cached(cache_key, response.model_dump(mode="json"), ttl=86400)
        return response

    async def get_portfolio_insight(self, db: Session, user_id: uuid.UUID) -> PortfolioInsightResponse:
        portfolio = self.portfolio_service.get_portfolio(db, user_id)
        portfolio_data = portfolio.model_dump(mode="json")
        if not os.getenv("OPENROUTER_API_KEY"):
            report = self.portfolio_agent._fallback_report(portfolio_data)
        else:
            report = await self.portfolio_agent.generate_report(portfolio_data)
        report = self._sanitize_portfolio_report(report)

        return PortfolioInsightResponse(
            portfolio_health=report.get("portfolio_health", "fair"),
            total_value_assessment=report.get("total_value_assessment", ""),
            top_grading_candidates=report.get("top_grading_candidates", []),
            sell_candidates=report.get("sell_candidates", []),
            concentration_warnings=report.get("concentration_warnings", []),
            market_opportunities=report.get("market_opportunities", []),
            overall_recommendation=report.get("overall_recommendation", ""),
            generated_at=datetime.now(timezone.utc),
            raw_report=report,
        )

    def _sanitize_portfolio_report(self, report: dict) -> dict:
        grading = []
        for item in report.get("top_grading_candidates", []):
            try:
                grading.append({**item, "card_id": uuid.UUID(str(item["card_id"]))})
            except (ValueError, KeyError, TypeError):
                continue

        sells = []
        for item in report.get("sell_candidates", []):
            try:
                sells.append({**item, "card_id": uuid.UUID(str(item["card_id"]))})
            except (ValueError, KeyError, TypeError):
                continue

        return {
            **report,
            "top_grading_candidates": grading,
            "sell_candidates": sells,
        }

    def _insight_to_response(self, insight: AIInsight) -> CardInsightResponse:
        key_risks = json.loads(insight.key_risks) if insight.key_risks else []
        key_catalysts = json.loads(insight.key_catalysts) if insight.key_catalysts else []
        return CardInsightResponse(
            card_id=insight.card_id,
            market_trend=insight.market_trend,
            trend_reason=insight.trend_reason,
            investment_signal=insight.investment_signal,
            signal_reasoning=insight.signal_reasoning,
            grade_recommendation=insight.grade_recommendation,
            grade_roi_estimate=insight.grade_roi_estimate,
            key_risks=key_risks,
            key_catalysts=key_catalysts,
            summary=insight.summary,
            generated_at=insight.generated_at,
            expires_at=insight.expires_at,
        )


class GradingService:
    def __init__(self):
        self.pricing_engine = PricingEngine()

    def get_grading_roi(self, db: Session, card_id: uuid.UUID) -> dict:
        latest = (
            db.query(PriceHistory)
            .filter(PriceHistory.card_id == card_id)
            .order_by(desc(PriceHistory.recorded_at))
            .first()
        )
        if not latest:
            return {}

        raw = float(latest.raw_price or latest.estimated_value or 0)
        psa9 = float(latest.psa9_price or 0)
        psa10 = float(latest.psa10_price or 0)
        return self.pricing_engine.calculate_grading_roi(raw, psa9, psa10)
