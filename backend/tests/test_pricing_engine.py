import pytest

from app.services.pricing_engine import PricingEngine


class TestPricingEngine:
    def setup_method(self):
        self.engine = PricingEngine()

    def test_weighted_price_with_both_sources(self):
        result = self.engine.calculate_estimated_value(
            pricecharting_raw=100.0,
            ebay_sales=[90.0, 95.0, 100.0, 105.0, 110.0],
        )
        assert result.estimated_value > 0
        assert result.confidence >= 0.65
        assert "pricecharting_raw" in result.components
        assert "ebay_median" in result.components

    def test_pricecharting_only(self):
        result = self.engine.calculate_estimated_value(pricecharting_raw=50.0, ebay_sales=[])
        assert result.estimated_value == 50.0
        assert result.confidence == 0.60

    def test_ebay_only(self):
        result = self.engine.calculate_estimated_value(pricecharting_raw=None, ebay_sales=[80.0, 85.0, 90.0])
        assert result.estimated_value == 85.0
        assert result.confidence == 0.70

    def test_no_data_raises(self):
        with pytest.raises(ValueError):
            self.engine.calculate_estimated_value(pricecharting_raw=None, ebay_sales=[])

    def test_remove_outliers(self):
        filtered = self.engine._remove_outliers([10.0, 11.0, 10.5, 11.0, 10.0, 500.0])
        assert 500.0 not in filtered

    def test_volatility_score(self):
        score = self.engine.calculate_volatility_score([10.0, 12.0, 11.0, 13.0])
        assert 0 <= score <= 1.0

    def test_grading_roi(self):
        roi = self.engine.calculate_grading_roi(raw_price=100.0, psa9_price=200.0, psa10_price=500.0)
        assert roi["roi_to_psa9"] > 0
        assert roi["roi_to_psa10"] > roi["roi_to_psa9"]
