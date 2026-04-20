"""
Propagation tool for the AI agent to simulate orbits.
"""

from langchain_core.tools import tool
import json

@tool
def run_propagation(object_id: int, target_time: str) -> str:
    """
    Runs an orbital propagation for the given space object ID to a specific target time.
    Use this to check for conjunctions (collisions) or orbital decay.
    """
    # Wraps Phase 1 HiFi Propagator (Mocked for agent tool demo)
    data = {
        "object_id": object_id,
        "target_time": target_time,
        "status": "Nominal",
        "closest_approach_km": 15.2,
        "altitude_drop_km": 0.5
    }
    return json.dumps(data)
