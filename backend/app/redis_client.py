import json
from typing import Any, Optional

import redis

from app.config import get_settings

settings = get_settings()

_redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.effective_redis_url, decode_responses=True)
    return _redis_client


def cache_get(key: str) -> Optional[Any]:
    client = get_redis()
    value = client.get(key)
    if value is None:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    client = get_redis()
    serialized = json.dumps(value) if not isinstance(value, str) else value
    client.setex(key, ttl, serialized)


def cache_delete(key: str) -> None:
    get_redis().delete(key)


def cache_delete_pattern(pattern: str) -> None:
    client = get_redis()
    for key in client.scan_iter(match=pattern):
        client.delete(key)
