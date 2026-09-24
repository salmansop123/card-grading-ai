from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class CardInsightResponse(BaseModel):
    card_id: UUID
    market_trend: Optional[str] = None
    trend_reason: Optional[str] = None
    investment_signal: Optional[str] = None
    signal_reasoning: Optional[str] = None
    grade_recommendation: Optional[bool] = None
    grade_roi_estimate: Optional[float] = None
    key_risks: Optional[list[str]] = None
    key_catalysts: Optional[list[str]] = None
    summary: Optional[str] = None
    generated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class GradingCandidate(BaseModel):
    card_id: UUID
    card_name: str
    raw_price: float
    psa10_price: float
    estimated_roi_pct: float
    reasoning: str


class SellCandidate(BaseModel):
    card_id: UUID
    card_name: str
    reasoning: str


class PortfolioInsightResponse(BaseModel):
    portfolio_health: str
    total_value_assessment: str
    top_grading_candidates: list[GradingCandidate] = []
    sell_candidates: list[SellCandidate] = []
    concentration_warnings: list[str] = []
    market_opportunities: list[str] = []
    overall_recommendation: str
    generated_at: Optional[datetime] = None
    raw_report: Optional[dict[str, Any]] = None
