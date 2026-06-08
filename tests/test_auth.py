import jwt

from cleared import auth
from cleared.settings import settings


def test_password_hash_roundtrip():
    h = auth.hash_password("hunter2")
    assert h != "hunter2"
    assert auth.verify_password("hunter2", h)
    assert not auth.verify_password("wrong", h)


def test_token_roundtrip():
    tok = auth.create_token("user-123")
    payload = jwt.decode(tok, settings.secret_key, algorithms=["HS256"])
    assert payload["sub"] == "user-123"


def test_api_key_generation():
    key, key_hash, prefix = auth.generate_api_key()
    assert key.startswith("cak_")
    assert auth.hash_api_key(key) == key_hash
    assert prefix == key[:12]
