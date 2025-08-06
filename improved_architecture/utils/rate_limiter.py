import asyncio
import time

class RateLimiter:
    """Basic async rate limiter ensuring a minimum interval between calls."""
    def __init__(self, rate_per_second: float):
        self.min_interval = 1.0 / rate_per_second if rate_per_second > 0 else 0
        self._last = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            wait = self.min_interval - (now - self._last)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last = time.monotonic()
