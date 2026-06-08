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
