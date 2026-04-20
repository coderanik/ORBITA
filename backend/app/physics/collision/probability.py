"""
Collision Probability (Pc) calculation based on the Alfano/Foster models
(2D short-encounter probability).
"""

import numpy as np
import math
from scipy.integrate import dblquad

def compute_collision_probability(
    r_target: np.ndarray, v_target: np.ndarray, cov_target: np.ndarray, hbr_target: float,
    r_chaser: np.ndarray, v_chaser: np.ndarray, cov_chaser: np.ndarray, hbr_chaser: float
) -> float:
    """
    Compute Probability of Collision (Pc) using 2D analytical integration (short-encounter assumption).
    r, v: (3,) arrays in km, km/s
    cov: (6,6) arrays
    hbr: Hard Body Radius in km
    """
    # 1. Relative state
    r_rel = r_chaser - r_target
    v_rel = v_chaser - v_target
    
    # 2. Combined Covariance (position only, 3x3)
    cov_combined = cov_target[0:3, 0:3] + cov_chaser[0:3, 0:3]
    
    # Combined Hard Body Radius
    HBR = hbr_target + hbr_chaser
    
    # 3. Define the encounter plane (B-plane)
    # h_hat is the relative angular momentum vector
    h_vec = np.cross(r_rel, v_rel)
    h_hat = h_vec / np.linalg.norm(h_vec)
    
    # v_hat is the relative velocity direction
    v_hat = v_rel / np.linalg.norm(v_rel)
    
    # The third basis vector completes the right-handed system (typically pointing towards target)
    u_hat = np.cross(v_hat, h_hat)
    
    # Rotation matrix from reference frame to encounter plane
    # The encounter plane is spanned by u_hat and h_hat
    R = np.vstack([u_hat, h_hat, v_hat])
    
    # 4. Project covariance into encounter plane
    cov_plane_3d = R @ cov_combined @ R.T
    # We only care about the 2D projection (u, h components)
    C_p = cov_plane_3d[0:2, 0:2]
    
    # 5. Project relative position into encounter plane
    r_plane_3d = R @ r_rel
    xm, ym = r_plane_3d[0], r_plane_3d[1]
    
    # 6. Calculate Probability
    # 2D Gaussian integral over a circle of radius HBR centered at (-xm, -ym)
    # P_c = (1 / (2 * pi * sqrt(|C_p|))) * \int \int_{x^2 + y^2 <= HBR^2} exp(-0.5 * [(x-xm) (y-ym)] * C_p^-1 * [x-xm; y-ym]) dx dy
    
    det_C = np.linalg.det(C_p)
    inv_C = np.linalg.inv(C_p)
    
    coef = 1.0 / (2.0 * math.pi * math.sqrt(det_C))
    
    def integrand(y, x):
        dx = x - xm
        dy = y - ym
        exponent = -0.5 * (dx * (inv_C[0,0]*dx + inv_C[0,1]*dy) + dy * (inv_C[1,0]*dx + inv_C[1,1]*dy))
        return math.exp(exponent)
        
    def y_bounds(x):
        # Circle of radius HBR: x^2 + y^2 = HBR^2
        # y = +/- sqrt(HBR^2 - x^2)
        val = math.sqrt(HBR**2 - x**2)
        return -val, val
        
    # Perform integration
    # Since the circle is small relative to covariance for typical encounters, 
    # a simpler approximation is often used: Pc ~ coef * exp(...) * (pi * HBR^2)
    # We will use the approximation if the integration is too slow, but let's implement the integral
    try:
        pc, error = dblquad(integrand, -HBR, HBR, y_bounds, y_bounds)
    except Exception:
        # Fallback to simple approximation (Foster's method limit)
        val = integrand(0, 0) # Evaluate at center of circle
        area = math.pi * HBR**2
        pc = coef * val * area
        
    return float(pc)
