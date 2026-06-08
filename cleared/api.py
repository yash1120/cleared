"""FastAPI app: auth + data endpoints under /api, with the built frontend served as an SPA.

Run: uvicorn cleared.api:app   (build the frontend first: cd frontend && npm install && npm run build)
"""

from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Body, Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import auth, cdd_agent, connectors, knowledge, pdf, professions, reminders, sample_data, smr_agent, store, webhooks
from .models import (
    SMR,
    ApiKeyCreated,
    ApiKeyCreateRequest,
    ApiKeyInfo,
    BetaSignupRequest,
    CDDRecord,
    Customer,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
    WebhookCreated,
    WebhookSetRequest,
)
from .settings import settings

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

app = FastAPI(title="Cleared API", version=settings.agent_version)
api = APIRouter(prefix="/api")

_SAMPLE_LABELS = {
    "clean_individual": "Clean customer - low risk",
    "company_offshore_pep": "Company - offshore PEP",
    "smsf_overseas_funds": "SMSF / trust - overseas funds",
    "overpayment_smr": "Suspicious overpayment",
}


def _public(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"], email=user["email"], profession=user["profession"],
        firm_name=user.get("firm_name"), is_admin=bool(user.get("is_admin")),
    )


def _summary(rec: CDDRecord) -> dict:
    a = rec.risk_assessment
    return {
        "record_id": rec.record_id, "customer": rec.customer.name, "rating": a.rating.value,
        "enhanced_cdd_required": a.enhanced_cdd_required, "smr_consideration": a.smr_consideration,
        "external_ref": rec.customer.external_ref, "source": rec.customer.source,
    }


def _persist(
    record: CDDRecord, user: dict, background: BackgroundTasks,
    action: str = "assessment.created", detail: str | None = None,
) -> CDDRecord:
    """Save a fresh assessment, write an audit event, and fire the outbound webhook."""
    store.save_record(record, user["id"])
    store.log_event(
        user["id"], action,
        detail=detail or f"{record.customer.name} · {record.risk_assessment.rating.value}",
        record_id=record.record_id,
    )
    background.add_task(webhooks.deliver, user["id"], "assessment.created", _summary(record))
    return record


# --------------------------- public --------------------------- #
@api.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": "mock" if settings.mock_enabled else "live", "gen_model": settings.gen_model}


@api.get("/professions")
def list_professions() -> dict:
    return {k: v["label"] for k, v in professions.PROFESSIONS.items()}


@api.get("/rules")
def rules() -> dict:
    return knowledge.load_rules()


@api.get("/samples")
def samples() -> dict:
    return {
        key: {"label": _SAMPLE_LABELS.get(key, key), "customer": factory().model_dump(mode="json")}
        for key, factory in sample_data.ALL_SAMPLES.items()
    }


# --------------------------- auth --------------------------- #
@api.post("/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest) -> TokenResponse:
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    if store.get_user_by_email(email):
        raise HTTPException(status_code=409, detail="That email is already registered")
    prof = req.profession if professions.is_valid(req.profession) else professions.DEFAULT_PROFESSION
    user = store.create_user(email, auth.hash_password(req.password), prof, req.firm_name)
    user = auth.sync_admin_flag(user)
    return TokenResponse(token=auth.create_token(user["id"]), user=_public(user))


@api.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest) -> TokenResponse:
    user = store.get_user_by_email(req.email)
    if user is None or not auth.verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = auth.sync_admin_flag(user)
    return TokenResponse(token=auth.create_token(user["id"]), user=_public(user))


@api.get("/auth/me", response_model=UserPublic)
def me(user: dict = Depends(auth.get_current_user)) -> UserPublic:
    return _public(user)


# --------------------------- protected: assessments --------------------------- #
@api.post("/cdd", response_model=CDDRecord)
def cdd(customer: Customer, background: BackgroundTasks, user: dict = Depends(auth.get_current_user)) -> CDDRecord:
    record = cdd_agent.assess_customer(customer, user["profession"])
    return _persist(record, user, background)


