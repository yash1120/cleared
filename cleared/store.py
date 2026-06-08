"""SQLite persistence for users, API keys, CDD records and SMRs.

Records are scoped per user and carry an optional external reference so integrations
(Xero, MYOB, a CRM, ...) can correlate Cleared records with their own contacts.
"""

from __future__ import annotations

import contextlib
import datetime
import json
import sqlite3
import uuid
from pathlib import Path

from .models import SMR, CDDRecord
from .settings import settings

DB_PATH = Path(settings.db_path)


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextlib.contextmanager
def _db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def init_db() -> None:
    with _db() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
                profession TEXT NOT NULL, firm_name TEXT, created_at TEXT NOT NULL
            )"""
        )
        c.execute(
            """CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT, key_hash TEXT UNIQUE NOT NULL,
                prefix TEXT NOT NULL, created_at TEXT NOT NULL, last_used_at TEXT
            )"""
        )
        c.execute(
            """CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY, user_id TEXT, created_at TEXT NOT NULL, customer_name TEXT NOT NULL,
                entity_type TEXT, role TEXT, rating TEXT, enhanced_cdd INTEGER, smr_consideration INTEGER,
                gen_model TEXT, rules_version TEXT, retain_until TEXT, external_ref TEXT, source TEXT,
                record_json TEXT NOT NULL
            )"""
        )
        c.execute(
            """CREATE TABLE IF NOT EXISTS smrs (
                record_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, smr_json TEXT NOT NULL
            )"""
        )
        c.execute(
            """CREATE TABLE IF NOT EXISTS webhooks (
                user_id TEXT PRIMARY KEY, url TEXT NOT NULL, secret TEXT NOT NULL, created_at TEXT NOT NULL
            )"""
        )
        c.execute(
            """CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, record_id TEXT, action TEXT NOT NULL,
                detail TEXT, at TEXT NOT NULL
            )"""
        )
        c.execute(
            """CREATE TABLE IF NOT EXISTS beta_signups (
                id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, firm TEXT,
                profession TEXT, message TEXT, created_at TEXT NOT NULL
            )"""
        )
        # Migrations for pre-existing records tables.
        cols = [r["name"] for r in c.execute("PRAGMA table_info(records)").fetchall()]
        if "user_id" not in cols:
            c.execute("ALTER TABLE records ADD COLUMN user_id TEXT")
        if "external_ref" not in cols:
            c.execute("ALTER TABLE records ADD COLUMN external_ref TEXT")
        if "source" not in cols:
            c.execute("ALTER TABLE records ADD COLUMN source TEXT")
        if "review_due" not in cols:
            c.execute("ALTER TABLE records ADD COLUMN review_due TEXT")
        user_cols = [r["name"] for r in c.execute("PRAGMA table_info(users)").fetchall()]
        if "is_admin" not in user_cols:
            c.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        bsu_cols = [r["name"] for r in c.execute("PRAGMA table_info(beta_signups)").fetchall()]
        if "contacted_at" not in bsu_cols:
            c.execute("ALTER TABLE beta_signups ADD COLUMN contacted_at TEXT")
        if "archived_at" not in bsu_cols:
            c.execute("ALTER TABLE beta_signups ADD COLUMN archived_at TEXT")


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
def create_user(email: str, password_hash: str, profession: str, firm_name: str | None = None) -> dict:
    uid = str(uuid.uuid4())
    with _db() as c:
        c.execute(
            "INSERT INTO users (id, email, password_hash, profession, firm_name, created_at) VALUES (?,?,?,?,?,?)",
            (uid, email.strip().lower(), password_hash, profession, firm_name, _now()),
        )
    return get_user_by_id(uid)  # type: ignore[return-value]


def get_user_by_email(email: str) -> dict | None:
    with _db() as c:
        row = c.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict | None:
    with _db() as c:
        row = c.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


# --------------------------------------------------------------------------- #
# API keys (machine-to-machine auth)
# --------------------------------------------------------------------------- #
def create_api_key(user_id: str, name: str, key_hash: str, prefix: str) -> dict:
    kid = str(uuid.uuid4())
    now = _now()
    with _db() as c:
        c.execute(
            "INSERT INTO api_keys (id, user_id, name, key_hash, prefix, created_at) VALUES (?,?,?,?,?,?)",
            (kid, user_id, name, key_hash, prefix, now),
        )
    return {"id": kid, "name": name, "prefix": prefix, "created_at": now, "last_used_at": None}


def list_api_keys(user_id: str) -> list[dict]:
    with _db() as c:
        rows = c.execute(
            "SELECT id, name, prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def delete_api_key(key_id: str, user_id: str) -> bool:
    with _db() as c:
        cur = c.execute("DELETE FROM api_keys WHERE id = ? AND user_id = ?", (key_id, user_id))
        return cur.rowcount > 0


def get_user_id_by_key_hash(key_hash: str) -> str | None:
    with _db() as c:
        row = c.execute("SELECT user_id FROM api_keys WHERE key_hash = ?", (key_hash,)).fetchone()
        if row is None:
            return None
        c.execute("UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?", (_now(), key_hash))
    return row["user_id"]


# --------------------------------------------------------------------------- #
# Records (scoped to a user)
# --------------------------------------------------------------------------- #
def _retain_until(created_iso: str) -> str:
    try:
        dt = datetime.datetime.fromisoformat(created_iso)
    except ValueError:
        dt = datetime.datetime.now(datetime.timezone.utc)
    try:
        return dt.replace(year=dt.year + 7).isoformat()
    except ValueError:
        return (dt + datetime.timedelta(days=2557)).isoformat()


# AUSTRAC expects review frequency proportionate to ML/TF risk: higher risk = shorter cycle.
REVIEW_DAYS = {"unacceptable": 30, "high": 90, "medium": 365, "low": 730}


def _review_due(rating: str, created_iso: str) -> str:
    try:
        dt = datetime.datetime.fromisoformat(created_iso)
    except ValueError:
        dt = datetime.datetime.now(datetime.timezone.utc)
    return (dt + datetime.timedelta(days=REVIEW_DAYS.get(rating, 365))).isoformat()


def save_record(rec: CDDRecord, user_id: str) -> CDDRecord:
    a = rec.risk_assessment
    with _db() as c:
        c.execute(
            """INSERT OR REPLACE INTO records
               (id, user_id, created_at, customer_name, entity_type, role, rating, enhanced_cdd,
                smr_consideration, gen_model, rules_version, retain_until, external_ref, source,
                review_due, record_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                rec.record_id, user_id, rec.created_at, rec.customer.name, rec.customer.entity_type.value,
                rec.customer.role.value, a.rating.value, int(a.enhanced_cdd_required),
                int(a.smr_consideration), rec.gen_model, rec.rules_version, _retain_until(rec.created_at),
                rec.customer.external_ref, rec.customer.source,
                _review_due(a.rating.value, rec.created_at), rec.model_dump_json(),
            ),
        )
    return rec


