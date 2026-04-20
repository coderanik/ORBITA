"""
Covariance propagation using State Transition Matrix (STM).
"""

import numpy as np

def propagate_covariance(cov0: np.ndarray, stm: np.ndarray) -> np.ndarray:
    """
    Propagates a 6x6 covariance matrix using the State Transition Matrix.
    cov_t = STM * cov0 * STM^T
    """
    return stm @ cov0 @ stm.T

# A more advanced implementation would compute the STM dynamically alongside the state 
# integration in NumericalPropagator (e.g., by integrating 36 additional differential equations),
# but here is a simple linear propagation helper.
