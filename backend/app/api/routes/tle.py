from fastapi import APIRouter
from skyfield.api import load
import math
from app.core.config import get_settings
import os

router = APIRouter(tags=["TLE"])
settings = get_settings()

# Resolve path to TLE data
# Since this is in app/api/routes, we go up 3 levels to backend/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
TLE_PATH = os.path.join(BASE_DIR, "tle_data", "active.txt")

# Load TLE data
try:
    SATELLITES = load.tle_file(TLE_PATH)
except Exception as e:
    print(f"Warning: Could not load TLE data from {TLE_PATH}: {e}")
    SATELLITES = []

ts = load.timescale()

@router.get("/real-positions")
def get_real_positions():
    current_time = ts.now()
    positions = {}
    
    # We map satellite index (+1 so it's 1-15) to its real lat/lon
    for idx, sat in enumerate(SATELLITES):
        try:
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
        except Exception:
            continue
    
    return positions
