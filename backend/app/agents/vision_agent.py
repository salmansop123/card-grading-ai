import base64
import json
import os
import re
from typing import Any, Optional

import httpx

from app.agents.prompts import MODEL_FALLBACK_CHAIN, VISION_SYSTEM_PROMPT, VISION_USER_PROMPT
from app.config import get_settings

settings = get_settings()


def _extract_json(content: str) -> dict[str, Any]:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    return json.loads(content)


class VisionAgent:
    async def analyze_image(self, image_data: bytes) -> tuple[dict[str, Any], str]:
        if not os.getenv("OPENROUTER_API_KEY"):
            return (
                {
                    "status": "unavailable",
                    "message": "AI scanning requires OpenRouter API key",
                },
                "unavailable",
            )

        b64_image = base64.b64encode(image_data).decode()
        last_error: Optional[Exception] = None

        for model in MODEL_FALLBACK_CHAIN:
            try:
                result = await self._call_model(model, b64_image)
                if result is not None:
                    return result, model
            except Exception as exc:
                last_error = exc
                continue

        raise RuntimeError(f"All vision models failed: {last_error}")

    async def _call_model(self, model: str, b64_image: str) -> Optional[dict[str, Any]]:
        if not os.getenv("OPENROUTER_API_KEY"):
            return None

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "HTTP-Referer": settings.frontend_url,
            "X-Title": "Card Market Intelligence Platform",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": VISION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_image}",
                                "detail": "high",
                            },
                        },
                        {"type": "text", "text": VISION_USER_PROMPT},
                    ],
                },
            ],
            "max_tokens": 1000,
            "temperature": 0.1,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return _extract_json(content)
