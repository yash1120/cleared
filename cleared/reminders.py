"""Review-reminder digests.

Builds a plain-text digest of overdue / due-soon customer reviews for one user
and (optionally) emails it via SMTP. When no SMTP host is configured the call
returns ``mock: True`` and the body so the UI can preview what *would* be sent.
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from . import store
from .settings import settings


def build_digest(user: dict, due: list[dict]) -> dict | None:
    overdue = [d for d in due if d["overdue"]]
    soon = [d for d in due if not d["overdue"]]
    if not overdue and not soon:
        return None

    firm = user.get("firm_name") or user["email"]
    lines: list[str] = [f"Hi {firm},", ""]
    if overdue:
        lines.append(f"{len(overdue)} customer review(s) are OVERDUE:")
        for d in overdue:
            lines.append(f"  - {d['customer_name']} ({d['rating']}) — due {d['review_due'][:10]}")
        lines.append("")
    if soon:
        lines.append(f"{len(soon)} customer review(s) due in the next 30 days:")
        for d in soon:
            lines.append(f"  - {d['customer_name']} ({d['rating']}) — due {d['review_due'][:10]}")
        lines.append("")
    lines += [
        "Open Cleared to re-assess these customers and refresh the audit trail.",
        "",
        "— Cleared",
    ]
    return {
        "to": user["email"],
        "subject": f"Cleared: {len(overdue)} overdue · {len(soon)} due soon",
        "body": "\n".join(lines),
        "overdue_count": len(overdue),
        "due_soon_count": len(soon),
    }


def send_email(digest: dict) -> dict:
    """Deliver a digest via SMTP if configured; otherwise return a mock result."""
    if not settings.smtp_host:
        return {"delivered": False, "mock": True, "to": digest["to"], "subject": digest["subject"]}
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = digest["to"]
    msg["Subject"] = digest["subject"]
    msg.set_content(digest["body"])
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as s:
            s.starttls()
            if settings.smtp_user and settings.smtp_password:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
        return {"delivered": True, "to": digest["to"], "subject": digest["subject"]}
    except (smtplib.SMTPException, OSError) as e:
        return {"delivered": False, "error": str(e), "to": digest["to"]}


def preview_for(user: dict) -> dict | None:
    """Build (but do not send) this user's current digest."""
    return build_digest(user, store.reviews_due(user["id"]))


def send_for(user: dict) -> dict:
    """Build and attempt to send this user's digest. Logs an audit event."""
    digest = preview_for(user)
    if digest is None:
        return {"sent": False, "reason": "no reviews due"}
    result = send_email(digest)
    detail = f"{digest['overdue_count']} overdue · {digest['due_soon_count']} due soon"
    if result.get("mock"):
        detail += " (mock; no SMTP configured)"
    elif result.get("error"):
        detail += f" (failed: {result['error']})"
    store.log_event(user["id"], "reminder.sent", detail=detail)
    return {**result, "sent": result.get("delivered", False), "digest": digest}
