"""Thin Anthropic SDK wrapper.

- Caches the (large, stable) rule pack in the system prompt so it is not re-billed on
  every CDD call. The rule pack is the last system block and carries cache_control;
  the volatile per-customer content goes in the user message, after the cached prefix.
- Uses messages.parse() for validated structured output against a Pydantic model.
"""

from __future__ import annotations

from typing import Any, TypeVar

import anthropic
from pydantic import BaseModel

_client: anthropic.Anthropic | None = None

T = TypeVar("T", bound=BaseModel)


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
    return _client


def cached_system(base_instructions: str, rules_text: str) -> list[dict[str, Any]]:
    """System prompt = stable instructions + cached rule pack.

    cache_control on the last block caches both blocks together (prefix match)."""
    return [
        {"type": "text", "text": base_instructions},
        {"type": "text", "text": rules_text, "cache_control": {"type": "ephemeral"}},
    ]


def run_structured(
    *,
    system: list[dict[str, Any]],
    user_text: str,
    output_model: type[T],
    model: str,
    max_tokens: int = 16000,
    thinking: bool = False,
) -> tuple[T, Any]:
    """Return (parsed_output, usage). Raises if the model refuses or output is unparseable."""
    client = get_client()
    kwargs: dict[str, Any] = dict(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_text}],
        output_format=output_model,
    )
    if thinking:
        kwargs["thinking"] = {"type": "adaptive"}
    response = client.messages.parse(**kwargs)
    if response.parsed_output is None:
        raise RuntimeError(
            f"Model did not return parseable structured output (stop_reason={response.stop_reason})."
        )
    return response.parsed_output, response.usage
