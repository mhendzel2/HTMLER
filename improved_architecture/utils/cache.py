import time
from typing import Any, Dict, Optional

class CacheManager:
    """Simple in-memory async cache manager with TTL support."""
    def __init__(self):
        self._store: Dict[str, tuple[float, Any]] = {}

    async def get(self, key: str) -> Optional[Any]:
        item = self._store.get(key)
        if not item:
            return None
        expires, value = item
        if expires < time.time():
            self._store.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: Any, ttl: int) -> None:
        self._store[key] = (time.time() + ttl, value)
