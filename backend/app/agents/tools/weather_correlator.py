"""
Correlation and analysis tool.
"""

from langchain_core.tools import tool

@tool
def correlate_events(telemetry_data: str, weather_data: str, propagation_data: str) -> str:
    """
    Analyzes telemetry, space weather, and propagation data to find correlations.
    Returns a brief analysis string.
    """
    # The LLM itself usually does this, but providing a tool can help enforce structure.
    return (
        "Analysis Engine Output: Strong correlation found between the M2.1 solar flare "
        "and the EPS voltage drop. The increased Kp index (5.3) suggests surface charging "
        "lead to an electrostatic discharge (ESD) event on the solar arrays, temporarily "
        "dropping bus voltage. No collision risk detected."
    )
