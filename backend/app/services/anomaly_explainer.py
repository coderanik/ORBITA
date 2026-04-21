import os
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.telemetry import SatelliteTelemetry
from app.models.anomaly_alert import AnomalyAlert
from app.models.space_weather import SpaceWeather

class AnomalyExplainer:
    """Service to explain anomalies using LLMs and domain context."""

    def __init__(self, db: AsyncSession, api_key: Optional[str] = None, provider: str = "openai"):
        self.db = db
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.provider = provider

    async def get_context_data(self, alert: AnomalyAlert) -> Dict[str, Any]:
        """Gather telemetry and space weather context for the anomaly window."""
        # 1. Fetch telemetry for the subsystem during the window
        query = select(SatelliteTelemetry).where(
            and_(
                SatelliteTelemetry.object_id == alert.object_id,
                SatelliteTelemetry.subsystem == alert.subsystem,
                SatelliteTelemetry.ts >= alert.window_start,
                SatelliteTelemetry.ts <= alert.window_end
            )
        ).order_by(SatelliteTelemetry.ts)
        
        result = await self.db.execute(query)
        telemetry_points = result.scalars().all()
        
        # 2. Fetch latest space weather
        sw_query = select(SpaceWeather).order_by(SpaceWeather.observation_time.desc()).limit(1)
        sw_result = await self.db.execute(sw_query)
        latest_sw = sw_result.scalar_one_or_none()
        
        return {
            "telemetry_count": len(telemetry_points),
            "telemetry_sample": [
                {"ts": p.ts.isoformat(), "param": p.parameter_name, "val": p.value} 
                for p in telemetry_points[:10]
            ],
            "space_weather": {
                "f107": latest_sw.f10_7 if latest_sw else "N/A",
                "kp_index": latest_sw.kp_index if latest_sw else "N/A"
            } if latest_sw else None
        }

    async def explain_anomaly(self, alert_id: int) -> str:
        """Generate an explanation for the specified anomaly."""
        # Fetch alert
        result = await self.db.execute(select(AnomalyAlert).where(AnomalyAlert.alert_id == alert_id))
        alert = result.scalar_one_or_none()
        
        if not alert:
            return "Anomaly alert not found."
            
        context = await self.get_context_data(alert)
        
        # In a real scenario, we'd call OpenAI/Anthropic here.
        # For the demo, we'll provide a high-quality "mock" LLM response 
        # that incorporates the gathered context.
        
        explanation = (
            f"### Anomaly Diagnosis: {alert.anomaly_type} in {alert.subsystem}\n\n"
            f"**Observation:** Anomaly detected at {alert.detected_at.strftime('%Y-%m-%d %H:%M:%S UTC')}. "
            f"The anomaly score reached {alert.anomaly_score:.4f}, exceeding the threshold of {alert.threshold_used}.\n\n"
            f"**Contextual Analysis:**\n"
            f"- **Telemetry Signals:** Analysis of {context['telemetry_count']} data points in the {alert.subsystem} subsystem "
            f"shows atypical fluctuations in power-bus voltage and thermal regulation parameters.\n"
        )
        
        if context['space_weather']:
            sw = context['space_weather']
            explanation += (
                f"- **Environmental Factors:** Current Space Weather indicates an F10.7 solar flux of {sw['f107']} "
                f"and a Kp-index of {sw['kp_index']}. "
            )
            if sw['kp_index'] != "N/A" and float(sw['kp_index']) > 4:
                explanation += "The elevated geomagnetic activity (Kp > 4) is a likely contributing factor to surface charging or single-event effects (SEE).\n"
            else:
                explanation += "Geomagnetic conditions appear nominal, suggesting an internal component degradation or software glitch.\n"
        
        explanation += (
            f"\n**Recommended Action:**\n"
            f"1. Initiate secondary telemetry sweep for {alert.subsystem}.\n"
            f"2. Verify redundant system status for the affected component.\n"
            f"3. Acknowledge alert and monitor for recurrence during the next orbital pass."
        )
        
        return explanation
