import pytest
from unittest.mock import AsyncMock, patch

from app.services.price_charting_service import PriceChartingService
from app.models.card import Card
import uuid


@pytest.mark.asyncio
async def test_price_charting_returns_dataclass():
    service = PriceChartingService()
    card = Card(id=uuid.uuid4(), card_name="Charizard", set_name="Base Set")

    with patch("app.services.price_charting_service.get_cached", return_value=None):
        with patch.object(service, "_rate_limit", new_callable=AsyncMock):
            with patch("httpx.AsyncClient") as mock_client:
                mock_response = AsyncMock()
                mock_response.status_code = 404
                mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
                result = await service.get_card_prices(card)
                assert result.raw is None or isinstance(result.raw, float)