@api.get("/stats")
def stats(user: dict = Depends(auth.get_current_user)) -> dict:
    return store.stats(user["id"])


@api.get("/reviews")
def reviews(user: dict = Depends(auth.get_current_user)) -> list[dict]:
    return store.reviews_due(user["id"])


@api.get("/stats/timeseries")
def stats_timeseries(days: int = 30, user: dict = Depends(auth.get_current_user)) -> list[dict]:
    return store.timeseries(user["id"], days=max(7, min(days, 90)))


@api.get("/stats/top_rules")
def stats_top_rules(limit: int = 8, user: dict = Depends(auth.get_current_user)) -> list[dict]:
    return store.top_rules(user["id"], limit=max(1, min(limit, 25)))


@api.get("/stats/reviews_timeline")
def stats_reviews_timeline(weeks: int = 12, user: dict = Depends(auth.get_current_user)) -> list[dict]:
    return store.reviews_timeline(user["id"], weeks=max(1, min(weeks, 52)))


@api.get("/records/lookup")
def records_lookup(
    name: str | None = None, external_ref: str | None = None,
    user: dict = Depends(auth.get_current_user),
) -> list[dict]:
    return store.lookup_records(user["id"], name=name, external_ref=external_ref)


@api.get("/audit")
def audit(user: dict = Depends(auth.get_current_user)) -> list[dict]:
    return store.list_events(user["id"])


@api.get("/records")
def records(
    user: dict = Depends(auth.get_current_user),
    q: str | None = None,
    rating: str | None = None,
    external_ref: str | None = None,
) -> list[dict]:
    return store.list_records(user["id"], q=q, rating=rating, external_ref=external_ref)


@api.get("/records/{record_id}", response_model=CDDRecord)
def record_detail(record_id: str, user: dict = Depends(auth.get_current_user)) -> CDDRecord:
    rec = store.get_record(record_id, user["id"])
    if rec is None:
        raise HTTPException(status_code=404, detail="record not found")
    return rec


class SMRBody(BaseModel):
    scenario: str | None = None


@api.post("/records/{record_id}/smr", response_model=SMR)
def record_smr(record_id: str, body: SMRBody | None = None, user: dict = Depends(auth.get_current_user)) -> SMR:
    rec = store.get_record(record_id, user["id"])
    if rec is None:
        raise HTTPException(status_code=404, detail="record not found")
    scenario = (body.scenario if body and body.scenario else None) or rec.customer.notes \
        or "See customer notes and screening results."
    smr = smr_agent.draft_smr(rec.customer, scenario, user["profession"])
    store.save_smr(record_id, smr)
    store.log_event(
        user["id"], "smr.drafted",
        detail=f"{rec.customer.name} · {'recommended' if smr.recommended else 'not recommended'}",
        record_id=record_id,
    )
    return smr


@api.get("/records/{record_id}/smr", response_model=SMR)
def record_smr_get(record_id: str, user: dict = Depends(auth.get_current_user)) -> SMR:
    if store.get_record(record_id, user["id"]) is None:
        raise HTTPException(status_code=404, detail="record not found")
    smr = store.get_smr(record_id)
    if smr is None:
        raise HTTPException(status_code=404, detail="no SMR for this record")
    return smr


@api.post("/records/{record_id}/reassess", response_model=CDDRecord)
def record_reassess(
    record_id: str, background: BackgroundTasks, user: dict = Depends(auth.get_current_user),
) -> CDDRecord:
    """Run a fresh assessment for an existing customer. The prior record is left untouched
    (immutable, retained 7 years); a new dated record supersedes it for monitoring purposes."""
    prior = store.get_record(record_id, user["id"])
    if prior is None:
        raise HTTPException(status_code=404, detail="record not found")
    record = cdd_agent.assess_customer(prior.customer, user["profession"])
    return _persist(
        record, user, background, action="review.completed",
        detail=f"{record.customer.name} · {record.risk_assessment.rating.value} · supersedes {record_id[:8]}",
    )


