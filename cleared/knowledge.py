"""Loads the AUSTRAC real-estate rule pack and exposes it for grounding + verification."""

from __future__ import annotations

import functools
import json
from pathlib import Path

RULES_PATH = Path(__file__).parent / "rules" / "austrac_real_estate_rules.json"


@functools.lru_cache(maxsize=1)
def load_rules() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def valid_rule_ids() -> set[str]:
    """The set of legitimate rule IDs — used to catch hallucinated citations."""
    return {r["id"] for r in load_rules()["rules"]}


def get_rule(rule_id: str) -> dict | None:
    return next((r for r in load_rules()["rules"] if r["id"] == rule_id), None)


def rules_as_prompt_text() -> str:
    """Render the rule pack as the stable, cacheable grounding context for the agent."""
    data = load_rules()
    lines = [
        f"AUSTRAC REAL-ESTATE AML/CTF RULE PACK (version: {data['version']})",
        data["disclaimer"],
        "",
        "Rules (cite by ID):",
    ]
    for r in data["rules"]:
        lines.append(f"[{r['id']}] ({r['category']}) {r['title']}\n{r['text']}\n")
    return "\n".join(lines)
