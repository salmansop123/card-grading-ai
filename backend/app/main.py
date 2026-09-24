from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, cards, insights, market, portfolio, wishlist
from app.config import get_settings
from app.middleware import RateLimitMiddleware

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Card Market Intelligence Platform API",
        description="AI-powered Pokémon TCG portfolio tracking and market intelligence",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware)

    app.include_router(auth.router, prefix="/api")
    app.include_router(cards.router, prefix="/api")
    app.include_router(portfolio.router, prefix="/api")
    app.include_router(wishlist.router, prefix="/api")
    app.include_router(market.router, prefix="/api")
    app.include_router(insights.router, prefix="/api")

    @app.get("/")
    async def root():
        return {
            "name": "Card Market Intelligence Platform API",
            "status": "running",
            "docs": "/docs",
            "health": "/health",
            "api_prefix": "/api",
        }

    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "env": settings.app_env}

    return app


app = create_app()
