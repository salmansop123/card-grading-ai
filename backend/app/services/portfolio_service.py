import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.models.card import Card
from app.models.portfolio import PortfolioHolding
from app.models.price_history import PriceHistory
from app.schemas.portfolio import (
    PerformancePoint,
    PortfolioHoldingResponse,
    PortfolioResponse,
    PortfolioSummary,
    TrashHoldingResponse,
)
from app.utils.cache_utils import cache_delete, get_cached, set_cached
from app.utils.portfolio_value_utils import (
    collect_performance_dates,
    compute_holding_market_value,
    compute_portfolio_market_value_on_date,
    compute_total_cost,
    group_price_history_by_card,
)
from app.utils.price_utils import calculate_pct_change


class PortfolioService:
    def _active_holdings_filter(self, query, user_id: uuid.UUID):
        return query.filter(
            PortfolioHolding.user_id == user_id,
            PortfolioHolding.is_deleted == False,  # noqa: E712
            PortfolioHolding.is_sold == False,  # noqa: E712
        )

    def get_portfolio(self, db: Session, user_id: uuid.UUID) -> PortfolioResponse:
        cache_key = f"portfolio:{user_id}"
        cached = get_cached(cache_key)
        if cached:
            return PortfolioResponse(**cached)

        holdings = (
            self._active_holdings_filter(
                db.query(PortfolioHolding).options(joinedload(PortfolioHolding.card)),
                user_id,
            ).all()
        )

        holding_responses = []
        total_value = 0.0

        for holding in holdings:
            response = self._holding_to_response(db, holding)
            holding_responses.append(response)
            total_value += compute_holding_market_value(response.current_value, holding.quantity)

        total_cost = compute_total_cost(holdings)

        gain_loss = total_value - total_cost
        gain_pct = calculate_pct_change(total_value, total_cost) or 0.0

        summary = PortfolioSummary(
            total_value=round(total_value, 2),
            total_cost=round(total_cost, 2),
            total_gain_loss=round(gain_loss, 2),
            total_gain_loss_pct=gain_pct,
            card_count=len(holdings),
            last_updated=datetime.now(timezone.utc),
        )

        result = PortfolioResponse(summary=summary, holdings=holding_responses)
        set_cached(cache_key, result.model_dump(mode="json"), ttl=1800)
        return result

    def add_holding(
        self,
        db: Session,
        user_id: uuid.UUID,
        card_id: uuid.UUID,
        quantity: int = 1,
        condition: str = "raw",
        purchase_price: Optional[float] = None,
        purchase_date=None,
        notes: Optional[str] = None,
        is_graded: bool = False,
        grading_company: Optional[str] = None,
        grade: Optional[float] = None,
        commit: bool = True,
    ) -> tuple[PortfolioHolding, bool]:
        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise ValueError("Card not found")

        grade_val = Decimal(str(grade)) if grade is not None else None
        existing = (
            db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.card_id == card_id,
                PortfolioHolding.condition == condition,
                PortfolioHolding.is_graded == is_graded,
                PortfolioHolding.grading_company == grading_company,
                PortfolioHolding.grade == grade_val,
                PortfolioHolding.is_deleted == False,  # noqa: E712
                PortfolioHolding.is_sold == False,  # noqa: E712
            )
            .first()
        )
        if existing:
            existing.quantity += quantity
            if purchase_price is not None:
                existing.purchase_price = Decimal(str(purchase_price))
            if purchase_date is not None:
                existing.purchase_date = purchase_date
            if notes:
                existing.notes = notes
            if commit:
                db.commit()
                cache_delete(f"portfolio:{user_id}")
            return existing, True

        holding = PortfolioHolding(
            user_id=user_id,
            card_id=card_id,
            quantity=quantity,
            condition=condition,
            is_graded=is_graded,
            grading_company=grading_company,
            grade=grade_val,
            purchase_price=Decimal(str(purchase_price)) if purchase_price else None,
            purchase_date=purchase_date,
            notes=notes,
        )
        db.add(holding)
        if commit:
            db.commit()
            db.refresh(holding)
            cache_delete(f"portfolio:{user_id}")
        return holding, False

    def update_holding(self, db: Session, holding_id: uuid.UUID, user_id: uuid.UUID, **kwargs) -> Optional[PortfolioHolding]:
        holding = (
            self._active_holdings_filter(db.query(PortfolioHolding), user_id)
            .filter(PortfolioHolding.id == holding_id)
            .first()
        )
        if not holding:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(holding, key):
                if key == "purchase_price":
                    setattr(holding, key, Decimal(str(value)))
                else:
                    setattr(holding, key, value)

        db.commit()
        cache_delete(f"portfolio:{user_id}")
        return holding

    def remove_holding(self, db: Session, holding_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Soft delete — moves card to trash."""
        holding = (
            self._active_holdings_filter(db.query(PortfolioHolding), user_id)
            .filter(PortfolioHolding.id == holding_id)
            .first()
        )
        if not holding:
            return False
        holding.is_deleted = True
        holding.deleted_at = datetime.now(timezone.utc)
        db.commit()
        cache_delete(f"portfolio:{user_id}")
        return True

    def get_trash(self, db: Session, user_id: uuid.UUID) -> list[TrashHoldingResponse]:
        trashed = (
            db.query(PortfolioHolding)
            .options(joinedload(PortfolioHolding.card))
            .filter(
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.is_deleted == True,  # noqa: E712
            )
            .order_by(desc(PortfolioHolding.deleted_at))
            .all()
        )
        now = datetime.now(timezone.utc)
        results = []
        for item in trashed:
            response = self._holding_to_response(db, item)
            deleted_at = item.deleted_at or now
            if deleted_at.tzinfo is None:
                deleted_at = deleted_at.replace(tzinfo=timezone.utc)
            days_in_trash = (now - deleted_at).days
            days_remaining = max(0, 30 - days_in_trash)
            results.append(
                TrashHoldingResponse(
                    **response.model_dump(),
                    deleted_at=item.deleted_at,
                    days_in_trash=days_in_trash,
                    days_remaining=days_remaining,
                )
            )
        return results

    def restore_holding(self, db: Session, holding_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        holding = (
            db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.id == holding_id,
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.is_deleted == True,  # noqa: E712
            )
            .first()
        )
        if not holding:
            return False
        holding.is_deleted = False
        holding.deleted_at = None
        db.commit()
        cache_delete(f"portfolio:{user_id}")
        return True

    def permanent_delete_holding(self, db: Session, holding_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        holding = (
            db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.id == holding_id,
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.is_deleted == True,  # noqa: E712
            )
            .first()
        )
        if not holding:
            return False
        db.delete(holding)
        db.commit()
        return True

    def empty_trash(self, db: Session, user_id: uuid.UUID) -> int:
        deleted_count = (
            db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.is_deleted == True,  # noqa: E712
            )
            .delete()
        )
        db.commit()
        return deleted_count

    def get_performance(self, db: Session, user_id: uuid.UUID, days: int = 30) -> list[PerformancePoint]:
        holdings = self._active_holdings_filter(db.query(PortfolioHolding), user_id).all()
        if not holdings:
            return []

        card_ids = list({h.card_id for h in holdings})
        history = (
            db.query(PriceHistory)
            .filter(PriceHistory.card_id.in_(card_ids))
            .order_by(PriceHistory.recorded_at)
            .all()
        )

        if not history:
            return []

        by_card = group_price_history_by_card(history)
        performance_dates = collect_performance_dates(history, days)

        return [
            PerformancePoint(
                date=datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc),
                total_value=compute_portfolio_market_value_on_date(holdings, by_card, target_date),
            )
            for target_date in performance_dates
        ]

    def get_composition(
        self, db: Session, user_id: uuid.UUID, group_by: str = "set"
    ) -> dict:
        holdings = (
            self._active_holdings_filter(
                db.query(PortfolioHolding).options(joinedload(PortfolioHolding.card)),
                user_id,
            ).all()
        )

        groups: dict[str, dict] = {}
        total_value = 0.0

        for holding in holdings:
            response = self._holding_to_response(db, holding)
            value = compute_holding_market_value(response.current_value, holding.quantity)
            total_value += value

            if group_by == "rarity":
                key = holding.card.rarity or "Unknown"
            else:
                key = holding.card.set_name or "Unknown Set"

            if key not in groups:
                groups[key] = {"card_count": 0, "total_value": 0.0}
            groups[key]["card_count"] += holding.quantity
            groups[key]["total_value"] += value

        result_groups = []
        for name, stats in groups.items():
            pct = (stats["total_value"] / total_value * 100) if total_value > 0 else 0.0
            result_groups.append(
                {
                    "name": name,
                    "card_count": stats["card_count"],
                    "total_value": round(stats["total_value"], 2),
                    "percentage": round(pct, 1),
                }
            )

        result_groups.sort(key=lambda g: g["total_value"], reverse=True)
        return {
            "group_by": group_by,
            "groups": result_groups,
            "total_value": round(total_value, 2),
        }

    def get_holdings_for_card(
        self, db: Session, user_id: uuid.UUID, pokemon_tcg_id: str
    ) -> list[PortfolioHoldingResponse]:
        card = db.query(Card).filter(Card.pokemon_tcg_id == pokemon_tcg_id).first()
        if not card:
            return []
        holdings = (
            self._active_holdings_filter(
                db.query(PortfolioHolding).options(joinedload(PortfolioHolding.card)),
                user_id,
            )
            .filter(PortfolioHolding.card_id == card.id)
            .all()
        )
        return [self._holding_to_response(db, h) for h in holdings]

    def get_sold_holdings(self, db: Session, user_id: uuid.UUID) -> list[PortfolioHoldingResponse]:
        sold = (
            db.query(PortfolioHolding)
            .options(joinedload(PortfolioHolding.card))
            .filter(
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.is_sold == True,  # noqa: E712
                PortfolioHolding.is_deleted == False,  # noqa: E712
            )
            .order_by(desc(PortfolioHolding.sold_date))
            .all()
        )
        results = []
        for item in sold:
            response = self._holding_to_response(db, item)
            qty = item.sold_quantity or item.quantity
            cost = float(item.purchase_price or 0) * qty if item.purchase_price else None
            revenue = float(item.sold_price or 0) * qty
            profit = (revenue - cost) if cost is not None else None
            profit_pct = (profit / cost * 100) if cost and profit is not None else None
            results.append(
                response.model_copy(
                    update={
                        "cost_basis": round(cost, 2) if cost is not None else None,
                        "total_revenue": round(revenue, 2),
                        "profit": round(profit, 2) if profit is not None else None,
                        "profit_pct": round(profit_pct, 2) if profit_pct is not None else None,
                    }
                )
            )
        return results

    def mark_card_sold(
        self,
        db: Session,
        user_id: uuid.UUID,
        holding_id: uuid.UUID,
        sold_price: float,
        sold_date: date,
        sold_quantity: Optional[int] = None,
    ) -> dict:
        holding = (
            self._active_holdings_filter(db.query(PortfolioHolding), user_id)
            .filter(PortfolioHolding.id == holding_id)
            .first()
        )
        if not holding:
            raise ValueError("Card not found")

        sold_qty = sold_quantity or holding.quantity
        if sold_qty > holding.quantity:
            raise ValueError("Cannot sell more than you own")

        if sold_qty == holding.quantity:
            holding.is_sold = True
            holding.sold_price = Decimal(str(sold_price))
            holding.sold_date = sold_date
            holding.sold_quantity = sold_qty
            db.commit()
            cache_delete(f"portfolio:{user_id}")
            return {"message": "Card marked as sold", "holding_id": str(holding.id)}

        holding.quantity -= sold_qty
        sold_holding = PortfolioHolding(
            user_id=user_id,
            card_id=holding.card_id,
            quantity=sold_qty,
            condition=holding.condition,
            is_graded=holding.is_graded,
            grading_company=holding.grading_company,
            grade=holding.grade,
            purchase_price=holding.purchase_price,
            purchase_date=holding.purchase_date,
            notes=holding.notes,
            user_uploaded_image_url=holding.user_uploaded_image_url,
            is_sold=True,
            sold_price=Decimal(str(sold_price)),
            sold_date=sold_date,
            sold_quantity=sold_qty,
        )
        db.add(sold_holding)
        db.commit()
        db.refresh(sold_holding)
        cache_delete(f"portfolio:{user_id}")
        return {
            "message": "Partial quantity marked as sold",
            "sold_holding_id": str(sold_holding.id),
        }

    def revert_sold_card(self, db: Session, user_id: uuid.UUID, holding_id: uuid.UUID) -> dict:
        sold_holding = (
            db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.id == holding_id,
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.is_sold == True,  # noqa: E712
            )
            .first()
        )
        if not sold_holding:
            raise ValueError("Sold card not found")

        existing_active = (
            self._active_holdings_filter(db.query(PortfolioHolding), user_id)
            .filter(
                PortfolioHolding.card_id == sold_holding.card_id,
                PortfolioHolding.condition == sold_holding.condition,
                PortfolioHolding.is_graded == sold_holding.is_graded,
                PortfolioHolding.grading_company == sold_holding.grading_company,
                PortfolioHolding.grade == sold_holding.grade,
            )
            .first()
        )

        qty_to_restore = sold_holding.sold_quantity or sold_holding.quantity

        if existing_active:
            existing_active.quantity += qty_to_restore
            db.delete(sold_holding)
            db.commit()
            cache_delete(f"portfolio:{user_id}")
            return {"message": "Card restored and merged with existing collection entry"}

        sold_holding.is_sold = False
        sold_holding.sold_price = None
        sold_holding.sold_date = None
        sold_holding.sold_quantity = None
        db.commit()
        cache_delete(f"portfolio:{user_id}")
        return {"message": "Card restored to collection", "holding_id": str(sold_holding.id)}

    def _holding_to_response(self, db: Session, holding: PortfolioHolding) -> PortfolioHoldingResponse:
        latest = (
            db.query(PriceHistory)
            .filter(PriceHistory.card_id == holding.card_id)
            .order_by(desc(PriceHistory.recorded_at))
            .first()
        )

        current_value = float(latest.estimated_value) if latest and latest.estimated_value else None
        purchase = float(holding.purchase_price) if holding.purchase_price else None
        gain_loss = (current_value - purchase) if current_value and purchase else None
        gain_pct = calculate_pct_change(current_value, purchase)

        trend = "stable"
        if latest and latest.pct_change_7d:
            if latest.pct_change_7d > 2:
                trend = "rising"
            elif latest.pct_change_7d < -2:
                trend = "declining"

        card = holding.card
        return PortfolioHoldingResponse(
            holding_id=holding.id,
            card=card,
            condition=holding.condition,
            quantity=holding.quantity,
            is_graded=holding.is_graded or False,
            grading_company=holding.grading_company,
            grade=float(holding.grade) if holding.grade is not None else None,
            purchase_price=purchase,
            purchase_date=holding.purchase_date,
            notes=holding.notes,
            user_uploaded_image_url=holding.user_uploaded_image_url,
            is_sold=holding.is_sold or False,
            sold_price=float(holding.sold_price) if holding.sold_price is not None else None,
            sold_date=holding.sold_date,
            sold_quantity=holding.sold_quantity,
            current_value=current_value,
            gain_loss=gain_loss,
            gain_loss_pct=gain_pct,
            price_change_24h=None,
            price_change_24h_pct=latest.pct_change_7d if latest else None,
            trend=trend,
            last_price_update=latest.recorded_at if latest else None,
        )
