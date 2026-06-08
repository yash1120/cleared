"""Authentication: pbkdf2 password hashing (stdlib) + JWT bearer tokens (PyJWT).

A prototype-grade but real auth layer. Production should add refresh tokens, email
verification, rate limiting, and httpOnly cookies — see GO-LIVE.md.
"""

from __future__ import annotations

import base64
import datetime
import hashlib
import secrets

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from . import store
from .settings import settings

_ITERATIONS = 200_000
_bearer = HTTPBearer(auto_error=False)
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def generate_api_key() -> tuple[str, str, str]:
    """Return (plaintext_key, sha256_hash, display_prefix). The plaintext is shown once."""
    key = "cak_" + secrets.token_urlsafe(32)
    return key, hash_api_key(key), key[:12]


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2${_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iters, b_salt, b_dk = stored.split("$")
        salt = base64.b64decode(b_salt)
        expected = base64.b64decode(b_dk)
        test = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iters))
        return secrets.compare_digest(test, expected)
    except Exception:
        return False


def create_token(user_id: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + datetime.timedelta(hours=settings.token_ttl_hours)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def sync_admin_flag(user: dict) -> dict:
    """Set is_admin to match CLEARED_ADMIN_EMAILS. Idempotent."""
    expected = (user["email"] or "").strip().lower() in settings.admin_email_set
    if bool(user.get("is_admin")) != expected:
        store.set_admin(user["id"], expected)
        user["is_admin"] = expected
    return user


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    api_key: str | None = Depends(_api_key_header),
) -> dict:
    # Machine-to-machine: an X-API-Key header (used by integrations like Xero).
    if api_key:
        uid = store.get_user_id_by_key_hash(hash_api_key(api_key))
        user = store.get_user_by_id(uid) if uid else None
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return sync_admin_flag(user)
    # Human: a JWT bearer token from the web app.
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=["HS256"])
        user = store.get_user_by_id(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return sync_admin_flag(user)


def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
