"""
API Key authentication support.
"""

import secrets

from app.auth.security import hash_api_key


def generate_api_key() -> tuple[str, str]:
    """
    Generates a new API key and returns (raw_key, hashed_key).
    The raw key is shown to the user once; only the hash is stored.
    """
    raw_key = f"orbita_{secrets.token_urlsafe(32)}"
    return raw_key, hash_api_key(raw_key)
