import re
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

from app.config import get_settings
from app.utils.cache_utils import get_cached, set_cached

settings = get_settings()

POKEMON_TCG_URL = "https://api.pokemontcg.io/v2"


@dataclass
class PokemonCardData:
    id: str
    name: str
    set_name: Optional[str]
    set_code: Optional[str]
    number: Optional[str]
    rarity: Optional[str]
    image_url: Optional[str]
    year: Optional[int] = None
    card_type: str = "pokemon"
    thumbnail_url: Optional[str] = None
    hp: Optional[str] = None
    types: list[str] = field(default_factory=list)
    estimated_value: Optional[float] = None
    price_source: Optional[str] = None

    def to_search_dict(self) -> dict:
        return {
            "pokemon_tcg_id": self.id,
            "card_name": self.name,
            "set_name": self.set_name,
            "set_code": self.set_code,
            "card_number": self.number,
            "year": self.year,
            "rarity": self.rarity,
            "card_type": self.card_type,
            "image_url": self.image_url,
            "thumbnail_url": self.thumbnail_url,
            "hp": self.hp,
            "types": self.types,
            "estimated_value": self.estimated_value,
            "price_source": self.price_source,
        }


class CardIdentityService:
    @staticmethod
    def extract_market_prices(raw_card_data: dict) -> dict[str, Any]:
        tcgplayer = raw_card_data.get("tcgplayer", {})
        tcg_prices = tcgplayer.get("prices", {})
        cardmarket = raw_card_data.get("cardmarket", {})
        cm_prices = cardmarket.get("prices", {})

        price_variant = None
        for variant in ["holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil"]:
            if variant in tcg_prices and tcg_prices[variant].get("market"):
                price_variant = tcg_prices[variant]
                break

        market_price = None
        low_price = None
        high_price = None

        if price_variant:
            market_price = price_variant.get("market")
            low_price = price_variant.get("low")
            high_price = price_variant.get("high")
        elif cm_prices.get("averageSellPrice"):
            market_price = cm_prices.get("averageSellPrice")
            low_price = cm_prices.get("lowPrice")
            high_price = cm_prices.get("trendPrice")

        return {
            "estimated_value": market_price,
            "low_price": low_price,
            "high_price": high_price,
            "source": "tcgplayer" if price_variant else "cardmarket" if market_price else None,
            "raw_tcgplayer": tcg_prices,
            "raw_cardmarket": cm_prices,
        }

    @staticmethod
    def parse_card_identity(raw_card_data: dict) -> dict[str, Any]:
        set_data = raw_card_data.get("set", {})
        year = None
        if set_data.get("releaseDate"):
            year = int(set_data["releaseDate"][:4])
        images = raw_card_data.get("images", {})
        price_data = CardIdentityService.extract_market_prices(raw_card_data)
        return {
            "pokemon_tcg_id": raw_card_data["id"],
            "card_name": raw_card_data["name"],
            "set_name": set_data.get("name"),
            "set_code": set_data.get("id"),
            "card_number": raw_card_data.get("number"),
            "year": year,
            "rarity": raw_card_data.get("rarity"),
            "card_type": "pokemon",
            "image_url": images.get("large"),
            "thumbnail_url": images.get("small"),
            "hp": raw_card_data.get("hp"),
            "types": raw_card_data.get("types") or [],
            "estimated_value": price_data.get("estimated_value"),
            "price_source": price_data.get("source"),
        }

    @staticmethod
    def _extract_search_words(search_term: str) -> list[str]:
        """Split a search phrase into meaningful tokens (handles apostrophes)."""
        cleaned = search_term.replace("'", " ").replace("'", " ").replace("`", " ")
        words = [re.sub(r"[^\w\-]", "", w) for w in cleaned.split() if w]
        # Drop orphan single letters left by apostrophe splits (e.g. "Blaine's" → "s")
        return [w for w in words if len(w) > 1]

    @staticmethod
    def _build_search_query(search_term: str) -> str:
        words = CardIdentityService._extract_search_words(search_term)
        if not words:
            safe = re.sub(r"[^\w\-]", "", search_term.strip()) or search_term.strip()
            return f"name:{safe}*" if safe else "name:*"
        if len(words) == 1:
            return f"name:{words[0]}*"
        parts = []
        for i, word in enumerate(words):
            if i == len(words) - 1:
                parts.append(f"name:{word}*")
            else:
                parts.append(f"name:{word}*")
        return " ".join(parts)

    def _parse_card_item(self, item: dict) -> PokemonCardData:
        identity = self.parse_card_identity(item)
        return PokemonCardData(
            id=identity["pokemon_tcg_id"],
            name=identity["card_name"],
            set_name=identity["set_name"],
            set_code=identity["set_code"],
            number=identity["card_number"],
            rarity=identity["rarity"],
            image_url=identity["image_url"],
            thumbnail_url=identity["thumbnail_url"],
            year=identity["year"],
            card_type=identity["card_type"],
            hp=identity["hp"],
            types=identity["types"],
            estimated_value=identity["estimated_value"],
            price_source=identity["price_source"],
        )

    def _api_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if settings.pokemon_tcg_api_key:
            headers["X-Api-Key"] = settings.pokemon_tcg_api_key
        return headers

    async def get_raw_card_by_id(self, pokemon_tcg_id: str) -> Optional[dict]:
        cache_key = f"pokemon_tcg:raw:{pokemon_tcg_id}"
        cached = get_cached(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{POKEMON_TCG_URL}/cards/{pokemon_tcg_id}",
                headers=self._api_headers(),
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            item = response.json().get("data", {})

        set_cached(cache_key, item, ttl=43200)
        return item

    async def search_cards(
        self,
        query: str = "",
        name: Optional[str] = None,
        set_code: Optional[str] = None,
        number: Optional[str] = None,
        page_size: int = 20,
    ) -> list[PokemonCardData]:
        search_term = (query or name or "").strip()
        cache_key = f"pokemon_tcg:search:{search_term.lower()}:{page_size}:{set_code}:{number}"
        cached = get_cached(cache_key)
        if cached:
            return [PokemonCardData(**item) for item in cached]

        tcg_query = self._build_search_query(search_term)
        query_parts = [tcg_query]
        if set_code:
            query_parts.append(f"set.id:{set_code}")
        if number:
            query_parts.append(f"number:{number}")

        params = {"q": " ".join(query_parts), "pageSize": page_size}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{POKEMON_TCG_URL}/cards",
                    params=params,
                    headers=self._api_headers(),
                )
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, httpx.TimeoutException):
            return []

        results = [self._parse_card_item(item) for item in data.get("data", [])]

        # Fallback: if a full pasted name returns nothing, search the strongest keyword
        if not results:
            words = self._extract_search_words(search_term)
            if len(words) > 1:
                main_word = max(words, key=len)
                fallback_query = f"name:{main_word}*"
                fallback_parts = [fallback_query]
                if set_code:
                    fallback_parts.append(f"set.id:{set_code}")
                if number:
                    fallback_parts.append(f"number:{number}")
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.get(
                            f"{POKEMON_TCG_URL}/cards",
                            params={"q": " ".join(fallback_parts), "pageSize": page_size},
                            headers=self._api_headers(),
                        )
                        response.raise_for_status()
                        data = response.json()
                    results = [self._parse_card_item(item) for item in data.get("data", [])]
                except (httpx.HTTPError, httpx.TimeoutException):
                    pass

        set_cached(cache_key, [r.__dict__ for r in results], ttl=43200)
        return results

    async def validate_pokemon_card(self, extracted_data: dict) -> dict:
        results = await self.search_cards(
            name=extracted_data.get("card_name", ""),
            set_code=extracted_data.get("set_code"),
            number=extracted_data.get("card_number"),
        )
        if not results:
            return extracted_data

        best = results[0]
        extracted_data.update(
            {
                "pokemon_tcg_id": best.id,
                "card_name": best.name,
                "set_name": best.set_name or extracted_data.get("set_name"),
                "set_code": best.set_code or extracted_data.get("set_code"),
                "card_number": best.number or extracted_data.get("card_number"),
                "rarity": best.rarity or extracted_data.get("rarity"),
                "image_url": best.image_url,
                "thumbnail_url": best.thumbnail_url or best.image_url,
                "year": best.year or extracted_data.get("year"),
            }
        )
        return extracted_data

    async def get_card_by_id(self, pokemon_tcg_id: str) -> Optional[PokemonCardData]:
        raw = await self.get_raw_card_by_id(pokemon_tcg_id)
        if not raw:
            return None
        return self._parse_card_item(raw)

    async def get_card_by_pokemon_tcg_id(self, pokemon_tcg_id: str) -> Optional[PokemonCardData]:
        return await self.get_card_by_id(pokemon_tcg_id)
