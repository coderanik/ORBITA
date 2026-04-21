import asyncio
from celery import shared_task
from app.services.tle_service import fetch_tle_from_celestrak
# In a real setup, we would inject a database session and update the DB
# from app.core.database import SessionLocal

@shared_task(name="app.workers.tasks.tle_updater.update_active_tles")
def update_active_tles(group: str = "active"):
    """
    Background task to fetch latest TLEs and update the database.
    Celery tasks are synchronous by default, so we wrap the async call.
    """
    async def _run():
        tles = await fetch_tle_from_celestrak(group=group)
        print(f"[TLE Updater] Fetched {len(tles)} TLEs for group '{group}'.")
        
        # Here we would update the database:
        # async with SessionLocal() as db:
        #     for tle in tles:
        #         parsed = parse_tle(tle["line1"], tle["line2"])
        #         # Upsert logic...
        #     await db.commit()
            
    asyncio.run(_run())
    return {"status": "success", "group": group}
