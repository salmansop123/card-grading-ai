import statistics
from dataclasses import dataclass
from typing import Optional


@dataclass
class PriceEstimate:
    estimated_value: float
    confidence: float
    components: dict[str, float]


class PricingEngine:
    WEIGHTS = {
        "pricecharting_raw": 0.30,
        "ebay_median": 0.45,
        "ebay_avg": 0.25,
    }

    def calculate_estimated_value(
        self,
        pricecharting_raw: Optional[float],
        ebay_sales: list[float],
        condition: str = "raw",
    ) -> PriceEstimate:
        components: dict[str, float] = {}

        if pricecharting_raw:
            components["pricecharting_raw"] = pricecharting_raw

        if ebay_sales:
            filtered_sales = self._remove_outliers(ebay_sales)
            if filtered_sales:
                components["ebay_median"] = statistics.median(filtered_sales)
                components["ebay_avg"] = statistics.mean(filtered_sales)

        if "pricecharting_raw" in components and len(components) > 1:
            weighted_sum = sum(
                components[key] * self.WEIGHTS[key] for key in components if key in self.WEIGHTS
            )
            total_weight = sum(self.WEIGHTS[key] for key in components if key in self.WEIGHTS)
            estimated_value = weighted_sum / total_weight
            confidence = 0.85 if len(ebay_sales) >= 5 else 0.65
        elif "pricecharting_raw" in components:
            estimated_value = components["pricecharting_raw"]
            confidence = 0.60
        elif "ebay_median" in components:
            estimated_value = components["ebay_median"]
            confidence = 0.70
        else:
            raise ValueError("No pricing data available")

        return PriceEstimate(
            estimated_value=round(estimated_value, 2),
            confidence=confidence,
            components=components,
        )

    def _remove_outliers(self, prices: list[float]) -> list[float]:
        if len(prices) < 3:
            return prices
        mean = statistics.mean(prices)
        stdev = statistics.stdev(prices)
        return [p for p in prices if abs(p - mean) <= 2 * stdev]

    def calculate_volatility_score(self, prices: list[float]) -> float:
        if len(prices) < 2:
            return 0.0
        mean = statistics.mean(prices)
        if mean == 0:
            return 0.0
        cv = statistics.stdev(prices) / mean
        return min(cv, 1.0)

    def calculate_grading_roi(
        self, raw_price: float, psa9_price: float, psa10_price: float, grading_cost: float = 25.0
    ) -> dict:
        return {
            "roi_to_psa9": ((psa9_price - raw_price - grading_cost) / raw_price) * 100 if raw_price else 0,
            "roi_to_psa10": ((psa10_price - raw_price - grading_cost) / raw_price) * 100 if raw_price else 0,
            "breakeven_grade": "PSA 9" if psa9_price > raw_price + grading_cost else "PSA 10",
        }
