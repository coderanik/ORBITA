"""
Coordinate frame transformations for high-fidelity orbital mechanics.
"""

import numpy as np
from astropy.time import Time
from astropy.coordinates import ITRS, GCRS, TEME, CartesianRepresentation, CartesianDifferential
from astropy import units as u

def teme_to_gcrs(r_teme: np.ndarray, v_teme: np.ndarray, epoch: Time) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert state vector from TEME (used by SGP4/TLEs) to GCRS (J2000-aligned, Earth-centered).
    """
    teme_coords = TEME(
        x=r_teme[0]*u.km, y=r_teme[1]*u.km, z=r_teme[2]*u.km,
        v_x=v_teme[0]*u.km/u.s, v_y=v_teme[1]*u.km/u.s, v_z=v_teme[2]*u.km/u.s,
        representation_type=CartesianRepresentation,
        differential_type=CartesianDifferential,
        obstime=epoch
    )
    gcrs_coords = teme_coords.transform_to(GCRS(obstime=epoch))
    
    r_gcrs = np.array([gcrs_coords.x.value, gcrs_coords.y.value, gcrs_coords.z.value])
    v_gcrs = np.array([gcrs_coords.v_x.value, gcrs_coords.v_y.value, gcrs_coords.v_z.value])
    
    return r_gcrs, v_gcrs

def gcrs_to_teme(r_gcrs: np.ndarray, v_gcrs: np.ndarray, epoch: Time) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert state vector from GCRS to TEME.
    """
    gcrs_coords = GCRS(
        x=r_gcrs[0]*u.km, y=r_gcrs[1]*u.km, z=r_gcrs[2]*u.km,
        v_x=v_gcrs[0]*u.km/u.s, v_y=v_gcrs[1]*u.km/u.s, v_z=v_gcrs[2]*u.km/u.s,
        representation_type=CartesianRepresentation,
        differential_type=CartesianDifferential,
        obstime=epoch
    )
    teme_coords = gcrs_coords.transform_to(TEME(obstime=epoch))
    
    r_teme = np.array([teme_coords.x.value, teme_coords.y.value, teme_coords.z.value])
    v_teme = np.array([teme_coords.v_x.value, teme_coords.v_y.value, teme_coords.v_z.value])
    
    return r_teme, v_teme

def gcrs_to_itrs(r_gcrs: np.ndarray, v_gcrs: np.ndarray, epoch: Time) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert state vector from GCRS (inertial) to ITRS (Earth-fixed, ECEF).
    """
    gcrs_coords = GCRS(
        x=r_gcrs[0]*u.km, y=r_gcrs[1]*u.km, z=r_gcrs[2]*u.km,
        v_x=v_gcrs[0]*u.km/u.s, v_y=v_gcrs[1]*u.km/u.s, v_z=v_gcrs[2]*u.km/u.s,
        representation_type=CartesianRepresentation,
        differential_type=CartesianDifferential,
        obstime=epoch
    )
    itrs_coords = gcrs_coords.transform_to(ITRS(obstime=epoch))
    
    r_itrs = np.array([itrs_coords.x.value, itrs_coords.y.value, itrs_coords.z.value])
    v_itrs = np.array([itrs_coords.v_x.value, itrs_coords.v_y.value, itrs_coords.v_z.value])
    
    return r_itrs, v_itrs

def itrs_to_gcrs(r_itrs: np.ndarray, v_itrs: np.ndarray, epoch: Time) -> tuple[np.ndarray, np.ndarray]:
    """
    Convert state vector from ITRS (Earth-fixed, ECEF) to GCRS (inertial).
    """
    itrs_coords = ITRS(
        x=r_itrs[0]*u.km, y=r_itrs[1]*u.km, z=r_itrs[2]*u.km,
        v_x=v_itrs[0]*u.km/u.s, v_y=v_itrs[1]*u.km/u.s, v_z=v_itrs[2]*u.km/u.s,
        representation_type=CartesianRepresentation,
        differential_type=CartesianDifferential,
        obstime=epoch
    )
    gcrs_coords = itrs_coords.transform_to(GCRS(obstime=epoch))
    
    r_gcrs = np.array([gcrs_coords.x.value, gcrs_coords.y.value, gcrs_coords.z.value])
    v_gcrs = np.array([gcrs_coords.v_x.value, gcrs_coords.v_y.value, gcrs_coords.v_z.value])
    
    return r_gcrs, v_gcrs
