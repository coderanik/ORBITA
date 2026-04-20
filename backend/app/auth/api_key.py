"""
API Key authentication support.
"""

import hashlib
import secrets

def generate_api_key() -> tuple[str, str]:
    """
    Generates a new API key and returns (raw_key, hashed_key).
    The raw key is shown to the user once; only the hash is stored.
    """
    raw_key = f"orbita_{secrets.token_urlsafe(32)}"
    hashed = hashlib.sha256(raw_key.encode()).hexdigest()
    return raw_key, hashed

def hash_api_key(raw_key: str) -> str:
    """Hash an API key for lookup."""
    return hashlib.sha256(raw_key.encode()).hexdigest()
