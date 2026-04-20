"""
API routes for High-Fidelity Physics Engine (Phase 1).
"""

from fastapi import APIRouter, Depends, HTTPException
import numpy as np
from astropy.time import Time
from astropy import units as u

from app.schemas.physics import (
    HiFiPropagateRequest, HiFiPropagateResponse, ProbabilityRequest, 
    CAMRequest, OrbitDeterminationRequest, CollisionScreenRequest
)

from app.physics.propagator import NumericalPropagator
from app.physics.collision.probability import compute_collision_probability
from app.physics.collision.cam_optimizer import CAMOptimizer
from app.physics.orbit_determination import OrbitDetermination
# In real application, we'd inject DB session to store/read data
# from app.core.database import get_db

router = APIRouter(tags=["High-Fidelity Physics"])

@router.post("/propagate/hifi", response_model=HiFiPropagateResponse)
async def propagate_hifi(req: HiFiPropagateRequest):
    """Run numerical propagation with custom force models."""
    prop = NumericalPropagator(force_model_config=req.force_model.model_dump())
    
    t0 = Time(req.t0)
    t1 = Time(req.t1)
    
    try:
        res = prop.propagate(
            r0=np.array(req.r_km),
            v0=np.array(req.v_km_s),
            t0=t0,
            t1=t1,
            method=req.method,
            max_step=req.max_step_s
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return HiFiPropagateResponse(
        r_km=res['r'].tolist(),
        v_km_s=res['v'].tolist(),
        epoch=req.t1
    )

@router.post("/collision/probability")
async def collision_probability(req: ProbabilityRequest):
    """Compute short-encounter collision probability."""
    pc = compute_collision_probability(
        r_target=np.array(req.target_r),
        v_target=np.array(req.target_v),
        cov_target=np.array(req.target_cov),
        hbr_target=req.target_hbr,
        r_chaser=np.array(req.chaser_r),
        v_chaser=np.array(req.chaser_v),
        cov_chaser=np.array(req.chaser_cov),
        hbr_chaser=req.chaser_hbr
    )
    return {"probability_of_collision": pc}

@router.post("/collision/cam")
async def optimize_cam(req: CAMRequest):
    """Generate Collision Avoidance Maneuver recommendation."""
    optimizer = CAMOptimizer(
        target_state0=np.array(req.target_state),
        chaser_state_tca=np.array(req.chaser_state_tca),
        t0=Time(req.t0),
        tca=Time(req.tca),
        force_config=req.force_model.model_dump()
    )
    
    res = optimizer.optimize(target_miss_km=req.target_miss_km)
    
    if not res['success']:
        raise HTTPException(status_code=400, detail=res['message'])
        
    return {
        "recommended_dv_rsw_km_s": res['dV_rsw_km_s'].tolist(),
        "dv_magnitude_m_s": res['dV_mag_m_s']
    }

@router.post("/orbit-determination")
async def determine_orbit(req: OrbitDeterminationRequest):
    """Batch Least-Squares OD from tracking data."""
    obs_list = []
    for obs in req.observations:
        obs_list.append({
            'time': Time(obs.time),
            'range_km': obs.range_km,
            'az_rad': obs.az_rad,
            'el_rad': obs.el_rad
        })
        
    od = OrbitDetermination(
        observations=obs_list,
        station_pos_itrs=np.array(req.station_pos_itrs),
        force_config=req.force_model.model_dump()
    )
    
    res = od.solve(initial_guess=np.array(req.initial_guess_state))
    
    if not res['success']:
        raise HTTPException(status_code=400, detail=res['message'])
        
    return {
        "estimated_state": res['state_estimate'].tolist(),
        "cost": res['cost']
    }

@router.post("/collision/screen")
async def screen_catalog(req: CollisionScreenRequest):
    """
    (Placeholder) Screen catalog for conjunctions using KD-Tree.
    In a real call, we'd query all object states from DB.
    """
    return {"status": "Screening queued", "threshold_km": req.threshold_km}
