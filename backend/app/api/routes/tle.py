from fastapi import APIRouter
from skyfield.api import load
import math
from app.core.config import get_settings
import os
from pydantic import BaseModel, Field
from fastapi import Depends, HTTPException

from app.auth.dependencies import get_current_user

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


class ManualTLEIngest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    line1: str = Field(min_length=69, max_length=69)
    line2: str = Field(min_length=69, max_length=69)

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


@router.post("/tle/manual")
def ingest_manual_tle(payload: ManualTLEIngest, _: dict = Depends(get_current_user)):
    """Manually ingest a TLE triple for objects not available in CelesTrak."""
    if not payload.line1.startswith("1 ") or not payload.line2.startswith("2 "):
        raise HTTPException(status_code=400, detail="Invalid TLE format")
    manual_path = os.path.join(BASE_DIR, "tle_data", "manual_ingest.txt")
    with open(manual_path, "a", encoding="utf-8") as f:
        f.write(f"{payload.name.strip()}\n")
        f.write(f"{payload.line1.strip()}\n")
        f.write(f"{payload.line2.strip()}\n")
    return {"status": "ingested", "path": "tle_data/manual_ingest.txt"}
