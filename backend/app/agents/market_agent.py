import json
import os
import re
from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()

MARKET_SYSTEM_PROMPT = """You are a Pokémon TCG market analyst with deep expertise in collectible 
Pokémon card valuations. You analyze price data to generate clear, actionable 
market insights for Pokémon collectors and investors.

Keep your responses concise, factual, and jargon-free. Speak to collectors 
who care about value but may not be finance experts.

Always respond ONLY with valid JSON matching the requested schema."""


class MarketAgent:
    MODEL = "anthropic/claude-3-haiku"

    def _ai_available(self) -> bool:
        key = settings.openrouter_api_key.strip()
        return bool(key) and key not in {"sk-or-...", "your-openrouter-key"}

    def _fallback_insight(self, card_data: dict[str, Any], market_data: dict[str, Any]) -> dict[str, Any]:
        pct_7d = market_data.get("pct_change_7d")
        raw_price = market_data.get("raw_price")
        psa10 = market_data.get("psa10_price")
        card_name = card_data.get("card_name", "This card")

        if pct_7d is not None:
            if pct_7d > 2:
                trend = "rising"
                trend_reason = f"{card_name} is up {pct_7d:.1f}% over the last 7 days based on tracked sales."
                signal = "hold"
            elif pct_7d < -2:
                trend = "declining"
                trend_reason = f"{card_name} is down {abs(pct_7d):.1f}% over the last 7 days."
                signal = "sell" if pct_7d < -8 else "hold"
            else:
                trend = "stable"
                trend_reason = f"{card_name} has been relatively stable over the last 7 days."
                signal = "hold"
        else:
            trend = "stable"
            trend_reason = f"Limited recent price data for {card_name}."
            signal = "hold"

        grade_roi = None
        grade_rec = False
        if raw_price and psa10 and raw_price > 0:
            grade_roi = round(((float(psa10) - float(raw_price) - 25) / float(raw_price)) * 100, 1)
            grade_rec = grade_roi > 50

        return {
            "market_trend": trend,
            "trend_reason": trend_reason,
            "investment_signal": signal if not grade_rec else "grade",
            "signal_reasoning": (
                f"Estimated PSA 10 ROI is {grade_roi:.0f}% after grading fees."
                if grade_roi is not None and grade_rec
                else "Monitor eBay sold listings before making a move."
            ),
            "grade_recommendation": grade_rec,
            "grade_roi_estimate": grade_roi,
            "key_risks": ["Market prices can shift quickly on low sales volume."],
            "key_catalysts": ["Strong PSA 10 premiums can boost graded value."],
            "summary": f"{card_name}: {trend} trend with a {signal} signal.",
            "source": "rules_fallback",
        }

    async def generate_insight(self, card_data: dict[str, Any], market_data: dict[str, Any]) -> dict[str, Any]:
        if not self._ai_available():
            return self._fallback_insight(card_data, market_data)

        prompt = self._build_prompt(card_data, market_data)
        try:
            result = await self._call_model(prompt)
            if result is None:
                return self._fallback_insight(card_data, market_data)
            return result
        except (httpx.HTTPError, json.JSONDecodeError, KeyError):
            return self._fallback_insight(card_data, market_data)

    def _build_prompt(self, card_data: dict[str, Any], market_data: dict[str, Any]) -> str:
        ebay_summary = market_data.get("ebay_sales_summary", "No recent sales")
        return f"""Analyze the following market data for this Pokémon card and generate insights.

Card: {card_data.get('card_name')} — {card_data.get('set_name')} #{card_data.get('card_number')}
Type: {card_data.get('card_type')} | Rarity: {card_data.get('rarity')}

Current Market Data:
- Raw Price: ${market_data.get('raw_price')}
- PSA 8: ${market_data.get('psa8_price')}
- PSA 9: ${market_data.get('psa9_price')}
- PSA 10: ${market_data.get('psa10_price')}
- 7-Day Change: {market_data.get('pct_change_7d')}%
- 30-Day Change: {market_data.get('pct_change_30d')}%
- Volatility Score: {market_data.get('volatility_score')}

Recent eBay Sales (last 10):
{ebay_summary}

Return ONLY valid JSON:
{{
  "market_trend": "rising | stable | declining",
  "trend_reason": "2-3 sentence explanation",
  "investment_signal": "buy | hold | sell | grade",
  "signal_reasoning": "2-3 sentences",
  "grade_recommendation": true or false,
  "grade_roi_estimate": float or null,
  "key_risks": ["list of 1-3 risk factors"],
  "key_catalysts": ["list of 1-3 positive drivers"],
  "summary": "1 sentence market summary"
}}"""

    async def _call_model(self, prompt: str) -> dict[str, Any]:
        if not os.getenv("OPENROUTER_API_KEY"):
            return None

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "HTTP-Referer": settings.frontend_url,
            "X-Title": "Card Market Intelligence Platform",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": MARKET_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 800,
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            content = content.strip()
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\n?", "", content)
                content = re.sub(r"\n?```$", "", content)
            return json.loads(content)
