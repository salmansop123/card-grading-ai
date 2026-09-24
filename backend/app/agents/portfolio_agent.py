import json
import re
from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()

PORTFOLIO_SYSTEM_PROMPT = """You are a portfolio advisor specializing in Pokémon TCG collectibles. 
You help Pokémon collectors optimize their collection strategy by identifying 
grading opportunities, timing, and portfolio concentration risks.

Analyze the portfolio data and provide specific, actionable advice.
Always respond ONLY with valid JSON."""


class PortfolioAgent:
    MODEL = "anthropic/claude-3.5-sonnet"

    def _ai_available(self) -> bool:
        key = settings.openrouter_api_key.strip()
        return bool(key) and key not in {"sk-or-...", "your-openrouter-key"}

    def _fallback_report(self, portfolio_data: dict[str, Any]) -> dict[str, Any]:
        summary = portfolio_data.get("summary") or {}
        holdings = portfolio_data.get("holdings") or []
        card_count = summary.get("card_count", 0)
        total_value = float(summary.get("total_value") or 0)
        gain_pct = float(summary.get("total_gain_loss_pct") or 0)

        if card_count == 0:
            return {
                "portfolio_health": "fair",
                "total_value_assessment": "Your portfolio is empty. Add Pokémon cards to unlock personalized insights.",
                "top_grading_candidates": [],
                "sell_candidates": [],
                "concentration_warnings": [],
                "market_opportunities": [
                    "Upload or search cards to start tracking values.",
                    "Focus on holos and illustration rares for stronger long-term appreciation.",
                ],
                "overall_recommendation": "Add your first cards to the portfolio to get grading and market recommendations.",
                "source": "rules_fallback",
            }

        if gain_pct > 10:
            health = "excellent"
        elif gain_pct > 0:
            health = "good"
        elif gain_pct > -10:
            health = "fair"
        else:
            health = "poor"

        grading_candidates = []
        sell_candidates = []
        for holding in holdings:
            card = holding.get("card") or {}
            card_id = str(card.get("id") or holding.get("holding_id") or "")
            card_name = card.get("card_name") or "Unknown card"
            current_value = float(holding.get("current_value") or 0)
            trend = holding.get("trend") or "stable"
            condition = (holding.get("condition") or "raw").lower()

            if condition == "raw" and current_value >= 25 and trend == "rising":
                grading_candidates.append(
                    {
                        "card_id": card_id,
                        "card_name": card_name,
                        "raw_price": current_value,
                        "psa10_price": round(current_value * 2.5, 2),
                        "estimated_roi_pct": 80.0,
                        "reasoning": f"{card_name} is trending up — consider PSA grading if centering and surface look clean.",
                    }
                )

            if trend == "declining" and float(holding.get("gain_loss_pct") or 0) > 15:
                sell_candidates.append(
                    {
                        "card_id": card_id,
                        "card_name": card_name,
                        "reasoning": f"{card_name} is declining while still above cost — consider taking profits.",
                    }
                )

        grading_candidates.sort(key=lambda c: c.get("estimated_roi_pct", 0), reverse=True)
        grading_candidates = grading_candidates[:3]
        sell_candidates = sell_candidates[:3]

        concentration_warnings = []
        if total_value > 0:
            for holding in holdings:
                current_value = float(holding.get("current_value") or 0)
                quantity = int(holding.get("quantity") or 1)
                holding_value = current_value * quantity
                share = (holding_value / total_value) * 100
                if share >= 40:
                    card_name = (holding.get("card") or {}).get("card_name", "A card")
                    concentration_warnings.append(
                        f"{card_name} makes up {share:.0f}% of portfolio value consider diversifying."
                    )

        rising = [h for h in holdings if h.get("trend") == "rising"]
        opportunities = []
        if rising:
            names = [(h.get("card") or {}).get("card_name", "card") for h in rising[:3]]
            opportunities.append(f"Rising cards: {', '.join(names)} — monitor for grading or hold opportunities.")
        if not opportunities:
            opportunities.append("Track price velocity on your holos and promos before the next market move.")

        return {
            "portfolio_health": health,
            "total_value_assessment": (
                f"Portfolio value is ${total_value:,.2f} across {card_count} cards "
                f"({'up' if gain_pct >= 0 else 'down'} {abs(gain_pct):.1f}% vs cost basis)."
            ),
            "top_grading_candidates": grading_candidates,
            "sell_candidates": sell_candidates,
            "concentration_warnings": concentration_warnings,
            "market_opportunities": opportunities,
            "overall_recommendation": (
                "Review raw cards with strong recent momentum for grading ROI."
                if grading_candidates
                else "Keep building price history insights improve as more market data is tracked."
            ),
            "source": "rules_fallback",
        }

    async def generate_report(self, portfolio_data: dict[str, Any]) -> dict[str, Any]:
        if not self._ai_available():
            return self._fallback_report(portfolio_data)

        prompt = f"""Analyze this portfolio and provide strategic recommendations.

Portfolio Data:
{json.dumps(portfolio_data, indent=2, default=str)}

Return ONLY valid JSON:
{{
  "portfolio_health": "excellent | good | fair | poor",
  "total_value_assessment": "string",
  "top_grading_candidates": [
    {{
      "card_id": "uuid string",
      "card_name": "string",
      "raw_price": 0.0,
      "psa10_price": 0.0,
      "estimated_roi_pct": 0.0,
      "reasoning": "string"
    }}
  ],
  "sell_candidates": [
    {{
      "card_id": "uuid string",
      "card_name": "string",
      "reasoning": "string"
    }}
  ],
  "concentration_warnings": ["string"],
  "market_opportunities": ["string"],
  "overall_recommendation": "string"
}}"""

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "HTTP-Referer": settings.frontend_url,
            "X-Title": "Card Market Intelligence Platform",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": PORTFOLIO_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 2000,
            "temperature": 0.3,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
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
        except (httpx.HTTPError, json.JSONDecodeError, KeyError):
            return self._fallback_report(portfolio_data)