def list_records(
    user_id: str, q: str | None = None, rating: str | None = None,
    external_ref: str | None = None, limit: int = 200,
) -> list[dict]:
    sql = (
        "SELECT id, created_at, customer_name, entity_type, role, rating, enhanced_cdd, smr_consideration, "
        "retain_until, external_ref, source, review_due, "
        "(SELECT 1 FROM smrs WHERE smrs.record_id = records.id) AS has_smr "
        "FROM records WHERE user_id = ?"
    )
    args: list = [user_id]
    if q:
        sql += " AND customer_name LIKE ?"
        args.append(f"%{q}%")
    if rating:
        sql += " AND rating = ?"
        args.append(rating)
    if external_ref:
        sql += " AND external_ref = ?"
        args.append(external_ref)
    sql += " ORDER BY created_at DESC LIMIT ?"
    args.append(limit)
    with _db() as c:
        rows = c.execute(sql, args).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["enhanced_cdd"] = bool(d["enhanced_cdd"])
        d["smr_consideration"] = bool(d["smr_consideration"])
        d["has_smr"] = bool(d["has_smr"])
        out.append(d)
    return out


def get_record(record_id: str, user_id: str) -> CDDRecord | None:
    with _db() as c:
        row = c.execute(
            "SELECT record_json FROM records WHERE id = ? AND user_id = ?", (record_id, user_id)
        ).fetchone()
    return CDDRecord.model_validate_json(row["record_json"]) if row else None


def save_smr(record_id: str, smr: SMR) -> None:
    with _db() as c:
        c.execute(
            "INSERT OR REPLACE INTO smrs (record_id, created_at, smr_json) VALUES (?,?,?)",
            (record_id, _now(), smr.model_dump_json()),
        )


def get_smr(record_id: str) -> SMR | None:
    with _db() as c:
        row = c.execute("SELECT smr_json FROM smrs WHERE record_id = ?", (record_id,)).fetchone()
    return SMR.model_validate_json(row["smr_json"]) if row else None


