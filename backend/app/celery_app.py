from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "card_market",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.price_tasks", "app.tasks.insight_tasks", "app.tasks.maintenance_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "refresh-all-prices-every-6h": {
        "task": "app.tasks.price_tasks.refresh_all_portfolio_prices",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "compute-trending-daily": {
        "task": "app.tasks.maintenance_tasks.compute_trending_cards",
        "schedule": crontab(minute=0, hour=0),
    },
    "generate-portfolio-reports-weekly": {
        "task": "app.tasks.insight_tasks.generate_all_portfolio_reports",
        "schedule": crontab(day_of_week=1, hour=6, minute=0),
    },
    "purge-trash-daily": {
        "task": "app.tasks.maintenance_tasks.purge_old_trash",
        "schedule": crontab(hour=3, minute=0),
    },
}
