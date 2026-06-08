"""Centralized, environment-driven configuration.

All tunables live here. Override any field with a CLEARED_-prefixed env var (or a .env
file), e.g. CLEARED_GEN_MODEL, CLEARED_DB_PATH, CLEARED_MOCK, CLEARED_OPENSANCTIONS_URL.
"""

from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "cleared.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CLEARED_", env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Models
    gen_model: str = "claude-sonnet-4-6"
    judge_model: str = "claude-opus-4-7"
    agent_version: str = "0.2.0"

    # Storage (swap CLEARED_DB_PATH to relocate; migrate to Postgres by reimplementing store.py)
    db_path: Path = _DEFAULT_DB

    # Behaviour
    mock: bool | None = None  # None = auto (mock when no API key)

    # Sanctions/PEP screening (real provider seam)
    opensanctions_url: str | None = None
    opensanctions_key: str | None = None

    # Auth (set CLEARED_SECRET_KEY in production)
    secret_key: str = "dev-insecure-change-me-in-production"
    token_ttl_hours: int = 168  # 7 days

    # Admin: any user whose email matches this comma-separated list gets is_admin set
    # to true automatically on register/login.
    admin_emails: str = ""

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    # Email (used for review-reminder digests; mock when smtp_host is unset)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "cleared@localhost"

    @property
    def has_api_key(self) -> bool:
        return bool(os.environ.get("ANTHROPIC_API_KEY"))

    @property
    def mock_enabled(self) -> bool:
        return self.mock if self.mock is not None else not self.has_api_key


settings = Settings()
