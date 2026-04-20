"""
Conjunction screening using KD-Tree for O(N log N) spatial search.
"""

import numpy as np
from scipy.spatial import cKDTree

def screen_catalog(positions: np.ndarray, ids: np.ndarray, threshold_km: float = 5.0):
    """
    Finds all pairs of objects within threshold_km of each other.
    positions: (N, 3) array of [x, y, z] coordinates.
    ids: (N,) array of object identifiers matching the rows of positions.
    threshold_km: search radius.
    
    Returns a list of tuples: (id1, id2, distance_km)
    """
    if len(positions) == 0:
        return []
        
    tree = cKDTree(positions)
    # query_pairs returns a set of index pairs (i, j) where i < j
    pairs_idx = tree.query_pairs(r=threshold_km)
    
    results = []
    for i, j in pairs_idx:
        dist = np.linalg.norm(positions[i] - positions[j])
        results.append((ids[i], ids[j], dist))
        
    # Sort by distance
    results.sort(key=lambda x: x[2])
    return results

def screen_target_against_catalog(target_pos: np.ndarray, catalog_positions: np.ndarray, catalog_ids: np.ndarray, threshold_km: float = 5.0):
    """
    Finds objects from catalog within threshold of a single target object.
    target_pos: (3,) array
    """
    if len(catalog_positions) == 0:
        return []
        
    tree = cKDTree(catalog_positions)
    indices = tree.query_ball_point(target_pos, r=threshold_km)
    
    results = []
    for idx in indices:
        dist = np.linalg.norm(target_pos - catalog_positions[idx])
        results.append((catalog_ids[idx], dist))
        
    results.sort(key=lambda x: x[1])
    return results
