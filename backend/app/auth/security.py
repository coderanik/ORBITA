"""Security utilities for hashing/verifying credentials."""

import hashlib
import hmac
import os
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def hash_api_key(raw_key: str) -> str:
    secret = os.getenv("API_KEY_HASH_SECRET")
    if not secret:
        raise RuntimeError("API_KEY_HASH_SECRET must be set")
    return hmac.new(
        secret.encode("utf-8"),
        raw_key.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
