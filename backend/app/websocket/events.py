"""
WebSocket event definitions.
"""

class WSEvent:
    """Constants for WebSocket event types."""
    
    # Telemetry events
    TELEMETRY_UPDATE = "TELEMETRY_UPDATE"
    ANOMALY_DETECTED = "ANOMALY_DETECTED"
    
    # Orbit & Tracking events
    TLE_UPDATED = "TLE_UPDATED"
    CONJUNCTION_ALERT = "CONJUNCTION_ALERT"
    MANEUVER_RECOMMENDATION = "MANEUVER_RECOMMENDATION"
    
    # Kessler Simulation
    KESSLER_DEBRIS_GENERATED = "KESSLER_DEBRIS_GENERATED"
    KESSLER_CASCADING_ALERT = "KESSLER_CASCADING_ALERT"
    
    # Space Weather
    SPACE_WEATHER_ALERT = "SPACE_WEATHER_ALERT"
