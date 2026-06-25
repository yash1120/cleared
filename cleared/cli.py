"""Cleared operator CLI.

Bootstrap, daily jobs, and quick system inspection without an HTTP client.

  python -m cleared.cli seed-admin you@yourdomain.com
  python -m cleared.cli run-reminders
  python -m cleared.cli info
  python -m cleared.cli export-signups signups.csv
"""

from __future__ import annotations

import argparse
import csv
import datetime
import getpass
import sys

from . import auth, reminders, store


def cmd_seed_admin(args: argparse.Namespace) -> int:
    email = args.email.strip().lower()
    if "@" not in email:
        print(f"Not a valid email: {email!r}", file=sys.stderr)
        return 2
    password = args.password or getpass.getpass("Password (hidden): ") or ""
    if len(password) < 8:
        print("Password must be at least 8 characters.", file=sys.stderr)
        return 2
    existing = store.get_user_by_email(email)
    if existing:
        store.set_admin(existing["id"], True)
        print(f"Promoted existing user to admin: {email}")
    else:
        user = store.create_user(email, auth.hash_password(password), "real_estate", "Cleared HQ")
        store.set_admin(user["id"], True)
        print(f"Created admin user: {email}")
    print(
        "Note: add this email to CLEARED_ADMIN_EMAILS in your deployment env so "
        "the is_admin flag survives the next login sync."
    )
    return 0


def cmd_run_reminders(_args: argparse.Namespace) -> int:
    with store._db() as c:
        users = [dict(r) for r in c.execute("SELECT id, email, firm_name FROM users").fetchall()]
    sent = skipped = failed = 0
    for u in users:
        digest = reminders.preview_for(u)
        if digest is None:
            skipped += 1
            continue
        result = reminders.send_email(digest)
        status = "mock" if result.get("mock") else "ok" if result.get("delivered") else "fail"
        if status == "fail":
            failed += 1
        else:
            sent += 1
        detail = f"{digest['overdue_count']} overdue · {digest['due_soon_count']} due soon"
        store.log_event(u["id"], "reminder.sent", detail=detail + (" (mock)" if result.get("mock") else ""))
        print(f"  {u['email']:40s}  {status:>4s}  {detail}")
    print(f"\nDone. Sent {sent}, skipped {skipped}, failed {failed}.")
    return 0


def cmd_info(_args: argparse.Namespace) -> int:
    o = store.admin_overview()
    print("Cleared system status")
    print("=" * 32)
    print(f"Users:           {o['users']}  ({o['admins']} admin)")
    print(f"Records:         {o['records']}")
    print(f"SMRs drafted:    {o['smrs']}")
    print(f"Beta signups:    {o['signups_open']} open / {o['signups_total']} total")
    l = o["last_7_days"]
    print(f"Last 7 days:     {l['records']} records · {l['signups']} signups · {l['users']} new users")
    return 0


DEMO_EMAIL = "demo@cleared.com.au"
DEMO_PASSWORD = "demo1234"


