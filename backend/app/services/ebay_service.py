from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from xml.etree import ElementTree

import httpx

from app.config import get_settings
from app.models.card import Card
from app.utils.cache_utils import get_cached, set_cached

settings = get_settings()
EBAY_FINDING_URL = "https://svcs.ebay.com/services/search/FindingService/v1"
NS = {"ns": "http://www.ebay.com/marketplace/search/v1/services"}


@dataclass
class EbaySale:
    ebay_item_id: Optional[str]
    title: str
    price: float
    condition: Optional[str]
    sold_date: Optional[datetime]
    listing_url: Optional[str]


class EbayService:
    async def get_sold_listings(self, card: Card, limit: int = 10) -> list[EbaySale]:
        cache_key = f"ebay_sales:{card.id}"
        cached = get_cached(cache_key)
        if cached:
            return [EbaySale(**{**s, "sold_date": datetime.fromisoformat(s["sold_date"]) if s.get("sold_date") else None}) for s in cached]

        if not settings.ebay_app_id:
            return []

        keywords = f"{card.card_name} {card.set_name or ''} {card.card_number or ''} pokemon card".strip()
        params = {
            "OPERATION-NAME": "findCompletedItems",
            "SERVICE-VERSION": "1.0.0",
            "SECURITY-APPNAME": settings.ebay_app_id,
            "RESPONSE-DATA-FORMAT": "JSON",
            "keywords": keywords,
            "itemFilter(0).name": "SoldItemsOnly",
            "itemFilter(0).value": "true",
            "sortOrder": "EndTimeSoonest",
            "paginationInput.entriesPerPage": str(limit),
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(EBAY_FINDING_URL, params=params)
            if response.status_code != 200:
                return []
            sales = self._parse_json_response(response.json())

        serializable = [
            {
                "ebay_item_id": s.ebay_item_id,
                "title": s.title,
                "price": s.price,
                "condition": s.condition,
                "sold_date": s.sold_date.isoformat() if s.sold_date else None,
                "listing_url": s.listing_url,
            }
            for s in sales
        ]
        set_cached(cache_key, serializable, ttl=7200)
        return sales

    def _parse_json_response(self, data: dict) -> list[EbaySale]:
        sales = []
        try:
            items = (
                data.get("findCompletedItemsResponse", [{}])[0]
                .get("searchResult", [{}])[0]
                .get("item", [])
            )
        except (KeyError, IndexError, TypeError):
            return sales

        for item in items:
            try:
                title = item.get("title", [""])[0]
                item_id = item.get("itemId", [None])[0]
                selling = item.get("sellingStatus", [{}])[0]
                price_data = selling.get("currentPrice", [{}])[0]
                price = float(price_data.get("__value__", 0))
                sold_date_str = item.get("listingInfo", [{}])[0].get("endTime", [None])[0]
                sold_date = datetime.fromisoformat(sold_date_str.replace("Z", "+00:00")) if sold_date_str else None
                condition = item.get("condition", [{}])[0].get("conditionDisplayName", [None])[0]
                listing_url = item.get("viewItemURL", [None])[0]
                sales.append(
                    EbaySale(
                        ebay_item_id=item_id,
                        title=title,
                        price=price,
                        condition=condition,
                        sold_date=sold_date,
                        listing_url=listing_url,
                    )
                )
            except (KeyError, IndexError, ValueError, TypeError):
                continue
        return sales
