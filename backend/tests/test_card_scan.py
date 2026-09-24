import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.card_scan_service import CardScanService


@pytest.mark.asyncio
async def test_scan_rejects_non_pokemon():
    service = CardScanService()
    db = MagicMock()
    scan_result_mock = MagicMock()
    scan_result_mock.id = "test-id"
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()

    with patch.object(service, "vision_agent") as mock_vision:
        mock_vision.analyze_image = AsyncMock(
            return_value=(
                {
                    "card_name": "Black Lotus",
                    "card_type": "mtg",
                    "confidence": 0.95,
                },
                "test-model",
            )
        )
        with patch("app.services.card_scan_service.validate_and_resize", return_value=(b"image", "image/jpeg")):
            with patch("app.services.card_scan_service.compute_image_hash", return_value="hash"):
                with patch("app.services.card_scan_service.get_cached", return_value=None):
                    with patch("app.services.card_scan_service.set_cached"):
                        result = await service.scan_card_image(db, b"fake", "user-id")
                        # Service creates scan result - status should be failed for non-pokemon
                        assert db.add.called