def stats(user_id: str) -> dict:
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).isoformat()
    with _db() as c:
        rows = c.execute(
            "SELECT rating, COUNT(*) AS n FROM records WHERE user_id = ? GROUP BY rating", (user_id,)
        ).fetchall()
        by_rating = {r["rating"]: r["n"] for r in rows}
        flagged = c.execute(
            "SELECT COUNT(*) AS n FROM records WHERE user_id = ? AND smr_consideration = 1", (user_id,)
        ).fetchone()["n"]
        last7 = c.execute(
            "SELECT COUNT(*) AS n FROM records WHERE user_id = ? AND created_at >= ?", (user_id, cutoff)
        ).fetchone()["n"]
    due = reviews_due(user_id)
    return {
        "records": sum(by_rating.values()),
        "smr_flagged": flagged,
        "by_rating": by_rating,
        "last_7_days": last7,
        "reviews_due": len(due),
        "overdue": sum(1 for d in due if d["overdue"]),
    }


# --------------------------------------------------------------------------- #
# Ongoing monitoring — periodic re-review of each customer
# --------------------------------------------------------------------------- #
def _customer_key(external_ref: str | None, name: str) -> str:
    ref = (external_ref or "").strip().lower()
    return ref if ref else "name:" + name.strip().lower()


def reviews_due(user_id: str, horizon_days: int = 30) -> list[dict]:
    """Customers whose latest assessment is due (or overdue) for review.

    Only the most recent record per customer counts — older records in a customer's
    history are superseded and never resurface as "due".
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now.isoformat()
    horizon_iso = (now + datetime.timedelta(days=horizon_days)).isoformat()
    with _db() as c:
        rows = c.execute(
            "SELECT id, customer_name, external_ref, rating, review_due FROM records "
            "WHERE user_id = ? AND review_due IS NOT NULL ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    latest: dict[str, sqlite3.Row] = {}
    for r in rows:  # DESC order → first seen per key is the most recent
        latest.setdefault(_customer_key(r["external_ref"], r["customer_name"]), r)
    out = [
        {
            "id": r["id"], "customer_name": r["customer_name"], "rating": r["rating"],
            "review_due": r["review_due"], "overdue": r["review_due"] <= now_iso,
        }
        for r in latest.values()
        if r["review_due"] <= horizon_iso
    ]
    out.sort(key=lambda x: x["review_due"])
    return out


# --------------------------------------------------------------------------- #
# Audit trail — append-only record of every material action
# --------------------------------------------------------------------------- #
def log_event(user_id: str, action: str, detail: str | None = None, record_id: str | None = None) -> None:
    with _db() as c:
        c.execute(
            "INSERT INTO audit_events (id, user_id, record_id, action, detail, at) VALUES (?,?,?,?,?,?)",
            (str(uuid.uuid4()), user_id, record_id, action, detail, _now()),
        )


def list_events(user_id: str, record_id: str | None = None, limit: int = 100) -> list[dict]:
    sql = "SELECT id, record_id, action, detail, at FROM audit_events WHERE user_id = ?"
    args: list = [user_id]
    if record_id:
        sql += " AND record_id = ?"
        args.append(record_id)
    sql += " ORDER BY at DESC LIMIT ?"
    args.append(limit)
    with _db() as c:
        rows = c.execute(sql, args).fetchall()
    return [dict(r) for r in rows]


# --------------------------------------------------------------------------- #
# Analytics — time series + leaderboards for the dashboard charts
# --------------------------------------------------------------------------- #
_RATINGS = ("low", "medium", "high", "unacceptable")


def timeseries(user_id: str, days: int = 30) -> list[dict]:
    """Daily assessment counts (and per-rating breakdown) for the last `days` days, gap-filled."""
    today = datetime.datetime.now(datetime.timezone.utc).date()
    start = today - datetime.timedelta(days=days - 1)
    with _db() as c:
        rows = c.execute(
            "SELECT substr(created_at, 1, 10) AS day, rating, COUNT(*) AS n FROM records "
            "WHERE user_id = ? AND substr(created_at, 1, 10) >= ? GROUP BY day, rating",
            (user_id, start.isoformat()),
        ).fetchall()
    buckets: dict[str, dict] = {}
    for r in rows:
        b = buckets.setdefault(r["day"], {"date": r["day"], "total": 0, **{k: 0 for k in _RATINGS}})
        rating = r["rating"] if r["rating"] in _RATINGS else "low"
        b[rating] = r["n"]
        b["total"] += r["n"]
    out = []
    for i in range(days):
        d = (start + datetime.timedelta(days=i)).isoformat()
        out.append(buckets.get(d, {"date": d, "total": 0, **{k: 0 for k in _RATINGS}}))
    return out


def top_rules(user_id: str, limit: int = 10) -> list[dict]:
    """Most-frequently cited rule IDs across the user's assessments."""
    with _db() as c:
        rows = c.execute("SELECT record_json FROM records WHERE user_id = ?", (user_id,)).fetchall()
    counter: dict[str, int] = {}
    for r in rows:
        try:
            data = json.loads(r["record_json"])
        except (ValueError, TypeError):
            continue
        for rid in data.get("risk_assessment", {}).get("cited_rule_ids", []) or []:
            counter[rid] = counter.get(rid, 0) + 1
    items = sorted(counter.items(), key=lambda kv: -kv[1])[:limit]
    return [{"rule_id": k, "count": v} for k, v in items]


