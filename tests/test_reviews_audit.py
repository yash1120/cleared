"""Tests for v0.4: ongoing review scheduling, reassess flow, and the audit trail."""

from __future__ import annotations

import datetime

from fastapi.testclient import TestClient

from cleared import auth, sample_data, store
from cleared.api import app
from cleared.cdd_agent import assess_customer

client = TestClient(app)


def _record():
    return assess_customer(sample_data.company_with_offshore_owner())


def _register(email: str) -> str:
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123", "profession": "real_estate"})
    return r.json()["token"]


# --------------------- store: scheduling ---------------------
def test_review_due_is_set_and_returned_in_list():
    u = store.create_user("rev1@x.com", auth.hash_password("p"), "real_estate")
    rec = _record()
    store.save_record(rec, u["id"])
    summaries = store.list_records(u["id"])
    assert summaries and summaries[0]["review_due"] is not None


def test_review_cadence_by_rating():
    # Pure helper test — explicit per-rating cadence.
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc).isoformat()
    assert store._review_due("low", now).startswith("2028-01-01")        # +730 days
    assert store._review_due("medium", now).startswith("2027-01-01")      # +365 days
    assert store._review_due("high", now).startswith("2026-04-01")        # +90 days
    assert store._review_due("unacceptable", now).startswith("2026-01-31")  # +30 days


def test_reviews_due_latest_per_customer_and_overdue_flag():
    u = store.create_user("rev2@x.com", auth.hash_password("p"), "real_estate")
    # Two assessments for the same customer name → only the latest should count.
    rec1 = _record(); store.save_record(rec1, u["id"])
    rec2 = _record(); store.save_record(rec2, u["id"])
    assert rec1.customer.name == rec2.customer.name

    # Backdate the latest record's review_due so it is overdue.
    with store._db() as c:
        c.execute("UPDATE records SET review_due = ? WHERE id = ?", ("2020-01-01T00:00:00+00:00", rec2.record_id))

    due = store.reviews_due(u["id"])
    ids = [d["id"] for d in due]
    assert rec2.record_id in ids
    assert rec1.record_id not in ids  # superseded by rec2
    assert next(d for d in due if d["id"] == rec2.record_id)["overdue"] is True


# --------------------- store: audit log ---------------------
def test_log_and_list_events_per_user_and_record():
    u1 = store.create_user("aud1@x.com", auth.hash_password("p"), "real_estate")
    u2 = store.create_user("aud2@x.com", auth.hash_password("p"), "real_estate")
    store.log_event(u1["id"], "assessment.created", detail="A", record_id="r-1")
    store.log_event(u1["id"], "smr.drafted", detail="B", record_id="r-1")
    store.log_event(u1["id"], "apikey.created", detail="key")
    store.log_event(u2["id"], "assessment.created", detail="other", record_id="r-9")

    u1_events = store.list_events(u1["id"])
    assert len(u1_events) == 3
    assert all(e["action"] != "other" for e in u1_events)  # isolation

    record_events = store.list_events(u1["id"], record_id="r-1")
    assert len(record_events) == 2
    assert {e["action"] for e in record_events} == {"assessment.created", "smr.drafted"}


