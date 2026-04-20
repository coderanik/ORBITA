import httpx
import asyncio
from celery import shared_task

@shared_task(name="app.workers.tasks.space_weather.fetch_space_weather_data")
def fetch_space_weather_data():
    """
    Background task to fetch space weather data from NOAA SWPC.
    """
    async def _run():
        url = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
        
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                
                # In real scenario:
                # 1. Parse F10.7, Kp-index, solar flares
                # 2. Insert into `analytics.space_weather` table
                # 3. Check thresholds and broadcast WebSocket alerts
                
                print(f"[Space Weather] Fetched latest Kp-index data: {len(data)} records")
            except Exception as e:
                print(f"[Space Weather] Failed to fetch data: {e}")
                
    asyncio.run(_run())
    return {"status": "success"}
