import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 100, scans_per_hour: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.scans_per_hour = scans_per_hour
        self.request_counts: dict[str, list[float]] = defaultdict(list)
        self.scan_counts: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_id = request.client.host if request.client else "unknown"
        now = time.time()

        self.request_counts[client_id] = [t for t in self.request_counts[client_id] if now - t < 60]
        if len(self.request_counts[client_id]) >= self.requests_per_minute:
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

        if request.url.path.endswith("/cards/scan") and request.method == "POST":
            self.scan_counts[client_id] = [t for t in self.scan_counts[client_id] if now - t < 3600]
            if len(self.scan_counts[client_id]) >= self.scans_per_hour:
                return JSONResponse(status_code=429, content={"detail": "Scan rate limit exceeded"})
            self.scan_counts[client_id].append(now)

        self.request_counts[client_id].append(now)
        return await call_next(request)
