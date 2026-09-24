import pytest
from decimal import Decimal
from unittest.mock import MagicMock, patch
import uuid

from app.services.portfolio_service import PortfolioService


class TestPortfolioService:
    def setup_method(self):
        self.service = PortfolioService()

    def test_portfolio_summary_empty(self):
        db = MagicMock()
        db.query.return_value.options.return_value.filter.return_value.all.return_value = []
        with patch("app.services.portfolio_service.get_cached", return_value=None):
            with patch("app.services.portfolio_service.set_cached"):
                result = self.service.get_portfolio(db, uuid.uuid4())
        assert result.summary.total_value == 0.0
        assert result.summary.card_count == 0
