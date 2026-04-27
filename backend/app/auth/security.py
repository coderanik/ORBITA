"""Security utilities for hashing/verifying credentials."""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def hash_api_key(raw_key: str) -> str:
    return pwd_context.hash(raw_key)


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    return pwd_context.verify(raw_key, stored_hash)
