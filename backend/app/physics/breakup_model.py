"""
NASA Standard Breakup Model — simplified implementation.
Generates debris fragments from a simulated satellite collision.
"""

import numpy as np
from dataclasses import dataclass

@dataclass
class DebrisFragment:
    fragment_id: str
    characteristic_length_m: float  # Lc
    area_to_mass_ratio: float       # A/M in m^2/kg
    delta_v: np.ndarray             # km/s, velocity kick in 3D

def nasa_breakup_model(
    mass_target_kg: float,
    mass_impactor_kg: float,
    relative_velocity_km_s: float,
    collision_position_km: np.ndarray,
    collision_velocity_km_s: np.ndarray,
    seed: int = 42,
) -> list[DebrisFragment]:
    """
    Simplified NASA Standard Breakup Model.
    
    The number of fragments larger than a characteristic length Lc is:
        N(Lc) = 0.1 * M_total^0.75 * Lc^(-1.71)   (for catastrophic collisions)
    
    A collision is catastrophic if the specific energy ratio exceeds 40 J/g.
    """
    rng = np.random.default_rng(seed)
    
    m_total = mass_target_kg + mass_impactor_kg
    
    # Check if catastrophic
    kinetic_energy_j = 0.5 * mass_impactor_kg * (relative_velocity_km_s * 1000)**2
    specific_energy_j_per_g = kinetic_energy_j / (mass_target_kg * 1000)  # J / g
    is_catastrophic = specific_energy_j_per_g > 40.0
    
    # Generate fragment count for Lc > 0.01 m (1 cm)
    lc_min = 0.01  # meters
    if is_catastrophic:
        n_fragments = int(0.1 * (m_total ** 0.75) * (lc_min ** -1.71))
    else:
        n_fragments = int(0.1 * (mass_impactor_kg ** 0.75) * (lc_min ** -1.71))
    
    # Cap for performance
    n_fragments = min(n_fragments, 5000)
    n_fragments = max(n_fragments, 50)
    
    fragments = []
    
    for i in range(n_fragments):
        # Power-law distribution for characteristic length
        # P(Lc) ~ Lc^(-1.71), so sample from inverse CDF
        u = rng.uniform(0, 1)
        lc = lc_min * (1 - u) ** (-1.0 / 1.71)
        lc = min(lc, 5.0)  # Cap at 5 meters
        
        # Area-to-mass ratio: log-normal distribution
        # Mean depends on fragment type (roughly 0.01 to 1.0 m^2/kg)
        log_am_mean = -0.5 if lc > 0.1 else 0.0
        am_ratio = rng.lognormal(log_am_mean, 0.5)
        am_ratio = np.clip(am_ratio, 0.001, 10.0)
        
        # Delta-V: isotropic distribution, magnitude depends on fragment size
        # Smaller fragments get larger delta-v kicks
        dv_magnitude = relative_velocity_km_s * rng.uniform(0.01, 0.5) * (0.01 / max(lc, 0.01)) ** 0.3
        dv_magnitude = min(dv_magnitude, relative_velocity_km_s * 0.8)
        
        # Random direction on unit sphere
        phi = rng.uniform(0, 2 * np.pi)
        cos_theta = rng.uniform(-1, 1)
        sin_theta = np.sqrt(1 - cos_theta**2)
        
        dv = dv_magnitude * np.array([
            sin_theta * np.cos(phi),
            sin_theta * np.sin(phi),
            cos_theta,
        ])
        
        size_class = 'large' if lc > 0.1 else ('medium' if lc > 0.01 else 'small')
        
        fragments.append(DebrisFragment(
            fragment_id=f"FRAG-{i:04d}",
            characteristic_length_m=float(lc),
            area_to_mass_ratio=float(am_ratio),
            delta_v=dv,
        ))
    
    return fragments
