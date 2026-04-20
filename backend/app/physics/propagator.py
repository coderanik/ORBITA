"""
Numerical orbit propagator using SciPy integrators (Dormand-Prince 8(5,3) or RK45).
"""

import numpy as np
from scipy.integrate import solve_ivp
from astropy.time import Time
from astropy import units as u
from .perturbations import compute_total_acceleration

class NumericalPropagator:
    def __init__(self, force_model_config: dict = None):
        """
        Initialize propagator with a force model configuration.
        Example: {"j2": True, "drag": True, "mass_kg": 200.0, "area_m2": 1.5}
        """
        self.config = force_model_config or {"j2": True}
        
    def _derivatives(self, t: float, state: np.ndarray, epoch_start: Time) -> np.ndarray:
        """
        Computes the state derivative [vx, vy, vz, ax, ay, az].
        t: seconds since epoch_start
        """
        r = state[0:3]
        v = state[3:6]
        
        current_epoch = epoch_start + (t * u.s)
        
        a = compute_total_acceleration(r, v, current_epoch, self.config)
        
        return np.concatenate((v, a))
        
    def propagate(self, r0: np.ndarray, v0: np.ndarray, t0: Time, t1: Time, method: str = 'DOP853', max_step: float = 60.0):
        """
        Propagates the state from t0 to t1.
        Returns the final state vector (6,) and an array of time/state vectors if needed.
        """
        dt_seconds = (t1 - t0).to(u.s).value
        
        state0 = np.concatenate((r0, v0))
        
        # We can evaluate at intermediate points if needed, or just the end
        res = solve_ivp(
            fun=self._derivatives,
            t_span=(0, dt_seconds),
            y0=state0,
            method=method,
            args=(t0,),
            rtol=1e-9,
            atol=1e-9,
            max_step=max_step
        )
        
        if not res.success:
            raise RuntimeError(f"Propagation failed: {res.message}")
            
        final_state = res.y[:, -1]
        
        return {
            "r": final_state[0:3],
            "v": final_state[3:6],
            "epoch": t1,
            "trajectory": {
                "times_sec": res.t,
                "states": res.y
            }
        }
