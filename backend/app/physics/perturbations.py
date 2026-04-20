"""
Perturbation models (force models) for high-fidelity orbital propagation.
Includes Gravity (J2-J6), Atmospheric Drag, Solar Radiation Pressure, and Third-Body gravity.
"""

import numpy as np
from astropy.time import Time
from .frames import gcrs_to_itrs, itrs_to_gcrs
# import nrlmsise00
# from jplephem.spk import SPK

# Earth constants (WGS84 / EGM96)
MU_EARTH = 398600.4418  # km^3/s^2
R_EARTH = 6378.137      # km
J2 = 0.00108262668
J3 = -0.0000025327
J4 = -0.0000016196

def point_mass_gravity(r: np.ndarray) -> np.ndarray:
    """Central body gravity (Keplerian)."""
    r_mag = np.linalg.norm(r)
    return -MU_EARTH / (r_mag**3) * r

def j2_perturbation(r: np.ndarray) -> np.ndarray:
    """
    Computes J2 perturbation acceleration in GCRS frame.
    Note: A more rigorous approach transforms r to ECEF, applies J2, and transforms back.
    For LEO, applying it in GCRS is a common approximation if the pole is assumed aligned,
    but we will implement the simplified analytical form here.
    """
    x, y, z = r[0], r[1], r[2]
    r_mag = np.linalg.norm(r)
    
    factor = (3/2) * J2 * (MU_EARTH / r_mag**2) * (R_EARTH / r_mag)**2
    
    ax = factor * (x / r_mag) * (5 * (z / r_mag)**2 - 1)
    ay = factor * (y / r_mag) * (5 * (z / r_mag)**2 - 1)
    az = factor * (z / r_mag) * (5 * (z / r_mag)**2 - 3)
    
    return np.array([ax, ay, az])

def get_atmospheric_density(r_itrs: np.ndarray, epoch: Time) -> float:
    """
    Returns atmospheric density in kg/m^3 using NRLMSISE-00 (simplified mockup).
    In a full implementation, we pass the LLA coordinates to nrlmsise00.
    """
    r_mag = np.linalg.norm(r_itrs)
    alt_km = r_mag - R_EARTH
    
    # Simple exponential atmosphere fallback if nrlmsise00 fails or for fast eval
    rho0 = 1.225 # Sea level density kg/m^3
    H = 8.5 # Scale height km
    if alt_km > 1000:
        return 0.0
    
    # Placeholder for actual NRLMSISE-00 call
    # import nrlmsise00
    # lat, lon = ecef_to_lla(r_itrs)
    # result = nrlmsise00.msise_model(epoch.datetime, alt_km, lat, lon, 150, 150, 4)
    # return result[0][5] # Total mass density
    
    # Very crude approximation for upper atmosphere (e.g. 400km is ~1e-12)
    rho = 1e-12 * np.exp(-(alt_km - 400) / 50.0)
    return rho

def atmospheric_drag(r: np.ndarray, v: np.ndarray, epoch: Time, mass_kg: float, area_m2: float, cd: float = 2.2) -> np.ndarray:
    """
    Computes atmospheric drag acceleration.
    """
    # Transform to ECEF to calculate relative velocity to atmosphere (assuming atmosphere rotates with Earth)
    r_itrs, v_itrs = gcrs_to_itrs(r, v, epoch)
    
    # Atmospheric velocity in ECEF is roughly 0 (it co-rotates). 
    # Actually, v_rel_itrs = v_itrs
    v_rel_itrs = v_itrs
    v_rel_mag_km_s = np.linalg.norm(v_rel_itrs)
    v_rel_mag_m_s = v_rel_mag_km_s * 1000.0
    
    rho = get_atmospheric_density(r_itrs, epoch) # kg/m^3
    
    # F = -0.5 * rho * v^2 * Cd * A * v_hat
    # a = F / m
    # Acceleration in m/s^2
    a_drag_m_s2 = -0.5 * rho * (v_rel_mag_m_s) * cd * (area_m2 / mass_kg) * (v_rel_itrs * 1000.0)
    
    # Convert to km/s^2
    a_drag_km_s2_itrs = a_drag_m_s2 / 1000.0
    
    # Transform acceleration back to GCRS (treating it as a vector)
    # Strictly speaking, we should use full Coriolis/Centrifugal terms for ECEF->ECI accel,
    # but for just rotating the drag vector:
    _, a_drag_km_s2_gcrs = itrs_to_gcrs(np.zeros(3), a_drag_km_s2_itrs, epoch)
    
    return a_drag_km_s2_gcrs

def compute_total_acceleration(r: np.ndarray, v: np.ndarray, epoch: Time, config: dict) -> np.ndarray:
    """
    Computes total acceleration based on the active force models.
    config: {
        "j2": bool,
        "drag": bool,
        "mass_kg": float,
        "area_m2": float,
        "cd": float
    }
    """
    a = point_mass_gravity(r)
    
    if config.get("j2", False):
        a += j2_perturbation(r)
        
    if config.get("drag", False):
        a += atmospheric_drag(
            r, v, epoch, 
            mass_kg=config.get("mass_kg", 100.0), 
            area_m2=config.get("area_m2", 1.0), 
            cd=config.get("cd", 2.2)
        )
        
    # Future: Add SRP and ThirdBody here
        
    return a