# --------------------- api: end-to-end ---------------------
def test_stats_includes_review_counts():
    tok = _register("v04stats@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "Acme Pty Ltd", "entity_type": "company", "role": "purchaser"}, headers=h)
    s = client.get("/api/stats", headers=h).json()
    assert "reviews_due" in s and "overdue" in s


def test_reassess_creates_new_record_and_audit_trail():
    tok = _register("v04reassess@x.com")
    h = {"Authorization": "Bearer " + tok}
    first = client.post(
        "/api/cdd",
        json={"name": "Beta Pty Ltd", "entity_type": "company", "role": "vendor"},
        headers=h,
    ).json()
    rid1 = first["record_id"]

    r = client.post(f"/api/records/{rid1}/reassess", headers=h)
    assert r.status_code == 200, r.text
    rid2 = r.json()["record_id"]
    assert rid2 != rid1

    # Original record is left immutable and still fetchable.
    assert client.get(f"/api/records/{rid1}", headers=h).status_code == 200

    # New record's audit trail shows the review event with a back-reference to rid1.
    audit = client.get(f"/api/records/{rid2}/audit", headers=h).json()
    actions = {e["action"] for e in audit}
    assert "review.completed" in actions
    review_evt = next(e for e in audit if e["action"] == "review.completed")
    assert rid1[:8] in (review_evt["detail"] or "")


def test_account_audit_endpoint_collects_events():
    tok = _register("v04audit@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "X", "entity_type": "individual", "role": "purchaser"}, headers=h)
    client.post("/api/keys", json={"name": "k"}, headers=h)

    events = client.get("/api/audit", headers=h).json()
    actions = {e["action"] for e in events}
    assert {"assessment.created", "apikey.created"} <= actions


def test_reviews_endpoint_returns_list():
    tok = _register("v04reviews@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "Gamma Pty Ltd", "entity_type": "company", "role": "vendor"}, headers=h)
    # New records have review_due ≥ 90 days out (high) so won't appear in default 30-day horizon.
    # Backdate to force inclusion.
    with store._db() as c:
        c.execute("UPDATE records SET review_due = ? WHERE customer_name = 'Gamma Pty Ltd'",
                  ("2020-01-01T00:00:00+00:00",))
    out = client.get("/api/reviews", headers=h).json()
    assert any(r["customer_name"] == "Gamma Pty Ltd" and r["overdue"] for r in out)


# --------------------- v0.5: chart data + duplicate lookup ---------------------
def test_timeseries_returns_gap_filled_window():
    tok = _register("v05ts@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "Delta Pty Ltd", "entity_type": "company", "role": "vendor"}, headers=h)
    out = client.get("/api/stats/timeseries?days=14", headers=h).json()
    assert len(out) == 14
    assert all("date" in p and "total" in p and "high" in p for p in out)
    # Today's bucket should have at least one assessment.
    today = out[-1]
    assert today["total"] >= 1


def test_top_rules_counts_citations():
    tok = _register("v05rules@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "Epsilon Pty Ltd", "entity_type": "company", "role": "vendor"}, headers=h)
    out = client.get("/api/stats/top_rules?limit=5", headers=h).json()
    assert isinstance(out, list)
    assert all("rule_id" in r and "count" in r and r["count"] >= 1 for r in out)


def test_reviews_timeline_buckets_overdue_into_current_week():
    tok = _register("v05wk@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "Zeta Pty Ltd", "entity_type": "company", "role": "vendor"}, headers=h)
    with store._db() as c:
        c.execute("UPDATE records SET review_due = ? WHERE customer_name = 'Zeta Pty Ltd'",
                  ("2020-01-01T00:00:00+00:00",))
    out = client.get("/api/stats/reviews_timeline?weeks=12", headers=h).json()
    assert len(out) == 12
    assert out[0]["overdue_count"] >= 1  # overdue items roll into the first (current) week


def test_lookup_finds_matching_by_name_and_external_ref():
    tok = _register("v05look@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/integrations/xero/assess", headers=h,
                json={"ContactID": "EXT-9", "Name": "Eta Holdings"})
    by_name = client.get("/api/records/lookup?name=eta", headers=h).json()
    assert any(r["customer_name"] == "Eta Holdings" for r in by_name)
    by_ref = client.get("/api/records/lookup?external_ref=EXT-9", headers=h).json()
    assert any(r["external_ref"] == "EXT-9" for r in by_ref)
    # Short names (<3 chars) are rejected — no match guessing.
    short = client.get("/api/records/lookup?name=et", headers=h).json()
    assert short == []


# --------------------- v0.6: history + reminders + beta signup ---------------------
def test_customer_history_returns_chain_after_reassess():
    tok = _register("v06hist@x.com")
    h = {"Authorization": "Bearer " + tok}
    first = client.post(
        "/api/cdd",
        json={"name": "Theta Pty Ltd", "entity_type": "company", "role": "vendor"},
        headers=h,
    ).json()
    second = client.post(f"/api/records/{first['record_id']}/reassess", headers=h).json()
    hist = client.get(f"/api/records/{second['record_id']}/history", headers=h).json()
    ids = [h["id"] for h in hist]
    assert first["record_id"] in ids and second["record_id"] in ids
    assert ids[0] == second["record_id"]  # newest first


def test_reminders_preview_empty_when_nothing_due():
    from cleared import reminders
    u = store.create_user("rem-empty@x.com", auth.hash_password("p"), "real_estate")
    assert reminders.preview_for(u) is None


def test_reminders_preview_includes_overdue_items():
    from cleared import reminders
    tok = _register("v06rem@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "Iota Pty Ltd", "entity_type": "company", "role": "vendor"}, headers=h)
    with store._db() as c:
        c.execute("UPDATE records SET review_due = ? WHERE customer_name = 'Iota Pty Ltd'",
                  ("2020-01-01T00:00:00+00:00",))
    user = store.get_user_by_email("v06rem@x.com")
    digest = reminders.preview_for(user)
    assert digest is not None
    assert digest["overdue_count"] >= 1
    assert "Iota Pty Ltd" in digest["body"]
    assert digest["to"] == "v06rem@x.com"


def test_reminders_send_endpoint_mock_without_smtp():
    tok = _register("v06send@x.com")
    h = {"Authorization": "Bearer " + tok}
    client.post("/api/cdd", json={"name": "Kappa Pty Ltd", "entity_type": "company", "role": "vendor"}, headers=h)
    with store._db() as c:
        c.execute("UPDATE records SET review_due = ? WHERE customer_name = 'Kappa Pty Ltd'",
                  ("2020-01-01T00:00:00+00:00",))
    r = client.post("/api/reminders/send", headers=h).json()
    # No SMTP configured in tests → mock send, sent=False but a digest was prepared.
    assert r["sent"] is False
    assert r.get("mock") is True
    # And the action is logged.
    audit = client.get("/api/audit", headers=h).json()
    assert any(e["action"] == "reminder.sent" for e in audit)


def test_beta_signup_persists_publicly():
    r = client.post("/api/beta-signup", json={
        "email": "lead@example.com", "firm": "Lead Realty",
        "profession": "real_estate", "message": "Looking before July 2026",
    })
    assert r.status_code == 200 and r.json() == {"ok": True}
    with store._db() as c:
        row = c.execute("SELECT * FROM beta_signups WHERE email = 'lead@example.com'").fetchone()
    assert row is not None and row["firm"] == "Lead Realty"


def test_beta_signup_rejects_bad_email():
    r = client.post("/api/beta-signup", json={"email": "not-an-email"})
    assert r.status_code == 400


# --------------------- v0.8: admin guard + endpoints ---------------------
def test_admin_guard_rejects_non_admins():
    tok = _register("notadmin@x.com")
    r = client.get("/api/admin/overview", headers={"Authorization": "Bearer " + tok})
    assert r.status_code == 403


def test_admin_endpoints_work_for_admins(monkeypatch):
    from cleared.settings import settings
    monkeypatch.setattr(settings, "admin_emails", "boss@cleared.com.au")
    tok = _register("boss@cleared.com.au")
    h = {"Authorization": "Bearer " + tok}

    # Sanity: /auth/me reflects the synced flag.
    me = client.get("/api/auth/me", headers=h).json()
    assert me["is_admin"] is True

    overview = client.get("/api/admin/overview", headers=h).json()
    assert overview["users"] >= 1
    assert "last_7_days" in overview and "records" in overview["last_7_days"]

    # Seed: a beta signup and a CDD assessment so signups + audit have content.
    client.post("/api/beta-signup", json={"email": "lead2@x.com", "firm": "Acme"})
    client.post("/api/cdd", json={"name": "Mu Pty Ltd", "entity_type": "company", "role": "vendor"}, headers=h)

    sus = client.get("/api/admin/signups", headers=h).json()
    target = next(s for s in sus if s["email"] == "lead2@x.com")
    assert target["contacted_at"] is None

    c = client.post(f"/api/admin/signups/{target['id']}/contact", headers=h).json()
    assert c == {"ok": True}
    # Second call is a no-op (already contacted) — 404 is the contract.
    again = client.post(f"/api/admin/signups/{target['id']}/contact", headers=h)
    assert again.status_code == 404

    arch = client.post(f"/api/admin/signups/{target['id']}/archive", headers=h).json()
    assert arch == {"ok": True}
    # Now hidden by default; appears with include_archived=true.
    visible = [s for s in client.get("/api/admin/signups", headers=h).json() if s["id"] == target["id"]]
    assert visible == []
    with_arch = client.get("/api/admin/signups?include_archived=true", headers=h).json()
    assert any(s["id"] == target["id"] for s in with_arch)

    users = client.get("/api/admin/users", headers=h).json()
    boss = next(u for u in users if u["email"] == "boss@cleared.com.au")
    assert boss["is_admin"] is True

    audit = client.get("/api/admin/audit", headers=h).json()
    assert any(e["user_email"] == "boss@cleared.com.au" for e in audit)
