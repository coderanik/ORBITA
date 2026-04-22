from app.auth.security import get_password_hash, hash_api_key, verify_password


def test_password_hash_roundtrip():
    raw = "password123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed)


def test_api_key_hash_is_stable():
    key = "orb_test_key"
    assert hash_api_key(key) == hash_api_key(key)
