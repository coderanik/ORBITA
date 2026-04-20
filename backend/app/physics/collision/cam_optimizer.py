"""
Collision Avoidance Maneuver (CAM) optimization.
"""

import numpy as np
from scipy.optimize import minimize
from astropy.time import Time
from astropy import units as u
from ..propagator import NumericalPropagator

def rsw_to_eci(r: np.ndarray, v: np.ndarray, dV_rsw: np.ndarray) -> np.ndarray:
    """
    Converts a Delta-V in RSW (Radial, Transverse/Along-track, Cross-track) frame
    to ECI/GCRS frame.
    """
    R = r / np.linalg.norm(r)
    W = np.cross(r, v)
    W = W / np.linalg.norm(W)
    S = np.cross(W, R)
    
    T_matrix = np.column_stack((R, S, W))
    return T_matrix @ dV_rsw

class CAMOptimizer:
    def __init__(self, target_state0: np.ndarray, chaser_state_tca: np.ndarray, t0: Time, tca: Time, force_config: dict):
        """
        target_state0: State of the satellite we control at maneuver time t0 (6,)
        chaser_state_tca: State of the debris/other sat at Time of Closest Approach (6,)
        t0: Maneuver time
        tca: Time of Closest Approach
        """
        self.r0 = target_state0[0:3]
        self.v0 = target_state0[3:6]
        self.t0 = t0
        self.tca = tca
        self.chaser_r_tca = chaser_state_tca[0:3]
        self.dt_sec = (tca - t0).to(u.s).value
        
        self.propagator = NumericalPropagator(force_config)
        
    def _objective(self, dV_rsw: np.ndarray) -> float:
        """Minimize the magnitude of Delta-V."""
        return np.linalg.norm(dV_rsw)
        
    def _constraint_miss_distance(self, dV_rsw: np.ndarray, target_miss_km: float) -> float:
        """
        Constraint function: actual miss distance >= target_miss_km
        Returns (actual - target), which should be >= 0
        """
        # 1. Convert dV to ECI
        dV_eci = rsw_to_eci(self.r0, self.v0, dV_rsw)
        
        # 2. Add to initial velocity
        v0_new = self.v0 + dV_eci
        
        # 3. Propagate to TCA
        try:
            res = self.propagator.propagate(self.r0, v0_new, self.t0, self.tca)
            r_tca_new = res['r']
            
            # 4. Calculate miss distance
            miss_dist = np.linalg.norm(r_tca_new - self.chaser_r_tca)
            return miss_dist - target_miss_km
        except Exception:
            return -1.0 # Failed propagation, penalize
            
    def optimize(self, target_miss_km: float = 10.0):
        """
        Finds the minimum Delta-V in RSW to achieve the target miss distance at TCA.
        """
        # Initial guess: 0.1 m/s (0.0001 km/s) in along-track direction
        dv0 = np.array([0.0, 0.0001, 0.0])
        
        # Bounds: max 50 m/s maneuver for typical LEO collision avoidance
        bounds = [(-0.05, 0.05), (-0.05, 0.05), (-0.05, 0.05)]
        
        cons = ({'type': 'ineq', 'fun': self._constraint_miss_distance, 'args': (target_miss_km,)})
        
        res = minimize(
            self._objective, 
            dv0, 
            method='SLSQP', 
            bounds=bounds,
            constraints=cons,
            options={'disp': False, 'ftol': 1e-6}
        )
        
        return {
            'success': res.success,
            'dV_rsw_km_s': res.x,
            'dV_mag_m_s': np.linalg.norm(res.x) * 1000.0,
            'message': res.message
        }
