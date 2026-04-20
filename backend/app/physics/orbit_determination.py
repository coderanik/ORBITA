"""
Batch Least-Squares Orbit Determination from ground observations.
"""

import numpy as np
from scipy.optimize import least_squares
from astropy.time import Time
from .propagator import NumericalPropagator

class OrbitDetermination:
    def __init__(self, observations: list[dict], station_pos_itrs: np.ndarray, force_config: dict):
        """
        observations: [{'time': Time, 'range_km': float, 'az_rad': float, 'el_rad': float}, ...]
        station_pos_itrs: ECEF coordinates of the ground station
        """
        self.observations = sorted(observations, key=lambda x: x['time'])
        self.station_pos = station_pos_itrs
        self.propagator = NumericalPropagator(force_config)
        self.t_ref = self.observations[0]['time']
        
    def _compute_residuals(self, state_guess: np.ndarray) -> np.ndarray:
        """
        Propagates state_guess to each observation time and computes observation residuals.
        """
        r0 = state_guess[0:3]
        v0 = state_guess[3:6]
        
        residuals = []
        
        # For a full implementation, we'd transform the GCRS satellite position 
        # to ITRS/ECEF or ENU relative to the station to compute predicted Range, Az, El.
        # This is a simplified placeholder structure.
        
        for obs in self.observations:
            try:
                res = self.propagator.propagate(r0, v0, self.t_ref, obs['time'])
                r_gcrs = res['r']
                
                # Placeholder: True implementation transforms r_gcrs to ENU
                # to get computed range, az, el.
                # Assuming computed_range = norm(r_gcrs - station_pos) (Very rough, ignoring frame mismatch!)
                computed_range = np.linalg.norm(r_gcrs - self.station_pos)
                
                # Residuals (Range only for this simple mockup)
                residuals.append(computed_range - obs['range_km'])
                
            except Exception:
                residuals.append(1e6) # Penalty
                
        return np.array(residuals)
        
    def solve(self, initial_guess: np.ndarray):
        """
        Runs the least squares optimization.
        initial_guess: (6,) array [r, v] at t_ref
        """
        res = least_squares(
            fun=self._compute_residuals,
            x0=initial_guess,
            method='lm',
            xtol=1e-8
        )
        
        return {
            'success': res.success,
            'state_estimate': res.x,
            'epoch': self.t_ref,
            'cost': res.cost,
            'message': res.message
        }
