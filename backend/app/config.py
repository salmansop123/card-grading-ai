from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    secret_key: str = "change-me-in-production"
    frontend_url: str = "http://localhost:3000"

    database_url: str = "postgresql://postgres:password@localhost:5432/card_market_db"
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    redis_url: str = "redis://localhost:6379/0"
    upstash_redis_url: Optional[str] = None

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    ebay_app_id: str = ""
    ebay_cert_id: str = ""
    ebay_dev_id: str = ""
    ebay_oauth_token: str = ""
    pokemon_tcg_api_key: str = ""

    supabase_storage_bucket: str = "card-images"

    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    @property
    def effective_redis_url(self) -> str:
        return self.upstash_redis_url or self.redis_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