def reviews_timeline(user_id: str, weeks: int = 12) -> list[dict]:
    """Reviews due bucketed by ISO week (Monday-start) over the next `weeks` weeks.
    Anything overdue is folded into the current week so it doesn't drift off the chart."""
    items = reviews_due(user_id, horizon_days=weeks * 7)
    now = datetime.datetime.now(datetime.timezone.utc)
    today = now.date()
    current_monday = today - datetime.timedelta(days=today.weekday())
    by_week: dict[str, dict] = {}
    for it in items:
        d = datetime.datetime.fromisoformat(it["review_due"]).date()
        monday = d - datetime.timedelta(days=d.weekday())
        if monday < current_monday:
            monday = current_monday
        key = monday.isoformat()
        b = by_week.setdefault(key, {"week_start": key, "count": 0, "overdue_count": 0})
        b["count"] += 1
        if it["overdue"]:
            b["overdue_count"] += 1
    out = []
    for i in range(weeks):
        d = (current_monday + datetime.timedelta(days=i * 7)).isoformat()
        out.append(by_week.get(d, {"week_start": d, "count": 0, "overdue_count": 0}))
    return out


def customer_history(user_id: str, record_id: str) -> list[dict]:
    """Every record for the same customer as `record_id`, newest first.

    Customer identity falls back from external_ref (exact, if present on the anchor
    record) to a case-insensitive name match — same key used by reviews_due/lookup.
    """
    with _db() as c:
        anchor = c.execute(
            "SELECT customer_name, external_ref FROM records WHERE id = ? AND user_id = ?",
            (record_id, user_id),
        ).fetchone()
        if anchor is None:
            return []
        ref = (anchor["external_ref"] or "").strip()
        if ref:
            sql = (
                "SELECT id, customer_name, entity_type, role, rating, created_at, review_due, "
                "external_ref, source FROM records WHERE user_id = ? AND external_ref = ? "
                "ORDER BY created_at DESC"
            )
            args = (user_id, ref)
        else:
            sql = (
                "SELECT id, customer_name, entity_type, role, rating, created_at, review_due, "
                "external_ref, source FROM records WHERE user_id = ? "
                "AND LOWER(customer_name) = LOWER(?) ORDER BY created_at DESC"
            )
            args = (user_id, anchor["customer_name"].strip())
        rows = c.execute(sql, args).fetchall()
    return [dict(r) for r in rows]


# --------------------------------------------------------------------------- #
# Beta signups (public marketing form)
# --------------------------------------------------------------------------- #
def save_beta_signup(email: str, name: str | None, firm: str | None,
                     profession: str | None, message: str | None) -> dict:
    sid = str(uuid.uuid4())
    now = _now()
    with _db() as c:
        c.execute(
            "INSERT INTO beta_signups (id, email, name, firm, profession, message, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (sid, email.strip().lower(), name, firm, profession, message, now),
        )
    return {"id": sid, "email": email.strip().lower(), "created_at": now}


# --------------------------------------------------------------------------- #
# Admin — cross-tenant read access for operators
# --------------------------------------------------------------------------- #
def set_admin(user_id: str, value: bool) -> None:
    with _db() as c:
        c.execute("UPDATE users SET is_admin = ? WHERE id = ?", (1 if value else 0, user_id))


