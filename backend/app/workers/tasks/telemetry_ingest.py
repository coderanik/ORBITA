import asyncio
from datetime import datetime, timedelta, timezone

from celery import shared_task
from sqlalchemy import desc, select

from app.core.database import async_session
from app.models.anomaly_alert import AnomalyAlert
from app.models.telemetry import SatelliteTelemetry
from app.websocket.events import WSEvent
from app.websocket.manager import manager


def _parse_ts(raw_ts):
    if isinstance(raw_ts, datetime):
        return raw_ts if raw_ts.tzinfo else raw_ts.replace(tzinfo=timezone.utc)
    if isinstance(raw_ts, str):
        normalized = raw_ts.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _severity_from_zscore(z_score: float) -> str:
    if z_score >= 6.0:
        return "CRITICAL"
    if z_score >= 4.5:
        return "ERROR"
    return "WARNING"

@shared_task(name="app.workers.tasks.telemetry_ingest.process_telemetry_batch")
def process_telemetry_batch(batch_data: list[dict]):
    """
    Background task to process streaming telemetry.
    Can be called by the FastAPI ingest endpoint to offload DB writes and ML inference.
    """
    async def _run():
        print(f"[Telemetry Ingest] Processing batch of {len(batch_data)} records...")

        async with async_session() as db:
            telemetry_rows: list[SatelliteTelemetry] = []
            alerts_created = 0

            for raw in batch_data:
                ts = _parse_ts(raw.get("ts"))
                row = SatelliteTelemetry(
                    object_id=int(raw["object_id"]),
                    ts=ts,
                    subsystem=str(raw.get("subsystem", "UNKNOWN")).upper(),
                    parameter_name=str(raw.get("parameter_name", "unknown")),
                    value=raw.get("value"),
                    unit=raw.get("unit"),
                    quality=str(raw.get("quality", "NOMINAL")).upper(),
                    raw_data=raw.get("raw_data"),
                )
                telemetry_rows.append(row)
                db.add(row)

            await db.flush()

            for row in telemetry_rows:
                if row.value is None:
                    continue

                history_query = (
                    select(SatelliteTelemetry.value)
                    .where(SatelliteTelemetry.object_id == row.object_id)
                    .where(SatelliteTelemetry.subsystem == row.subsystem)
                    .where(SatelliteTelemetry.parameter_name == row.parameter_name)
                    .where(SatelliteTelemetry.value.is_not(None))
                    .where(SatelliteTelemetry.ts < row.ts)
                    .order_by(desc(SatelliteTelemetry.ts))
                    .limit(120)
                )
                history_values = [v for v in (await db.execute(history_query)).scalars().all() if v is not None]
                if len(history_values) < 20:
                    continue

                mean = sum(history_values) / len(history_values)
                variance = sum((v - mean) ** 2 for v in history_values) / len(history_values)
                std = variance ** 0.5
                if std <= 1e-9:
                    continue

                z_score = abs((row.value - mean) / std)
                if z_score < 3.0:
                    continue

                threshold = mean + 3.0 * std
                alert = AnomalyAlert(
                    object_id=row.object_id,
                    subsystem=row.subsystem,
                    anomaly_type="TELEMETRY_DEVIATION",
                    severity=_severity_from_zscore(z_score),
                    anomaly_score=float(z_score),
                    threshold_used=float(threshold),
                    model_version="stream-zscore-v1",
                    description=(
                        f"{row.parameter_name} deviated from baseline "
                        f"(value={row.value:.6g}, baseline_mean={mean:.6g}, z_score={z_score:.2f})."
                    ),
                    window_start=row.ts - timedelta(minutes=5),
                    window_end=row.ts,
                )
                db.add(alert)
                alerts_created += 1

                await manager.broadcast(
                    WSEvent.ANOMALY_DETECTED,
                    {
                        "object_id": row.object_id,
                        "subsystem": row.subsystem,
                        "parameter_name": row.parameter_name,
                        "severity": alert.severity,
                        "anomaly_score": alert.anomaly_score,
                        "threshold_used": alert.threshold_used,
                        "ts": row.ts.isoformat(),
                    },
                )

                await manager.broadcast(
                    WSEvent.TELEMETRY_UPDATE,
                    {
                        "object_id": row.object_id,
                        "subsystem": row.subsystem,
                        "parameter_name": row.parameter_name,
                        "value": row.value,
                        "quality": row.quality,
                        "ts": row.ts.isoformat(),
                    },
                )

            await db.commit()
            print(
                f"[Telemetry Ingest] Stored {len(telemetry_rows)} points and raised {alerts_created} anomaly alerts."
            )
        
    asyncio.run(_run())
    return {"status": "success", "processed": len(batch_data)}