def _demo_customers():
    """Return (Customer, days_ago, source, external_ref) tuples spanning the risk spread.

    Ratings are produced by the offline heuristic in mock.py:
      sanctions name -> unacceptable;  PEP / non-individual-no-ID -> high;
      one elevating factor -> medium;  clean individual -> low.
    """
    from . import sample_data
    from .models import BeneficialOwner, Customer, EntityType, PartyRole

    def ind(name, role, ident=True, funds=True, cash=None, days=1, src=None, ref=None, addr=None):
        return (
            Customer(
                name=name, entity_type=EntityType.individual, role=role, country="Australia",
                identification_provided=["drivers_licence", "medicare"] if ident else [],
                funds_source="Salaried employment; owner-occupier" if funds else None,
                cash_component_aud=cash,
                property_address=addr or "Sydney NSW",
                transaction_value_aud=900_000,
            ),
            days, src, ref,
        )

    def entity(name, etype, role, days=1, src=None, ref=None, pep=False):
        bos = []
        if pep:
            bos = [BeneficialOwner(name="Mariana Costa Ribeiro", role="ultimate shareholder >=25%",
                                   ownership_percent=55, country="Overseas", is_pep=True)]
        return (
            Customer(
                name=name, entity_type=etype, role=role, country="Australia",
                abn_or_acn="ACN 600 000 000", identification_provided=[],
                funds_source=None, beneficial_owners=bos,
                property_address="Sydney NSW", transaction_value_aud=4_200_000,
            ),
            days, src, ref,
        )

    P = PartyRole
    E = EntityType
    items = [
        # Low — clean individuals
        (sample_data.clean_individual(), 27, None, None),
        ind("James O'Brien", P.vendor, days=24, addr="14 Wattle St, Marrickville NSW"),
        ind("Priya Nair", P.purchaser, days=20, src="xero", ref="XERO-1043"),
        ind("Tom & Lisa Hargreaves", P.vendor, days=14),
        ind("Grace Liu", P.purchaser, days=6),
        ind("Daniel Cooper", P.vendor, days=2, src="xero", ref="XERO-1099"),
        # Medium — one elevating factor
        ind("Marcus Webb", P.purchaser, funds=False, days=22),
        ind("Elena Petrova", P.purchaser, cash=25_000, days=12),
        ind("Hassan Ali", P.vendor, funds=False, days=4),
        # High — PEP or non-individual without ID
        (sample_data.company_with_offshore_owner(), 18, None, None),
        (sample_data.smsf_overseas_funds(), 9, None, None),
        entity("Meridian Trust", E.trust, P.purchaser, days=16, src="myob", ref="MYOB-22"),
        entity("Brightwater Developments Pty Ltd", E.company, P.purchaser, days=3),
        # Medium + SMR (overpayment)
        (sample_data.overpayment_smr(), 7, None, None),
        # Unacceptable — sanctions name match
        ind("Dmitri Volkov", P.purchaser, ident=False, funds=False, days=11),
    ]
    return items


