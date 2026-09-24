import time
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.agents.vision_agent import VisionAgent
from app.models.card import Card
from app.models.scan_result import AIScanResult
from app.services.card_identity_service import CardIdentityService
from app.utils.cache_utils import get_cached, set_cached
from app.utils.image_utils import compute_image_hash, validate_and_resize


class CardScanService:
    def __init__(self):
        self.vision_agent = VisionAgent()
        self.identity_service = CardIdentityService()

    async def scan_card_image(
        self, db: Session, image_data: bytes, user_id: uuid.UUID, card_type_hint: Optional[str] = None
    ) -> AIScanResult:
        start = time.time()
        scan_result = AIScanResult(user_id=user_id, status="processing")
        db.add(scan_result)
        db.commit()
        db.refresh(scan_result)

        try:
            validated_image, _ = validate_and_resize(image_data)
            image_hash = compute_image_hash(validated_image)

            cached = get_cached(f"scan_result:{image_hash}")
            if cached:
                extracted_data = cached.get("extracted_data", {})
                model_used = cached.get("model_used", "cache")
            else:
                extracted_data, model_used = await self.vision_agent.analyze_image(validated_image)
                set_cached(
                    f"scan_result:{image_hash}",
                    {"extracted_data": extracted_data, "model_used": model_used},
                    ttl=86400,
                )

            card_type = extracted_data.get("card_type", card_type_hint or "pokemon")
            if card_type != "pokemon":
                scan_result.status = "failed"
                scan_result.error_message = "Only Pokémon cards are supported in MVP. More card types coming soon."
                scan_result.extracted_data = extracted_data
                scan_result.confidence = extracted_data.get("confidence")
                scan_result.processing_time_ms = int((time.time() - start) * 1000)
                db.commit()
                return scan_result

            if card_type == "pokemon":
                extracted_data = await self.identity_service.validate_pokemon_card(extracted_data)

            confidence = float(extracted_data.get("confidence", 0))
            scan_result.extracted_data = extracted_data
            scan_result.model_used = model_used
            scan_result.confidence = confidence
            scan_result.raw_ai_response = extracted_data

            if confidence < 0.6:
                scan_result.status = "low_confidence"
            elif confidence < 0.85:
                scan_result.status = "requires_confirmation"
            else:
                card = self._create_card_from_extraction(db, extracted_data)
                scan_result.card_id = card.id
                scan_result.status = "success"
                card.scan_status = "identified"

            scan_result.processing_time_ms = int((time.time() - start) * 1000)
            db.commit()
            db.refresh(scan_result)
            return scan_result

        except Exception as exc:
            scan_result.status = "failed"
            scan_result.error_message = str(exc)
            scan_result.processing_time_ms = int((time.time() - start) * 1000)
            db.commit()
            return scan_result

    def confirm_scan(self, db: Session, scan_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Card]:
        scan = (
            db.query(AIScanResult)
            .filter(AIScanResult.id == scan_id, AIScanResult.user_id == user_id)
            .first()
        )
        if not scan or not scan.extracted_data:
            return None

        if scan.card_id:
            return db.query(Card).filter(Card.id == scan.card_id).first()

        card = self._create_card_from_extraction(db, scan.extracted_data)
        scan.card_id = card.id
        scan.status = "success"
        card.scan_status = "identified"
        db.commit()
        db.refresh(card)
        return card

    def _create_card_from_extraction(self, db: Session, data: dict) -> Card:
        card = Card(
            card_name=data.get("card_name", "Unknown"),
            set_name=data.get("set_name"),
            set_code=data.get("set_code"),
            card_number=data.get("card_number"),
            year=data.get("year"),
            rarity=data.get("rarity"),
            card_type=data.get("card_type", "pokemon"),
            language=data.get("language", "English"),
            pokemon_tcg_id=data.get("pokemon_tcg_id"),
            image_url=data.get("image_url"),
            thumbnail_url=data.get("thumbnail_url"),
            scan_status="identified",
            pricing_status="pending",
        )
        db.add(card)
        db.flush()
        return card
