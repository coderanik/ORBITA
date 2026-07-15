import asyncio
from datetime import datetime, timedelta, timezone

import numpy as np
from celery import shared_task
from sqlalchemy import desc, func, select

from app.core.database import async_session
from app.models.conjunction import ConjunctionEvent
from app.models.orbit_state import OrbitState
from app.physics.collision.screening import screen_catalog
from app.websocket.events import WSEvent
from app.websocket.manager import manager


def _risk_level_from_distance(distance_km: float) -> str:
    if distance_km <= 0.5:
        return "RED"
    if distance_km <= 1.0:
        return "CRITICAL"
    if distance_km <= 3.0:
        return "HIGH"
    if distance_km <= 7.0:
        return "MEDIUM"
    return "LOW"


def _estimate_probability(distance_km: float) -> float:
    # Conservative monotonic mapping used when full covariance data is unavailable.
    return float(np.clip(np.exp(-distance_km / 2.0) * 1e-2, 1e-8, 1.0))

@shared_task(name="app.workers.tasks.conjunction_scan.run_full_catalog_screening")
def run_full_catalog_screening():
    """
    Background task to run full catalog conjunction screening.
    """
    async def _run():
        print("[Conjunction Scan] Starting full catalog KD-Tree screening...")

        async with async_session() as db:
            latest_state_subq = (
                select(
                    OrbitState.object_id,
                    OrbitState.epoch,
                    OrbitState.position_x_km,
                    OrbitState.position_y_km,
                    OrbitState.position_z_km,
                    OrbitState.velocity_x_km_s,
                    OrbitState.velocity_y_km_s,
                    OrbitState.velocity_z_km_s,
                    func.row_number()
                    .over(partition_by=OrbitState.object_id, order_by=desc(OrbitState.epoch))
                    .label("rn"),
                )
                .where(OrbitState.position_x_km.is_not(None))
                .where(OrbitState.position_y_km.is_not(None))
                .where(OrbitState.position_z_km.is_not(None))
                .subquery()
            )

            rows = (
                await db.execute(
                    select(latest_state_subq).where(latest_state_subq.c.rn == 1)
                )
            ).all()

            if len(rows) < 2:
                print("[Conjunction Scan] Not enough tracked objects to screen.")
                return {"status": "success", "pairs_evaluated": 0, "inserted": 0}

            ids = np.array([int(r.object_id) for r in rows], dtype=np.int64)
            positions = np.array(
                [[r.position_x_km, r.position_y_km, r.position_z_km] for r in rows], dtype=np.float64
            )
            velocities = np.array(
                [[r.velocity_x_km_s or 0.0, r.velocity_y_km_s or 0.0, r.velocity_z_km_s or 0.0] for r in rows],
                dtype=np.float64,
            )
            epoch_map = {int(r.object_id): r.epoch for r in rows}
            vel_map = {int(ids[i]): velocities[i] for i in range(len(ids))}

            candidate_pairs = screen_catalog(positions=positions, ids=ids, threshold_km=10.0)
            inserted = 0
            now = datetime.now(timezone.utc)

            for primary_id, secondary_id, miss_distance_km in candidate_pairs:
                primary_id = int(primary_id)
                secondary_id = int(secondary_id)

                tca = max(epoch_map.get(primary_id, now), epoch_map.get(secondary_id, now))
                relative_velocity = float(np.linalg.norm(vel_map[primary_id] - vel_map[secondary_id]))
                collision_probability = _estimate_probability(float(miss_distance_km))
                risk_level = _risk_level_from_distance(float(miss_distance_km))

                # De-duplicate near-identical events seen in recent scans.
                duplicate = (
                    await db.execute(
                        select(ConjunctionEvent.conjunction_id)
                        .where(ConjunctionEvent.primary_object_id == primary_id)
                        .where(ConjunctionEvent.secondary_object_id == secondary_id)
                        .where(ConjunctionEvent.time_of_closest_approach >= tca - timedelta(hours=1))
                        .where(ConjunctionEvent.time_of_closest_approach <= tca + timedelta(hours=1))
                    )
                ).scalar_one_or_none()
                if duplicate:
                    continue

                event = ConjunctionEvent(
                    primary_object_id=primary_id,
                    secondary_object_id=secondary_id,
                    time_of_closest_approach=tca,
                    miss_distance_km=float(miss_distance_km),
                    collision_probability=collision_probability,
                    relative_velocity_km_s=relative_velocity,
                    combined_hard_body_radius_m=20.0,
                    risk_level=risk_level,
                    status="OPEN" if risk_level in {"HIGH", "CRITICAL", "RED"} else "PENDING",
                    recommended_action=(
                        "Assess maneuver options."
                        if risk_level in {"HIGH", "CRITICAL", "RED"}
                        else "Continue monitoring."
                    ),
                )
                db.add(event)
                inserted += 1

                if risk_level in {"HIGH", "CRITICAL", "RED"}:
                    await manager.broadcast(
                        WSEvent.CONJUNCTION_ALERT,
                        {
                            "primary_object_id": primary_id,
                            "secondary_object_id": secondary_id,
                            "time_of_closest_approach": tca.isoformat(),
                            "miss_distance_km": float(miss_distance_km),
                            "collision_probability": collision_probability,
                            "risk_level": risk_level,
                        },
                    )

            await db.commit()
            print(
                f"[Conjunction Scan] Screening complete. Candidates: {len(candidate_pairs)} | Inserted: {inserted}"
            )
            return {"status": "success", "pairs_evaluated": len(candidate_pairs), "inserted": inserted}
                
    asyncio.run(_run())
    return {"status": "success"}
