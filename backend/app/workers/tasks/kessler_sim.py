"""
Kessler Syndrome Simulator — Celery task that orchestrates:
1. Debris field generation via NASA Breakup Model
2. Fragment propagation via HiFi propagator
3. Cascading conjunction screening via KD-tree
4. AI Agent investigation of top threats
5. WebSocket push at each stage
"""

import numpy as np
from celery import shared_task
from astropy.time import Time
from astropy import units as u

from app.physics.breakup_model import nasa_breakup_model
from app.physics.propagator import NumericalPropagator
from app.physics.collision.screening import screen_catalog

@shared_task(name="app.workers.tasks.kessler_sim.run_kessler_simulation", bind=True)
def run_kessler_simulation(
    self,
    target_norad_id: int,
    impactor_norad_id: int,
    target_mass_kg: float = 500.0,
    impactor_mass_kg: float = 100.0,
    collision_r_km: list = None,
    collision_v_km_s: list = None,
    relative_v_km_s: float = 10.0,
):
    """
    Full Kessler Syndrome simulation pipeline.
    """
    sim_id = self.request.id or "local-sim"
    
    # Default collision location (ISS-like orbit)
    if collision_r_km is None:
        collision_r_km = [6778.0, 0.0, 0.0]
    if collision_v_km_s is None:
        collision_v_km_s = [0.0, 7.66, 0.0]
    
    r_collision = np.array(collision_r_km)
    v_collision = np.array(collision_v_km_s)
    
    # ── Stage 1: Generate Debris Field ──────────────────────
    self.update_state(state='PROGRESS', meta={'stage': 'GENERATING_DEBRIS', 'progress': 10})
    
    fragments = nasa_breakup_model(
        mass_target_kg=target_mass_kg,
        mass_impactor_kg=impactor_mass_kg,
        relative_velocity_km_s=relative_v_km_s,
        collision_position_km=r_collision,
        collision_velocity_km_s=v_collision,
    )
    
    print(f"[Kessler] Generated {len(fragments)} debris fragments.")
    
    # ── Stage 2: Propagate Fragments Forward ────────────────
    self.update_state(state='PROGRESS', meta={'stage': 'PROPAGATING_FRAGMENTS', 'progress': 30})
    
    propagator = NumericalPropagator(force_model_config={"j2": True})
    t0 = Time.now()
    t1 = t0 + 90 * u.min  # Propagate 90 minutes (~ 1 orbit)
    
    fragment_positions = []
    for frag in fragments[:500]:  # Limit for performance
        frag_v = v_collision + frag.delta_v
        try:
            result = propagator.propagate(r_collision, frag_v, t0, t1, max_step=120.0)
            fragment_positions.append({
                "id": frag.fragment_id,
                "r": result["r"].tolist(),
                "size": "large" if frag.characteristic_length_m > 0.1 else "small",
            })
        except Exception:
            pass  # Skip failed propagations
    
    print(f"[Kessler] Propagated {len(fragment_positions)} fragments.")
    
    # ── Stage 3: Conjunction Screening ──────────────────────
    self.update_state(state='PROGRESS', meta={'stage': 'SCREENING_CONJUNCTIONS', 'progress': 60})
    
    if len(fragment_positions) > 1:
        positions = np.array([fp["r"] for fp in fragment_positions])
        ids = np.array([fp["id"] for fp in fragment_positions])
        
        # Screen fragments against each other + any catalog objects
        conjunctions = screen_catalog(positions, ids, threshold_km=10.0)
        print(f"[Kessler] Found {len(conjunctions)} potential cascading conjunctions.")
    else:
        conjunctions = []
    
    # ── Stage 4: Results ────────────────────────────────────
    self.update_state(state='PROGRESS', meta={'stage': 'COMPLETE', 'progress': 100})
    
    return {
        "sim_id": sim_id,
        "total_fragments": len(fragments),
        "propagated_fragments": len(fragment_positions),
        "cascading_conjunctions": len(conjunctions),
        "top_conjunctions": [
            {"obj1": c[0], "obj2": c[1], "dist_km": round(c[2], 3)}
            for c in conjunctions[:20]
        ],
    }
