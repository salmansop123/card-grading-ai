from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock
import uuid

import pytest

from app.utils.portfolio_value_utils import (
    collect_performance_dates,
    compute_holding_market_value,
    compute_portfolio_market_value_on_date,
    compute_total_cost,
    group_price_history_by_card,
    latest_price_on_or_before,
)


def _price_record(card_id, recorded_at, value):
    record = MagicMock()
    record.card_id = card_id
    record.recorded_at = recorded_at
    record.estimated_value = Decimal(str(value))
    return record


class TestPortfolioValueUtils:
    def test_compute_total_cost_multiplies_quantity(self):
        holding = MagicMock()
        holding.purchase_price = Decimal("50")
        holding.quantity = 2
        assert compute_total_cost([holding]) == 100.0

    def test_compute_holding_market_value(self):
        assert compute_holding_market_value(20.3, 2) == 40.6
        assert compute_holding_market_value(None, 1) == 0.0

    def test_latest_price_on_or_before(self):
        card_id = uuid.uuid4()
        records = [
            _price_record(card_id, datetime(2025, 6, 1, tzinfo=timezone.utc), 10),
            _price_record(card_id, datetime(2025, 6, 10, tzinfo=timezone.utc), 15),
            _price_record(card_id, datetime(2025, 6, 20, tzinfo=timezone.utc), 20),
        ]
        assert latest_price_on_or_before(records, date(2025, 6, 5)) == 10.0
        assert latest_price_on_or_before(records, date(2025, 6, 10)) == 15.0
        assert latest_price_on_or_before(records, date(2025, 6, 25)) == 20.0

    def test_compute_portfolio_market_value_on_date(self):
        card_a = uuid.uuid4()
        card_b = uuid.uuid4()
        holding_a = MagicMock(card_id=card_a, quantity=1)
        holding_b = MagicMock(card_id=card_b, quantity=2)

        history = [
            _price_record(card_a, datetime(2025, 6, 1, tzinfo=timezone.utc), 20),
            _price_record(card_b, datetime(2025, 6, 1, tzinfo=timezone.utc), 100),
            _price_record(card_a, datetime(2025, 6, 15, tzinfo=timezone.utc), 25),
        ]
        by_card = group_price_history_by_card(history)

        value = compute_portfolio_market_value_on_date(
            [holding_a, holding_b],
            by_card,
            date(2025, 6, 10),
        )
        assert value == 220.0  # 20 + (100 * 2)

        value_later = compute_portfolio_market_value_on_date(
            [holding_a, holding_b],
            by_card,
            date(2025, 6, 20),
        )
        assert value_later == 225.0  # 25 + (100 * 2)

    def test_collect_performance_dates_includes_today(self):
        today = datetime.now(timezone.utc).date()
        history = [
            _price_record(uuid.uuid4(), datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc), 5),
        ]
        dates = collect_performance_dates(history, days=30)
        assert today in dates
