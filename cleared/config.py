"""Thin accessors over the centralized Settings (kept for import stability)."""

from .settings import settings

GEN_MODEL = settings.gen_model
JUDGE_MODEL = settings.judge_model
AGENT_VERSION = settings.agent_version


def has_api_key() -> bool:
    return settings.has_api_key


def mock_enabled() -> bool:
    return settings.mock_enabled
