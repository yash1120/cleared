"""Outbound webhooks — notify a partner system when an assessment lands.

Each delivery is HMAC-SHA256 signed (header X-Cleared-Signature) so the receiver can
verify it. Best-effort: failures are returned/logged, never raised into the request.
"""

from __future__ import annotations

import hashlib
import hmac
import json

import httpx

from . import store


def sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def deliver(user_id: str, event: str, data: dict) -> dict:
    wh = store.get_webhook(user_id)
    if not wh:
        return {"delivered": False, "reason": "no webhook configured"}
    body = json.dumps({"event": event, "data": data}, default=str).encode()
    headers = {
        "Content-Type": "application/json",
        "X-Cleared-Event": event,
        "X-Cleared-Signature": sign(wh["secret"], body),
    }
    try:
        r = httpx.post(wh["url"], content=body, headers=headers, timeout=8.0)
        return {"delivered": True, "status": r.status_code}
    except Exception as e:  # network errors must not break the request
        return {"delivered": False, "error": str(e)[:200]}
