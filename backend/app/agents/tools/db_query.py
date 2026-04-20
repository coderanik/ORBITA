"""
Database query tools for the AI agent.
"""

from langchain_core.tools import tool
import json

@tool
def query_telemetry(alert_id: int) -> str:
    """
    Fetches the recent telemetry data and subsystem information for a given anomaly alert ID.
    Always use this first to understand what went wrong on the spacecraft.
    """
    # Mock DB fetch for the demo
    data = {
        "alert_id": alert_id,
        "subsystem": "EPS (Electrical Power System)",
        "anomaly_type": "Sudden Voltage Drop",
        "telemetry_snippet": [
            {"time": "10:00:00", "bus_voltage": 28.1, "batt_temp": 15.2},
            {"time": "10:01:00", "bus_voltage": 28.0, "batt_temp": 15.3},
            {"time": "10:02:00", "bus_voltage": 24.5, "batt_temp": 17.8},  # Anomaly
            {"time": "10:03:00", "bus_voltage": 24.2, "batt_temp": 19.1}
        ]
    }
    return json.dumps(data)

@tool
def query_space_weather(time_window: str) -> str:
    """
    Fetches the space weather environment (Kp index, Solar Flares) for a given time window.
    Use this to determine if the anomaly was caused by environmental factors.
    """
    data = {
        "kp_index": 5.3,  # Minor geomagnetic storm
        "f107_flux": 185.0,
        "solar_flares": "M2.1 class flare detected 2 hours prior."
    }
    return json.dumps(data)
