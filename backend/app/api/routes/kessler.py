"""
API routes for the Kessler Syndrome Simulator.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from celery.result import AsyncResult
from app.workers.tasks.kessler_sim import run_kessler_simulation

router = APIRouter(prefix="/kessler", tags=["Kessler Syndrome Simulator"])

class KesslerSimulateRequest(BaseModel):
    target_norad_id: int = 25544   # ISS by default
    impactor_norad_id: int = 99999
    target_mass_kg: float = 420000.0
    impactor_mass_kg: float = 800.0
    relative_velocity_km_s: float = 10.0
    collision_r_km: list[float] | None = None
    collision_v_km_s: list[float] | None = None

@router.post("/simulate")
async def start_simulation(req: KesslerSimulateRequest):
    """
    Starts a Kessler Syndrome simulation. Returns a task ID to poll for results.
    """
    task = run_kessler_simulation.delay(
        target_norad_id=req.target_norad_id,
        impactor_norad_id=req.impactor_norad_id,
        target_mass_kg=req.target_mass_kg,
        impactor_mass_kg=req.impactor_mass_kg,
        collision_r_km=req.collision_r_km,
        collision_v_km_s=req.collision_v_km_s,
        relative_v_km_s=req.relative_velocity_km_s,
    )
    return {"task_id": task.id, "status": "QUEUED"}

@router.get("/simulations/{task_id}")
async def get_simulation_status(task_id: str):
    """
    Polls the status of a running Kessler simulation.
    """
    result = AsyncResult(task_id)
    
    if result.state == 'PENDING':
        return {"task_id": task_id, "status": "PENDING"}
    elif result.state == 'PROGRESS':
        return {"task_id": task_id, "status": "PROGRESS", "meta": result.info}
    elif result.state == 'SUCCESS':
        return {"task_id": task_id, "status": "SUCCESS", "result": result.result}
    elif result.state == 'FAILURE':
        return {"task_id": task_id, "status": "FAILURE", "error": str(result.result)}
    else:
        return {"task_id": task_id, "status": result.state}