def admin_overview() -> dict:
    cutoff_7d = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).isoformat()
    with _db() as c:
        users = c.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
        admins = c.execute("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1").fetchone()["n"]
        records = c.execute("SELECT COUNT(*) AS n FROM records").fetchone()["n"]
        smrs = c.execute("SELECT COUNT(*) AS n FROM smrs").fetchone()["n"]
        signups_open = c.execute(
            "SELECT COUNT(*) AS n FROM beta_signups WHERE archived_at IS NULL"
        ).fetchone()["n"]
        signups_total = c.execute("SELECT COUNT(*) AS n FROM beta_signups").fetchone()["n"]
        records_7d = c.execute(
            "SELECT COUNT(*) AS n FROM records WHERE created_at >= ?", (cutoff_7d,)
        ).fetchone()["n"]
        signups_7d = c.execute(
            "SELECT COUNT(*) AS n FROM beta_signups WHERE created_at >= ?", (cutoff_7d,)
        ).fetchone()["n"]
        users_7d = c.execute(
            "SELECT COUNT(*) AS n FROM users WHERE created_at >= ?", (cutoff_7d,)
        ).fetchone()["n"]
    return {
        "users": users, "admins": admins, "records": records, "smrs": smrs,
        "signups_open": signups_open, "signups_total": signups_total,
        "last_7_days": {"records": records_7d, "signups": signups_7d, "users": users_7d},
    }


def admin_list_users(limit: int = 200) -> list[dict]:
    with _db() as c:
        rows = c.execute(
            "SELECT u.id, u.email, u.profession, u.firm_name, u.created_at, u.is_admin, "
            "(SELECT COUNT(*) FROM records r WHERE r.user_id = u.id) AS records_count "
            "FROM users u ORDER BY u.created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [{**dict(r), "is_admin": bool(r["is_admin"])} for r in rows]


def admin_list_signups(include_archived: bool = False, limit: int = 200) -> list[dict]:
    sql = (
        "SELECT id, email, name, firm, profession, message, created_at, contacted_at, archived_at "
        "FROM beta_signups"
    )
    if not include_archived:
        sql += " WHERE archived_at IS NULL"
    sql += " ORDER BY created_at DESC LIMIT ?"
    with _db() as c:
        rows = c.execute(sql, (limit,)).fetchall()
    return [dict(r) for r in rows]


def admin_mark_signup_contacted(signup_id: str) -> bool:
    with _db() as c:
        cur = c.execute(
            "UPDATE beta_signups SET contacted_at = ? WHERE id = ? AND contacted_at IS NULL",
            (_now(), signup_id),
        )
        return cur.rowcount > 0


def admin_archive_signup(signup_id: str) -> bool:
    with _db() as c:
        cur = c.execute(
            "UPDATE beta_signups SET archived_at = ? WHERE id = ?", (_now(), signup_id),
        )
        return cur.rowcount > 0


def admin_recent_audit(limit: int = 50) -> list[dict]:
    """Cross-tenant audit feed: every event with the actor's email attached."""
    with _db() as c:
        rows = c.execute(
            "SELECT a.id, a.user_id, u.email AS user_email, a.record_id, a.action, a.detail, a.at "
            "FROM audit_events a LEFT JOIN users u ON u.id = a.user_id "
            "ORDER BY a.at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def lookup_records(
    user_id: str, name: str | None = None, external_ref: str | None = None, limit: int = 5,
) -> list[dict]:
    """Find existing records that look like duplicates of an in-progress assessment.

    Matches on exact `external_ref` (if provided) OR a partial customer_name (case-insensitive).
    Returns up to `limit` most-recent matches.
    """
    name = (name or "").strip()
    external_ref = (external_ref or "").strip()
    if not name and not external_ref:
        return []
    parts: list[str] = []
    args: list = [user_id]
    if external_ref:
        parts.append("external_ref = ?")
        args.append(external_ref)
    if name and len(name) >= 3:
        parts.append("LOWER(customer_name) LIKE ?")
        args.append(f"%{name.lower()}%")
    if not parts:
        return []
    sql = (
        "SELECT id, customer_name, entity_type, role, rating, created_at, review_due, external_ref, source "
        "FROM records WHERE user_id = ? AND (" + " OR ".join(parts) + ") "
        "ORDER BY created_at DESC LIMIT ?"
    )
    args.append(limit)
    with _db() as c:
        rows = c.execute(sql, args).fetchall()
    return [dict(r) for r in rows]


# --------------------------------------------------------------------------- #
# Webhooks (one outbound endpoint per user)
# --------------------------------------------------------------------------- #
def set_webhook(user_id: str, url: str, secret: str) -> dict:
    now = _now()
    with _db() as c:
        c.execute(
            "INSERT OR REPLACE INTO webhooks (user_id, url, secret, created_at) VALUES (?,?,?,?)",
            (user_id, url, secret, now),
        )
    return {"url": url, "created_at": now}


def get_webhook(user_id: str) -> dict | None:
    with _db() as c:
        row = c.execute("SELECT * FROM webhooks WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def delete_webhook(user_id: str) -> None:
    with _db() as c:
        c.execute("DELETE FROM webhooks WHERE user_id = ?", (user_id,))


init_db()
