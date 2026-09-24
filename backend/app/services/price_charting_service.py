import asyncio
import time
import urllib.parse
from dataclasses import dataclass
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.models.card import Card
from app.utils.cache_utils import get_cached, set_cached

BASE_URL = "https://www.pricecharting.com"
_last_request_time = 0.0
_rate_limit_lock = asyncio.Lock()


@dataclass
class PriceChartingData:
    raw: Optional[float] = None
    psa8: Optional[float] = None
    psa9: Optional[float] = None
    psa10: Optional[float] = None


class PriceChartingService:
    async def _rate_limit(self) -> None:
        global _last_request_time
        async with _rate_limit_lock:
            elapsed = time.time() - _last_request_time
            if elapsed < 2.0:
                await asyncio.sleep(2.0 - elapsed)
            _last_request_time = time.time()

    async def get_card_prices(self, card: Card) -> PriceChartingData:
        slug = f"{card.card_name}-{card.set_name}".lower().replace(" ", "-")
        cache_key = f"pc_prices:{slug}"
        cached = get_cached(cache_key)
        if cached:
            return PriceChartingData(**cached)

        await self._rate_limit()
        query = f"{card.card_name} {card.set_name or ''}".strip()
        api_url = f"{BASE_URL}/api/products?q={urllib.parse.quote(query)}&status=completed"

        headers = {"User-Agent": "CardMarketIntelligence/1.0"}

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(api_url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    result = self._parse_api_response(data)
                    if result.raw:
                        set_cached(cache_key, result.__dict__, ttl=21600)
                        return result
            except Exception:
                pass

            page_url = self._build_page_url(card)
            await self._rate_limit()
            try:
                response = await client.get(page_url, headers=headers)
                if response.status_code == 200:
                    result = self._scrape_page(response.text)
                    set_cached(cache_key, result.__dict__, ttl=21600)
                    return result
            except Exception:
                pass

        return PriceChartingData()

    def _build_page_url(self, card: Card) -> str:
        set_slug = (card.set_name or "pokemon").lower().replace(" ", "-")
        card_slug = card.card_name.lower().replace(" ", "-")
        return f"{BASE_URL}/game/pokemon-{set_slug}/{card_slug}"

    def _parse_api_response(self, data: dict) -> PriceChartingData:
        products = data.get("products", [])
        if not products:
            return PriceChartingData()

        product = products[0]
        return PriceChartingData(
            raw=self._parse_price_value(product.get("loose-price") or product.get("cib-price")),
            psa8=self._parse_price_value(product.get("graded-price")),
            psa9=self._parse_price_value(product.get("box-only-price")),
            psa10=self._parse_price_value(product.get("manual-only-price") or product.get("new-price")),
        )

    def _scrape_page(self, html: str) -> PriceChartingData:
        soup = BeautifulSoup(html, "html.parser")
        return PriceChartingData(
            raw=self._extract_price(soup, "#used_price"),
            psa8=self._extract_graded_price(soup, "PSA 8"),
            psa9=self._extract_graded_price(soup, "PSA 9"),
            psa10=self._extract_graded_price(soup, "PSA 10"),
        )

    def _extract_price(self, soup: BeautifulSoup, selector: str) -> Optional[float]:
        el = soup.select_one(selector)
        if el:
            return self._parse_price_value(el.get_text())
        return None

    def _extract_graded_price(self, soup: BeautifulSoup, grade: str) -> Optional[float]:
        for row in soup.select("#graded-card-prices tbody tr"):
            cells = row.find_all("td")
            if cells and grade in cells[0].get_text():
                return self._parse_price_value(cells[1].get_text() if len(cells) > 1 else "")
        return None

    def _parse_price_value(self, text: Optional[str]) -> Optional[float]:
        if not text:
            return None
        cleaned = text.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
