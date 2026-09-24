"""Shared portfolio value calculations used by summary and performance endpoints."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Iterable

from app.models.portfolio import PortfolioHolding
from app.models.price_history import PriceHistory


def compute_total_cost(holdings: Iterable[PortfolioHolding]) -> float:
    total = 0.0
    for holding in holdings:
        if holding.purchase_price:
            total += float(holding.purchase_price) * holding.quantity
    return round(total, 2)


def compute_holding_market_value(current_value: float | None, quantity: int) -> float:
    if not current_value:
        return 0.0
    return current_value * quantity


def group_price_history_by_card(
    history: Iterable[PriceHistory],
) -> dict:
    by_card: dict = {}
    for record in history:
        by_card.setdefault(record.card_id, []).append(record)
    for records in by_card.values():
        records.sort(key=lambda r: r.recorded_at)
    return by_card


def latest_price_on_or_before(
    records: list[PriceHistory],
    target_date: date,
) -> float | None:
    best: PriceHistory | None = None
    for record in records:
        record_date = record.recorded_at.date()
        if record_date <= target_date and (best is None or record_date >= best.recorded_at.date()):
            best = record
    if best and best.estimated_value is not None:
        return float(best.estimated_value)
    return None


def compute_portfolio_market_value_on_date(
    holdings: list[PortfolioHolding],
    by_card: dict,
    target_date: date,
) -> float:
    total = 0.0
    for holding in holdings:
        price = latest_price_on_or_before(by_card.get(holding.card_id, []), target_date)
        if price is not None:
            total += price * holding.quantity
    return round(total, 2)


def collect_performance_dates(
    history: Iterable[PriceHistory],
    days: int,
) -> list[date]:
    today = datetime.now(timezone.utc).date()
    cutoff = today - timedelta(days=days)
    dates = {record.recorded_at.date() for record in history if record.recorded_at.date() >= cutoff}
    dates.add(today)
    return sorted(dates)
