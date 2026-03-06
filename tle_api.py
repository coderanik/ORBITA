import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from skyfield.api import load
import math
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load TLE data
SATELLITES = load.tle_file('/Users/anik/Code/ORBITA/tle_data/active.txt')
ts = load.timescale()

@app.get("/real-positions")
def get_real_positions():
    current_time = ts.now()
    positions = {}
    
    # We map satellite index (+1 so it's 1-15) to its real lat/lon
    for idx, sat in enumerate(SATELLITES):
        geocentric = sat.at(current_time)
        subpoint = geocentric.subpoint()
        
        # Calculate real-time altitude (km)
        alt_km = subpoint.elevation.km
        
        # Clamp to realistic LEO if negative parsing errors
        if alt_km < 0 or math.isnan(alt_km):
             alt_km = 400.0

        positions[str(idx + 1)] = {
            "name": sat.name,
            "lat": subpoint.latitude.degrees,
            "lon": subpoint.longitude.degrees,
            "alt": alt_km * 1000  # Convert to meters for Cesium
        }
    
    return positions

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
