"""The AUSTRAC Tranche 2 professions Cleared serves, and how the agent frames each."""

from __future__ import annotations

PROFESSIONS: dict[str, dict[str, str]] = {
    "real_estate": {
        "label": "Real estate agency",
        "service": "acting as an agent in the buying, selling or transfer of real estate",
    },
    "accounting": {
        "label": "Accounting practice",
        "service": "providing accounting, bookkeeping or tax services and managing client money or assets",
    },
    "legal": {
        "label": "Legal practice / conveyancer",
        "service": "providing legal or conveyancing services in property and business transactions",
    },
    "precious_metals": {
        "label": "Precious metals & stones dealer",
        "service": "buying or selling bullion, precious metals or precious stones",
    },
    "tcsp": {
        "label": "Trust & company service provider",
        "service": "forming or administering companies and trusts, or acting as trustee or nominee",
    },
}

DEFAULT_PROFESSION = "real_estate"


def is_valid(profession: str) -> bool:
    return profession in PROFESSIONS


def framing(profession: str) -> tuple[str, str]:
    """Return (label, designated-service description) for prompt framing."""
    p = PROFESSIONS.get(profession, PROFESSIONS[DEFAULT_PROFESSION])
    return p["label"], p["service"]