@api.get("/records/{record_id}/audit")
def record_audit(record_id: str, user: dict = Depends(auth.get_current_user)) -> list[dict]:
    if store.get_record(record_id, user["id"]) is None:
        raise HTTPException(status_code=404, detail="record not found")
    return store.list_events(user["id"], record_id=record_id)


@api.get("/records/{record_id}/history")
def record_history(record_id: str, user: dict = Depends(auth.get_current_user)) -> list[dict]:
    """Every dated assessment for the same customer, newest first."""
    if store.get_record(record_id, user["id"]) is None:
        raise HTTPException(status_code=404, detail="record not found")
    return store.customer_history(user["id"], record_id)


@api.get("/records/{record_id}/pdf")
def record_pdf(record_id: str, user: dict = Depends(auth.get_current_user)) -> Response:
    rec = store.get_record(record_id, user["id"])
    if rec is None:
        raise HTTPException(status_code=404, detail="record not found")
    data = pdf.record_to_pdf(rec, store.get_smr(record_id))
    safe = "".join(ch for ch in rec.customer.name if ch.isalnum() or ch in " -_")[:40].strip() or "record"
    return Response(
        content=data, media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="CDD_{safe}.pdf"'},
    )


# --------------------------- API keys (for integrations) --------------------------- #
@api.post("/keys", response_model=ApiKeyCreated)
def create_key(req: ApiKeyCreateRequest, user: dict = Depends(auth.get_current_user)) -> ApiKeyCreated:
    key, key_hash, prefix = auth.generate_api_key()
    meta = store.create_api_key(user["id"], req.name, key_hash, prefix)
    store.log_event(user["id"], "apikey.created", detail=req.name)
    return ApiKeyCreated(key=key, **meta)


@api.get("/keys", response_model=list[ApiKeyInfo])
def list_keys(user: dict = Depends(auth.get_current_user)) -> list[ApiKeyInfo]:
    return [ApiKeyInfo(**k) for k in store.list_api_keys(user["id"])]


@api.delete("/keys/{key_id}")
def revoke_key(key_id: str, user: dict = Depends(auth.get_current_user)) -> dict:
    if not store.delete_api_key(key_id, user["id"]):
        raise HTTPException(status_code=404, detail="key not found")
    store.log_event(user["id"], "apikey.revoked", detail=key_id[:8])
    return {"ok": True}


# --------------------------- integrations / connectors --------------------------- #
@api.get("/integrations")
def list_integrations() -> list[dict]:
    return connectors.all_meta()


@api.post("/integrations/{provider}/assess", response_model=CDDRecord)
def integration_assess(
    provider: str, background: BackgroundTasks, payload: dict = Body(...),
    user: dict = Depends(auth.get_current_user),
) -> CDDRecord:
    connector = connectors.get(provider)
    if connector is None:
        raise HTTPException(status_code=404, detail=f"unknown connector '{provider}'")
    record = cdd_agent.assess_customer(connector.to_customer(payload), user["profession"])
    return _persist(record, user, background)


@api.post("/integrations/{provider}/import")
def integration_import(
    provider: str, background: BackgroundTasks, payloads: list[dict] = Body(...),
    user: dict = Depends(auth.get_current_user),
) -> dict:
    connector = connectors.get(provider)
    if connector is None:
        raise HTTPException(status_code=404, detail=f"unknown connector '{provider}'")
    results = []
    for p in payloads:
        customer = connector.to_customer(p)
        record = cdd_agent.assess_customer(customer, user["profession"])
        _persist(record, user, background)
        results.append({
            "record_id": record.record_id, "name": customer.name,
            "rating": record.risk_assessment.rating.value, "external_ref": customer.external_ref,
        })
    return {"assessed": len(results), "results": results}


# --------------------------- outbound webhooks --------------------------- #
@api.get("/webhook")
def get_webhook(user: dict = Depends(auth.get_current_user)) -> dict:
    wh = store.get_webhook(user["id"])
    return {"url": wh["url"], "created_at": wh["created_at"]} if wh else {}


