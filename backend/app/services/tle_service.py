"""Service to fetch and parse Two-Line Element sets from external sources."""

import httpx
from datetime import datetime, timezone
from sgp4.api import Satrec, WGS72
from sgp4.api import jday


CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php"


async def fetch_tle_from_celestrak(group: str = "active") -> list[dict]:
    """
    Fetch TLEs from CelesTrak for a given group.

    Groups: active, stations, starlink, weather, resource, etc.
    Returns list of dicts with keys: name, line1, line2
    """
    url = f"{CELESTRAK_BASE}?GROUP={group}&FORMAT=tle"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    lines = resp.text.strip().split("\n")
    tles = []
    for i in range(0, len(lines) - 2, 3):
        name = lines[i].strip()
        line1 = lines[i + 1].strip()
        line2 = lines[i + 2].strip()
        if line1.startswith("1 ") and line2.startswith("2 "):
            tles.append({"name": name, "line1": line1, "line2": line2})

    return tles


def parse_tle(line1: str, line2: str) -> dict:
    """
    Parse a TLE pair into orbital elements using sgp4.

    Returns a dict with NORAD ID, epoch, Keplerian elements, and
    Cartesian state at epoch.
    """
    sat = Satrec.twoline2rv(line1, line2, WGS72)

    # Extract NORAD ID
    norad_id = int(line1[2:7].strip())

    # Extract epoch from TLE
    epoch_year = int(line1[18:20])
    epoch_day = float(line1[20:32])
    if epoch_year < 57:
        epoch_year += 2000
    else:
        epoch_year += 1900

    # Convert to datetime
    from datetime import timedelta
    epoch_dt = datetime(epoch_year, 1, 1, tzinfo=timezone.utc) + timedelta(days=epoch_day - 1)

    # Propagate to epoch to get position/velocity
    jd, fr = jday(
        epoch_dt.year, epoch_dt.month, epoch_dt.day,
        epoch_dt.hour, epoch_dt.minute, epoch_dt.second + epoch_dt.microsecond / 1e6,
    )
    e, r, v = sat.sgp4(jd, fr)

    return {
        "norad_id": norad_id,
        "epoch": epoch_dt,
        "position_x_km": r[0] if e == 0 else None,
        "position_y_km": r[1] if e == 0 else None,
        "position_z_km": r[2] if e == 0 else None,
        "velocity_x_km_s": v[0] if e == 0 else None,
        "velocity_y_km_s": v[1] if e == 0 else None,
        "velocity_z_km_s": v[2] if e == 0 else None,
        "reference_frame": "TEME",
        "inclination_deg": sat.inclo * 180.0 / 3.141592653589793,
        "eccentricity": sat.ecco,
        "raan_deg": sat.nodeo * 180.0 / 3.141592653589793,
        "arg_perigee_deg": sat.argpo * 180.0 / 3.141592653589793,
        "mean_anomaly_deg": sat.mo * 180.0 / 3.141592653589793,
        "mean_motion_rev_day": sat.no_kozai * 1440.0 / (2.0 * 3.141592653589793),  # rad/min -> rev/day
        "semimajor_axis_km": None,  # computed by DB trigger from elements
        "tle_line1": line1,
        "tle_line2": line2,
        "source": "TLE",
        "sgp4_error": e,
    }
