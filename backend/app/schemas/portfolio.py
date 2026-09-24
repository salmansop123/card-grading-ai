from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.card import CardResponse, PriceSnapshot


VALID_CONDITIONS = [
    "Mint",
    "Near Mint",
    "Lightly Played",
    "Moderately Played",
    "Heavily Played",
    "Damaged",
]

VALID_GRADING_COMPANIES = ["PSA", "BGS", "CGC", "SGC"]


class PortfolioAddRequest(BaseModel):
    card_id: UUID
    quantity: int = Field(default=1, ge=1)
    condition: str = "raw"
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class PortfolioUpdateRequest(BaseModel):
    quantity: Optional[int] = Field(default=None, ge=1)
    condition: Optional[str] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class HoldingCardSummary(CardResponse):
    pass


class PortfolioHoldingResponse(BaseModel):
    holding_id: UUID
    card: HoldingCardSummary
    condition: Optional[str] = None
    quantity: int
    is_graded: bool = False
    grading_company: Optional[str] = None
    grade: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None
    user_uploaded_image_url: Optional[str] = None
    is_sold: bool = False
    sold_price: Optional[float] = None
    sold_date: Optional[date] = None
    sold_quantity: Optional[int] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_pct: Optional[float] = None
    price_change_24h: Optional[float] = None
    price_change_24h_pct: Optional[float] = None
    trend: Optional[str] = None
    last_price_update: Optional[datetime] = None
    cost_basis: Optional[float] = None
    total_revenue: Optional[float] = None
    profit: Optional[float] = None
    profit_pct: Optional[float] = None


class ManualAddCardSchema(BaseModel):
    pokemon_tcg_id: str
    quantity: int = Field(default=1, ge=1, le=999)
    condition: str
    is_graded: bool = False
    grading_company: Optional[str] = None
    grade: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        if v not in VALID_CONDITIONS:
            raise ValueError(f"Condition must be one of: {VALID_CONDITIONS}")
        return v

    @field_validator("grading_company")
    @classmethod
    def validate_grading_company(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_GRADING_COMPANIES:
            raise ValueError("Invalid grading company")
        return v

    @model_validator(mode="after")
    def validate_graded_fields(self) -> "ManualAddCardSchema":
        if self.is_graded:
            if not self.grading_company:
                raise ValueError("Grading company required when card is graded")
            if self.grade is None:
                raise ValueError("Grade required when card is graded")
        if self.grade is not None and not (1.0 <= self.grade <= 10.0):
            raise ValueError("Grade must be between 1.0 and 10.0")
        return self


class ManualAddCardResponse(BaseModel):
    holding_id: UUID
    card_id: UUID
    card: CardResponse
    pricing_status: str
    estimated_value: Optional[float] = None
    price_source: Optional[str] = None
    merged: bool = False
    message: Optional[str] = None
    quantity: int = 1


class MarkSoldSchema(BaseModel):
    sold_price: float = Field(..., gt=0)
    sold_date: date
    sold_quantity: Optional[int] = None


class CardStackItem(BaseModel):
    """One row = one unique condition/grade combination for a card."""

    quantity: int = Field(default=1, ge=1, le=999)
    condition: Optional[str] = None
    is_graded: bool = False
    grading_company: Optional[str] = None
    grade: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("grading_company")
    @classmethod
    def validate_grading_company(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_GRADING_COMPANIES:
            raise ValueError("Invalid grading company")
        return v

    @model_validator(mode="after")
    def validate_stack_fields(self) -> "CardStackItem":
        if not self.is_graded:
            if not self.condition:
                raise ValueError("Condition required for raw cards")
            if self.condition not in VALID_CONDITIONS:
                raise ValueError(f"Condition must be one of: {VALID_CONDITIONS}")
        else:
            if not self.grading_company:
                raise ValueError("Grading company required when card is graded")
            if self.grade is None:
                raise ValueError("Grade required when card is graded")
        if self.grade is not None and not (1.0 <= self.grade <= 10.0):
            raise ValueError("Grade must be between 1.0 and 10.0")
        return self


class BatchAddCardSchema(BaseModel):
    """One card + multiple stack rows (different conditions/grades)."""

    pokemon_tcg_id: str
    stacks: List[CardStackItem] = Field(..., min_length=1)


class BatchAddRequestSchema(BaseModel):
    """Multiple cards in one submission, each with their own stacks."""

    cards: List[BatchAddCardSchema] = Field(..., min_length=1, max_length=50)


class PortfolioSummary(BaseModel):
    total_value: float = 0.0
    total_cost: float = 0.0
    total_gain_loss: float = 0.0
    total_gain_loss_pct: float = 0.0
    card_count: int = 0
    last_updated: Optional[datetime] = None


class PortfolioResponse(BaseModel):
    summary: PortfolioSummary
    holdings: list[PortfolioHoldingResponse]


class PerformancePoint(BaseModel):
    date: datetime
    total_value: float


class PortfolioPerformanceResponse(BaseModel):
    points: list[PerformancePoint]


class CompositionGroup(BaseModel):
    name: str
    card_count: int
    total_value: float
    percentage: float


class PortfolioCompositionResponse(BaseModel):
    group_by: str
    groups: list[CompositionGroup]
    total_value: float


class TrashHoldingResponse(PortfolioHoldingResponse):
    deleted_at: Optional[datetime] = None
    days_in_trash: int = 0
    days_remaining: int = 0


class TrashResponse(BaseModel):
    items: list[TrashHoldingResponse]