@api.put("/webhook", response_model=WebhookCreated)
def set_webhook(req: WebhookSetRequest, user: dict = Depends(auth.get_current_user)) -> WebhookCreated:
    secret = "whsec_" + secrets.token_urlsafe(24)
    meta = store.set_webhook(user["id"], req.url, secret)
    store.log_event(user["id"], "webhook.set", detail=req.url)
    return WebhookCreated(url=req.url, created_at=meta["created_at"], secret=secret)


@api.delete("/webhook")
def delete_webhook(user: dict = Depends(auth.get_current_user)) -> dict:
    store.delete_webhook(user["id"])
    store.log_event(user["id"], "webhook.removed")
    return {"ok": True}


@api.post("/webhook/test")
def test_webhook(user: dict = Depends(auth.get_current_user)) -> dict:
    return webhooks.deliver(user["id"], "test", {"message": "Cleared webhook test"})


# --------------------------- review reminders --------------------------- #
@api.post("/reminders/preview")
def reminders_preview(user: dict = Depends(auth.get_current_user)) -> dict:
    digest = reminders.preview_for(user)
    return digest or {"empty": True}


@api.post("/reminders/send")
def reminders_send(user: dict = Depends(auth.get_current_user)) -> dict:
    return reminders.send_for(user)


# --------------------------- public beta signup --------------------------- #
@api.post("/beta-signup")
def beta_signup(req: BetaSignupRequest) -> dict:
    email = req.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    store.save_beta_signup(email, req.name, req.firm, req.profession, req.message)
    return {"ok": True}


# --------------------------- admin (operator-only) --------------------------- #
@api.get("/admin/overview")
def admin_overview(_admin: dict = Depends(auth.get_admin_user)) -> dict:
    return store.admin_overview()


@api.get("/admin/users")
def admin_users(_admin: dict = Depends(auth.get_admin_user)) -> list[dict]:
    return store.admin_list_users()


@api.get("/admin/signups")
def admin_signups(
    include_archived: bool = False, _admin: dict = Depends(auth.get_admin_user),
) -> list[dict]:
    return store.admin_list_signups(include_archived=include_archived)


@api.post("/admin/signups/{signup_id}/contact")
def admin_mark_contacted(signup_id: str, _admin: dict = Depends(auth.get_admin_user)) -> dict:
    if not store.admin_mark_signup_contacted(signup_id):
        raise HTTPException(status_code=404, detail="signup not found or already contacted")
    return {"ok": True}


@api.post("/admin/signups/{signup_id}/archive")
def admin_archive(signup_id: str, _admin: dict = Depends(auth.get_admin_user)) -> dict:
    if not store.admin_archive_signup(signup_id):
        raise HTTPException(status_code=404, detail="signup not found")
    return {"ok": True}


@api.get("/admin/audit")
def admin_audit(limit: int = 50, _admin: dict = Depends(auth.get_admin_user)) -> list[dict]:
    return store.admin_recent_audit(limit=max(1, min(limit, 500)))


app.include_router(api)

# Serve the built Vite frontend. Static assets under /assets; everything else -> SPA index.
if (DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")


_PUBLIC_PAGES = (
    "/", "/pricing", "/about", "/contact", "/security", "/privacy", "/terms",
    "/changelog", "/demo", "/login", "/register",
)


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap() -> Response:
    base = "https://cleared.com.au"
    urls = "".join(f"  <url><loc>{base}{p}</loc></url>\n" for p in _PUBLIC_PAGES)
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}</urlset>\n"
    )
    return Response(body, media_type="application/xml")


@app.get("/robots.txt", include_in_schema=False)
def robots() -> Response:
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /dashboard\n"
        "Disallow: /records\n"
        "Disallow: /settings\n"
        "Disallow: /admin\n"
        "Sitemap: /sitemap.xml\n"
    )
    return Response(body, media_type="text/plain")


@app.get("/{full_path:path}", include_in_schema=False)
def spa(full_path: str) -> Response:
    index = DIST_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return Response(
        "Frontend not built. Run:  cd frontend && npm install && npm run build",
        media_type="text/plain", status_code=503,
    )
