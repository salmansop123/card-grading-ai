from typing import Optional


def format_currency(value: Optional[float]) -> str:
    if value is None:
        return "$0.00"
    return f"${value:,.2f}"


def calculate_pct_change(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    if current is None or previous is None or previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 2)
