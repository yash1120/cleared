"""Pytest setup: isolate to a temp DB and force mock mode before importing the app."""

import os
import pathlib
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_db = pathlib.Path(tempfile.gettempdir()) / "cleared_pytest.db"
for suffix in ("", "-wal", "-shm"):
    p = pathlib.Path(str(_db) + suffix)
    if p.exists():
        p.unlink()

os.environ["CLEARED_DB_PATH"] = str(_db)
os.environ["CLEARED_MOCK"] = "1"
os.environ["CLEARED_SECRET_KEY"] = "test-secret"
