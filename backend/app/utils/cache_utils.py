import json
from typing import Any, Optional

from app.redis_client import cache_delete, cache_get, cache_set

__all__ = ["get_cached", "set_cached", "invalidate_cached"]


def get_cached(key: str) -> Optional[Any]:
    return cache_get(key)


def set_cached(key: str, value: Any, ttl: int = 3600) -> None:
    cache_set(key, value, ttl)


def invalidate_cached(key: str) -> None:
    cache_delete(key)
