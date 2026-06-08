"""Sanctions / PEP screening.

MVP uses a small local sample list so the demo runs fully offline. The `screen_name`
function is the seam: swap its body for the OpenSanctions match API in production
(POST https://api.opensanctions.org/match/default with name + dob), mapping each
result to a ScreeningHit. Everything downstream stays the same.
"""

from __future__ import annotations

import functools
import json
from pathlib import Path

import httpx
from rapidfuzz import fuzz

from .models import Customer, ScreeningHit
from .settings import settings

SAMPLE_PATH = Path(__file__).parent / "sanctions_sample.json"
MATCH_THRESHOLD = 86.0  # token_sort_ratio; tuned so close names hit, unrelated names don't


@functools.lru_cache(maxsize=1)
def _sample_list() -> list[dict]:
    return json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))


def _local_screen(name: str) -> list[ScreeningHit]:
    hits: list[ScreeningHit] = []
    for entry in _sample_list():
        score = fuzz.token_sort_ratio(name.lower(), entry["name"].lower())
        if score >= MATCH_THRESHOLD:
            hits.append(
                ScreeningHit(
                    query_name=name, matched_name=entry["name"], list_name=entry["list"],
                    score=round(float(score), 1), source=entry["source"], details=entry.get("details"),
                )
            )
    return hits


def _opensanctions_screen(name: str) -> list[ScreeningHit] | None:
    """Real screening via an OpenSanctions match API (hosted or self-hosted yente).

    Configure CLEARED_OPENSANCTIONS_URL (and optionally CLEARED_OPENSANCTIONS_KEY). Returns
    None when not configured or on any error, so callers fall back to the local sample list.
    """
    base = settings.opensanctions_url
    if not base:
        return None
    headers = {}
    if settings.opensanctions_key:
        headers["Authorization"] = f"ApiKey {settings.opensanctions_key}"
    try:
        resp = httpx.post(
            base.rstrip("/") + "/match/default",
            json={"queries": {"q": {"schema": "Person", "properties": {"name": [name]}}}},
            headers=headers, timeout=8.0,
        )
        resp.raise_for_status()
        results = resp.json().get("responses", {}).get("q", {}).get("results", [])
        hits: list[ScreeningHit] = []
        for r in results:
            score = round(float(r.get("score", 0)) * 100, 1)
            if score >= 70:
                ds = r.get("datasets", []) or []
                hits.append(
                    ScreeningHit(
                        query_name=name, matched_name=r.get("caption", ""),
                        list_name=", ".join(ds[:2]) or "OpenSanctions", score=score,
                        source="OpenSanctions", details=r.get("schema"),
                    )
                )
        return hits
    except Exception:
        return None


def screen_name(name: str) -> list[ScreeningHit]:
    via = _opensanctions_screen(name)
    return via if via is not None else _local_screen(name)


def screen_customer(customer: Customer) -> list[ScreeningHit]:
    """Screen the customer and every beneficial owner."""
    names = [customer.name] + [bo.name for bo in customer.beneficial_owners]
    hits: list[ScreeningHit] = []
    seen: set[tuple[str, str]] = set()
    for n in names:
        for hit in screen_name(n):
            key = (hit.query_name, hit.matched_name)
            if key not in seen:
                seen.add(key)
                hits.append(hit)
    return hits
