"""
Celery beat schedule configuration.
"""

from celery.schedules import crontab
from .celery_app import celery_app

celery_app.conf.beat_schedule = {
    "update-tles-every-30-mins": {
        "task": "app.workers.tasks.tle_updater.update_active_tles",
        "schedule": crontab(minute="*/30"),
        "args": ("active",)
    },
    "fetch-space-weather-every-15-mins": {
        "task": "app.workers.tasks.space_weather.fetch_space_weather_data",
        "schedule": crontab(minute="*/15"),
    },
    "screen-conjunctions-hourly": {
        "task": "app.workers.tasks.conjunction_scan.run_full_catalog_screening",
        "schedule": crontab(minute="0"), # Top of every hour
    },
}