def cmd_seed_demo(args: argparse.Namespace) -> int:
    from . import cdd_agent, smr_agent
    from .settings import settings

    settings.mock = True  # deterministic, fast, no API key needed

    # Reset any prior demo state so reseeding is idempotent.
    with store._db() as c:
        row = c.execute("SELECT id FROM users WHERE email = ?", (DEMO_EMAIL,)).fetchone()
        if row:
            uid = row["id"]
            c.execute("DELETE FROM smrs WHERE record_id IN (SELECT id FROM records WHERE user_id = ?)", (uid,))
            c.execute("DELETE FROM records WHERE user_id = ?", (uid,))
            c.execute("DELETE FROM audit_events WHERE user_id = ?", (uid,))
            c.execute("DELETE FROM api_keys WHERE user_id = ?", (uid,))
            c.execute("DELETE FROM webhooks WHERE user_id = ?", (uid,))
            c.execute("DELETE FROM users WHERE id = ?", (uid,))
        c.execute("DELETE FROM beta_signups WHERE email LIKE '%demoseed.cleared'")

    user = store.create_user(DEMO_EMAIL, auth.hash_password(DEMO_PASSWORD), "real_estate", "Harbour City Realty")
    uid = user["id"]
    store.set_admin(uid, True)  # demo login also sees the Admin console

    now = datetime.datetime.now(datetime.timezone.utc)
    saved = []
    for customer, days_ago, src, ref in _demo_customers():
        if src:
            customer.source = src
        if ref:
            customer.external_ref = ref
        record = cdd_agent.assess_customer(customer, "real_estate")
        created = (now - datetime.timedelta(days=days_ago, hours=days_ago % 7)).isoformat()
        record.created_at = created  # backdate so the timeseries chart has shape
        store.save_record(record, uid)
        store.log_event(uid, "assessment.created",
                        detail=f"{customer.name} · {record.risk_assessment.rating.value}",
                        record_id=record.record_id)
        saved.append((record, customer))

    # Draft an SMR on the overpayment customer.
    for record, customer in saved:
        if record.risk_assessment.smr_consideration or "cash buyer" in customer.name.lower():
            smr = smr_agent.draft_smr(customer, customer.notes or "Attempted overpayment with third-party cash.", "real_estate")
            store.save_smr(record.record_id, smr)
            store.log_event(uid, "smr.drafted", detail=f"{customer.name} · drafted", record_id=record.record_id)
            break

    # Force a couple of reviews overdue and a couple due-soon so the schedule looks alive.
    overdue = (now - datetime.timedelta(days=5)).isoformat()
    due_soon = (now + datetime.timedelta(days=9)).isoformat()
    with store._db() as c:
        ids = [r["id"] for r in c.execute(
            "SELECT id FROM records WHERE user_id = ? AND rating IN ('high','unacceptable') ORDER BY created_at LIMIT 4",
            (uid,)).fetchall()]
        for i, rid in enumerate(ids):
            c.execute("UPDATE records SET review_due = ? WHERE id = ?",
                      (overdue if i < 2 else due_soon, rid))

    # A webhook + an API key so the integrations/admin views aren't empty.
    store.set_webhook(uid, "https://harbourcityrealty.example.com/cleared-hook", "whsec_demo_seed_secret")
    store.log_event(uid, "webhook.set", detail="https://harbourcityrealty.example.com/cleared-hook")
    _key, key_hash, prefix = auth.generate_api_key()
    store.create_api_key(uid, "Xero integration", key_hash, prefix)
    store.log_event(uid, "apikey.created", detail="Xero integration")

    # Beta signups for the admin inbox (distinct domain so reseed clears them).
    signups = [
        ("janet@coastrealty.demoseed.cleared", "Janet Reid", "Coast Realty", "real_estate", "Need this before July, ~40 listings/mo."),
        ("partner@finchlegal.demoseed.cleared", "David Finch", "Finch Legal", "legal", "Conveyancing practice, keen on the API."),
        ("ops@summitaccounting.demoseed.cleared", "Sam Tran", "Summit Accounting", "accounting", "How does pricing scale per seat?"),
        ("info@goldbar.demoseed.cleared", "Lena Gold", "GoldBar Bullion", "precious_metals", None),
    ]
    for email, name, firm, prof, msg in signups:
        store.save_beta_signup(email, name, firm, prof, msg)
    # Mark one contacted.
    with store._db() as c:
        first = c.execute("SELECT id FROM beta_signups WHERE email = ?",
                          ("janet@coastrealty.demoseed.cleared",)).fetchone()
        if first:
            store.admin_mark_signup_contacted(first["id"])

    o = store.admin_overview()
    print("Demo data seeded.")
    print(f"  Login:   {DEMO_EMAIL} / {DEMO_PASSWORD}  (also an admin)")
    print(f"  Records: {len(saved)}   Signups: {o['signups_total']}")
    print("  Tip: set CLEARED_ADMIN_EMAILS=demo@cleared.com.au so the Admin nav stays visible after login.")
    return 0


def cmd_export_signups(args: argparse.Namespace) -> int:
    rows = store.admin_list_signups(include_archived=args.include_archived, limit=10_000)
    fields = ["created_at", "email", "name", "firm", "profession", "message", "contacted_at", "archived_at"]
    with open(args.outfile, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) for k in fields})
    print(f"Wrote {len(rows)} signups to {args.outfile}")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="cleared", description="Cleared operator CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("seed-admin", help="Create or promote an admin user")
    sp.add_argument("email")
    sp.add_argument("--password", help="If omitted, prompts interactively (hidden input)")
    sp.set_defaults(func=cmd_seed_admin)

    sp = sub.add_parser("seed-demo", help="Seed a polished demo dataset (demo@cleared.com.au / demo1234)")
    sp.set_defaults(func=cmd_seed_demo)

    sp = sub.add_parser("run-reminders", help="Build + send review-reminder digests for every user")
    sp.set_defaults(func=cmd_run_reminders)

    sp = sub.add_parser("info", help="Print system stats")
    sp.set_defaults(func=cmd_info)

    sp = sub.add_parser("export-signups", help="Dump beta_signups to a CSV file")
    sp.add_argument("outfile")
    sp.add_argument("--include-archived", action="store_true")
    sp.set_defaults(func=cmd_export_signups)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
