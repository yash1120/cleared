# Cleared

**Audit-grade AML/CTF compliance for AUSTRAC Tranche 2.**

> An AI agent that runs customer due diligence on every customer and keeps a defensible record —
> so that when AUSTRAC reviews the firm, every risk decision is documented and grounded in a
> specific rule.

[![python](https://img.shields.io/badge/python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![fastapi](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![react](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![claude](https://img.shields.io/badge/Claude-Sonnet%204.6%20%2F%20Opus%204.7-D97757)](https://www.anthropic.com/)
[![tests](https://img.shields.io/badge/tests-39%20passing-22c55e)](#tests)
[![licence](https://img.shields.io/badge/licence-proprietary-lightgrey)](#licence)
[![live demo](https://img.shields.io/badge/▶_live_demo-cleared--f25b.onrender.com-059669)](https://cleared-f25b.onrender.com)

---

## 🚀 Live demo

**→ [cleared-f25b.onrender.com](https://cleared-f25b.onrender.com)**

Sign in with the seeded demo account (it's also an admin, so you can see the operator console):

| | |
|---|---|
| **Email** | `demo@cleared.com.au` |
| **Password** | `demo1234` |

The demo runs in offline **mock mode** — assessments are instant and free, and the full product
surface works (dashboard, charts, records, audit trail, reminders, integrations, admin). It's
seeded with 15 assessments across every risk rating, a drafted SMR, overdue reviews, and a beta
inbox, so you land on a populated dashboard.

> ⏱️ **First load may take ~50 s.** The free Render tier sleeps after 15 minutes idle; the first
> request wakes it. Subsequent loads are instant.

---

## Why Cleared

From **1 July 2026**, Australia's *Tranche 2* AML/CTF reforms capture around **80,000 new
businesses** — real-estate agents, accountants, lawyers, conveyancers, precious-metal dealers,
and trust & company service providers — as **AUSTRAC reporting entities**. Most of them don't
have a compliance team. Penalties run to **A$33M** per breach.

The crowded market chases the one-time *AML program template*. **Cleared owns the recurring
operational layer that nobody else does:** CDD on every customer + ongoing monitoring + SMR
drafting + an immutable audit trail. The differentiator is **grounding** — every risk factor
cites a rule, a post-generation verifier rejects hallucinated citations, and every action lands
in an append-only audit log.

```
┌───────────────────────────────────────────────────────────────────┐
│ The wedge                                                         │
├───────────────────────────────────────────────────────────────────┤
│ Free tools     →  AML program PDF, generated once.                │
│ Enterprise     →  $80k+/yr, made for the big four.                │
│ Cleared        →  The daily work. CDD, SMR, audit. Every customer.│
└───────────────────────────────────────────────────────────────────┘
```

---

## Table of contents

- [Feature matrix](#feature-matrix)
- [Quick start](#quick-start)
- [Configuration (env vars)](#configuration-env-vars)
- [Architecture](#architecture)
- [Data model](#data-model)
- [API reference](#api-reference-selected)
- [Operator CLI](#operator-cli)
- [Tests](#tests)
- [Deployment](#deployment)
- [Production checklist](#production-checklist)
- [Roadmap](#roadmap)
- [Project layout](#project-layout)
- [Release history](#release-history)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

---

## Feature matrix

| Capability | Status | Notes |
|---|---|---|
| Grounded CDD agent | ✅ | Pydantic-typed; cites AUSTRAC rule IDs |
| Citation verifier | ✅ | Rejects hallucinated rule IDs at write time |
| SMR drafter | ✅ | Suspicious Matter Report narrative from the facts |
| Sanctions / PEP screening | ✅ | rapidfuzz + OpenSanctions seam |
| PDF export | ✅ | Audit-ready record; latin-1 sanitised |
| SQLite persistence | ✅ | WAL; per-user isolation; 7-year retention |
| Multi-profession | ✅ | Real estate · accounting · legal · dealers · TCSP |
| Auth (humans) | ✅ | pbkdf2 + JWT |
| Auth (machines) | ✅ | `cak_…` API keys, SHA-256 only stored |
| Connectors | ✅ | Xero · MYOB · generic CRM |
| CSV bulk import / export | ✅ | Generic-connector mapping |
| Outbound webhooks | ✅ | HMAC-SHA256-signed, per-tenant secret |
| Ongoing monitoring | ✅ | Review cadence by rating (30/90/365/730 days) |
| Re-assessment chain | ✅ | Newest record supersedes; full history on detail page |
| Audit trail | ✅ | Append-only; every material action |
| Dashboard analytics | ✅ | Hand-rolled SVG charts (no chart-lib dep) |
| Customer lookup / dedupe | ✅ | Duplicate-warning on the demo |
| Review-reminder digests | ✅ | SMTP send; mock when unconfigured |
| Beta-signup capture | ✅ | Public form + admin inbox |
| Admin console | ✅ | Cross-tenant read; `CLEARED_ADMIN_EMAILS` gate |
| Marketing site | ✅ | Home · Pricing · About · Contact · Security · Privacy · Terms · Changelog |
| Sitewide animations | ✅ | IntersectionObserver + CSS; honours `prefers-reduced-motion` |
| 404 page | ✅ | Branded, on-message |
| Sitemap + robots.txt | ✅ | Public pages indexed; app paths disallowed |
| OG / Twitter meta | ✅ | Indexed `index.html` |
| Operator CLI | ✅ | `seed-admin`, `info`, `run-reminders`, `export-signups` |
| Dockerfile | ✅ | Volume-mounted DB |
| Identity-verification provider | ❌ | Wire FrankieOne/GBG/Sumsub before live use |
| Stripe billing | ❌ | `/pricing` shows "Contact" tiers today |
| Password reset / refresh tokens | ❌ | Production hardening checklist item |
| Daily-reminder scheduler in-app | ❌ | Run `python -m cleared.cli run-reminders` from cron |

---

## Quick start

### Prerequisites
- **Python 3.11+**
- **Node 18+** (Vite frontend)
- *(Optional)* **Anthropic API key** — without it, every assessment runs in offline mock mode

### 60-second run

```powershell
# 1. Backend deps
cd F:\projects\cleared
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

# 2. Frontend build
cd frontend
npm install
npm run build
cd ..

# 3. Local config
copy .env.example .env             # then edit; the defaults are usable as-is

# 4. Run it
python -m uvicorn cleared.api:app --reload --port 8000
# Open http://localhost:8000
```

### First time setup

```powershell
# Bootstrap an operator account (interactive password prompt)
python -m cleared.cli seed-admin you@yourdomain.com

# Then set CLEARED_ADMIN_EMAILS=you@yourdomain.com in your env so the
# is_admin flag survives login (it syncs against this list on every request).
```

---

## Configuration (env vars)

All variables are prefixed `CLEARED_` and can also live in `.env`. Defaults are sensible for
local dev; flip the marked items for production.

| Variable | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | _unset_ | Without it the app auto-falls-back to mock mode |
| `CLEARED_MOCK` | `auto` | Force mock with `1`; force live with `0` |
| `CLEARED_GEN_MODEL` | `claude-sonnet-4-6` | Assessment generation model |
| `CLEARED_JUDGE_MODEL` | `claude-opus-4-7` | Eval judge (offline harness only) |
| `CLEARED_AGENT_VERSION` | `0.2.0` | Stamped on every record |
| `CLEARED_DB_PATH` | `./data/cleared.db` | SQLite path — back this up |
| `CLEARED_OPENSANCTIONS_URL` | _unset_ | Real sanctions provider URL |
| `CLEARED_OPENSANCTIONS_KEY` | _unset_ | Optional API key for hosted |
| `CLEARED_SECRET_KEY` | dev placeholder | **Set this in prod** — JWTs are signed with it |
| `CLEARED_TOKEN_TTL_HOURS` | `168` | JWT lifetime (7 days) |
| `CLEARED_ADMIN_EMAILS` | _unset_ | Comma-separated emails granted `is_admin` |
| `CLEARED_SMTP_HOST` | _unset_ | If unset, `/reminders/send` returns `mock: True` |
| `CLEARED_SMTP_PORT` | `587` | STARTTLS |
| `CLEARED_SMTP_USER` | _unset_ | |
| `CLEARED_SMTP_PASSWORD` | _unset_ | |
| `CLEARED_SMTP_FROM` | `cleared@localhost` | The `From:` header for reminder emails |

---

## Architecture

```
                ┌──────────────────────┐
                │   Browser SPA        │
                │ (Vite + React + TS)  │
                │ Tailwind · lucide    │
                └──────────┬───────────┘
                           │ JWT bearer  ·  /api/*
                ┌──────────▼───────────┐
                │      FastAPI         │
                │  api.py / auth.py    │
                └──────┬────────┬──────┘
                       │        │
              ┌────────▼──┐  ┌──▼─────────────┐
              │  Agents   │  │  Connectors    │
              │  cdd.py   │  │  xero · myob   │
              │  smr.py   │  │  generic CSV   │
              └────┬──────┘  └──────┬─────────┘
                   │                │
              ┌────▼───────┐  ┌─────▼─────────┐
              │ Anthropic  │  │  Webhooks     │
              │  SDK       │  │  (HMAC SHA256)│
              │  (cached)  │  └───────────────┘
              └────┬───────┘
                   │
              ┌────▼──────────────────────────┐
              │  SQLite (WAL, single file)    │
              │  users · records · smrs       │
              │  audit_events · webhooks      │
              │  beta_signups · api_keys      │
              └───────────────────────────────┘
```

Every assessment is **immutable**. A re-assess creates a *new* dated record that supersedes the
prior one in monitoring queries; both stay retained for seven years. The audit log is
append-only and is never redacted.

---

## Data model

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Account + admin flag | `id` (uuid), `email`, `password_hash` (pbkdf2), `profession`, `firm_name`, `is_admin` |
| `api_keys` | Machine credentials | `id`, `user_id`, `name`, `key_hash` (sha256 only), `prefix` |
| `records` | Every CDD assessment | `id`, `user_id`, `customer_name`, `entity_type`, `role`, `rating`, `external_ref`, `source`, `review_due`, `retain_until`, `record_json` |
| `smrs` | Suspicious Matter Report drafts | `record_id`, `smr_json` |
| `audit_events` | Append-only operational log | `id`, `user_id`, `record_id?`, `action`, `detail`, `at` |
| `webhooks` | One outbound endpoint per user | `user_id`, `url`, `secret` |
| `beta_signups` | Public-form leads | `id`, `email`, `name`, `firm`, `profession`, `message`, `contacted_at`, `archived_at` |

**Review cadence by rating** (set on save, used by the reviews-due query):

| Rating | Next review |
|---|---|
| unacceptable | 30 days |
| high | 90 days |
| medium | 365 days |
| low | 730 days |

---

## API reference (selected)

Public OpenAPI spec lives at `/docs` (Swagger UI) and `/openapi.json` when the server is running.

### Public
| Method | Path | Body / params | Returns |
|---|---|---|---|
| `GET` | `/api/health` | — | `{ status, mode, gen_model }` |
| `GET` | `/api/professions` | — | `{ key: label }` |
| `GET` | `/api/rules` | — | The AUSTRAC rule pack |
| `GET` | `/api/samples` | — | Canned customers for the demo |
| `POST` | `/api/auth/register` | `{ email, password, profession, firm_name? }` | `{ token, user }` |
| `POST` | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| `POST` | `/api/beta-signup` | `{ email, name?, firm?, profession?, message? }` | `{ ok: true }` |

### Authenticated (JWT or `X-API-Key`)
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/auth/me` | Includes `is_admin` |
| `POST` | `/api/cdd` | Run a full CDD on a `Customer` payload |
| `GET` | `/api/records` | Filter by `q`, `rating`, `external_ref` |
| `GET` | `/api/records/{id}` | Full record |
| `POST` | `/api/records/{id}/reassess` | Create a linked re-assessment |
| `GET` | `/api/records/{id}/audit` | Activity trail for that record |
| `GET` | `/api/records/{id}/history` | All assessments for the same customer |
| `POST` | `/api/records/{id}/smr` | Draft a Suspicious Matter Report |
| `GET` | `/api/records/{id}/pdf` | Audit PDF |
| `GET` | `/api/records/lookup?name=&external_ref=` | Duplicate-warning lookup |
| `GET` | `/api/reviews` | Customers with reviews due / overdue |
| `GET` | `/api/audit` | Account-wide audit feed |
| `GET` | `/api/stats` | KPIs |
| `GET` | `/api/stats/timeseries?days=` | Assessments-per-day series |
| `GET` | `/api/stats/top_rules?limit=` | Most-cited rule IDs |
| `GET` | `/api/stats/reviews_timeline?weeks=` | Next-N-weeks review schedule |
| `POST/GET/DELETE` | `/api/keys[/{id}]` | Manage API keys |
| `GET/PUT/DELETE` | `/api/webhook` | Manage the outbound webhook |
| `POST` | `/api/webhook/test` | Fire a signed test delivery |
| `POST` | `/api/reminders/preview` | Build the digest without sending |
| `POST` | `/api/reminders/send` | Build + send (mock when no SMTP) |
| `GET` | `/api/integrations` | Connector metadata |
| `POST` | `/api/integrations/{provider}/assess` | Assess a partner contact |
| `POST` | `/api/integrations/{provider}/import` | Bulk assess (CSV / array) |

### Admin (`is_admin` required)
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/admin/overview` | Totals + last-7-day deltas |
| `GET` | `/api/admin/users` | Cross-tenant user list |
| `GET` | `/api/admin/signups` | Beta inbox (`include_archived` opt-in) |
| `POST` | `/api/admin/signups/{id}/contact` | Mark contacted |
| `POST` | `/api/admin/signups/{id}/archive` | Hide from inbox |
| `GET` | `/api/admin/audit` | Cross-tenant audit feed |

### Webhook payload
Outbound deliveries arrive as `POST` with two headers and a JSON body:

```
Content-Type: application/json
X-Cleared-Signature: sha256=<hex(hmac_sha256(secret, body))>
```

Verify in your handler — never trust the body without comparing the signature.

```python
# Receiver-side verification (Python)
import hmac, hashlib
def verify(secret: str, body: bytes, header: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
```

---

## Operator CLI

```powershell
python -m cleared.cli seed-admin you@yourdomain.com
python -m cleared.cli info
python -m cleared.cli run-reminders
python -m cleared.cli export-signups signups.csv  # --include-archived to dump everything
```

A typical cron line for daily reminders:

```cron
0 8 * * * cd /opt/cleared && /opt/cleared/.venv/bin/python -m cleared.cli run-reminders >> /var/log/cleared/reminders.log 2>&1
```

On Windows, use Task Scheduler with the same command and the venv path.

---

## Tests

```powershell
pip install -r requirements-dev.txt
python -m pytest tests/ -q
```

The suite (~40 tests) covers per-user isolation, auth + connector flows, review cadence and
overdue logic, the audit log, history chains, dashboard chart shapes, the reminder digest
generator, beta-signup persistence + validation, and the admin guard (rejection on non-admin,
success on `CLEARED_ADMIN_EMAILS` match) including the full contact/archive lifecycle.

```
tests/
├── conftest.py                 # temp DB, mock mode, test secret
├── test_auth.py                # password hash, JWT roundtrip
├── test_store.py               # CRUD, per-user isolation
├── test_connectors.py          # xero/myob/generic mappers
├── test_api.py                 # health, register/login, /cdd, /pdf, /keys
└── test_reviews_audit.py       # reviews, audit, history, reminders, beta, admin
```

---

## Deployment

### Docker

```bash
docker build -t cleared .
docker run -d --name cleared -p 8000:8000 \
  -v cleared-data:/data \
  -e CLEARED_SECRET_KEY=$(openssl rand -hex 32) \
  -e CLEARED_ADMIN_EMAILS=you@yourdomain.com \
  -e CLEARED_SMTP_HOST=smtp.example.com \
  -e CLEARED_SMTP_USER=cleared@example.com \
  -e CLEARED_SMTP_PASSWORD=*** \
  -e CLEARED_SMTP_FROM=cleared@example.com \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  cleared
```

The image expects the frontend to be pre-built at `frontend/dist/`. Mount `/data` to a durable
volume — that's where the SQLite DB lives.

### Reverse proxy

Run behind a TLS-terminating reverse proxy (Caddy / nginx / Cloudflare). The app does not
terminate TLS itself. Sample Caddy snippet:

```caddyfile
cleared.yourdomain.com {
  reverse_proxy localhost:8000
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
```

---

## Production checklist

The short version of [`GO-LIVE.md`](./GO-LIVE.md):

1. **Generate** a strong `CLEARED_SECRET_KEY` and put it in your secrets manager.
2. **Have a lawyer review** the rule pack (`cleared/rules/austrac_real_estate_rules.json`) — the
   shipped pack is an MVP subset for prototyping.
3. **Enrol with AUSTRAC** as a reporting entity.
4. **Wire OpenSanctions** via `CLEARED_OPENSANCTIONS_URL` (and `_KEY` if using the hosted API).
5. **Integrate an ID-verification provider** (FrankieOne, GBG, Sumsub).
6. **Configure SMTP** so reminders actually send.
7. **Set `CLEARED_ADMIN_EMAILS`** to your operator emails.
8. **Host in `ap-southeast-2`** (or your own AU region) for data residency.
9. **Schedule** `cleared.cli run-reminders` as a daily job.
10. **Hardening** still on the road: httpOnly-cookie tokens, refresh tokens, email verification,
    password reset, rate limiting, per-firm team accounts with RBAC.

---

## Roadmap

**Soon**
- Stripe billing and proper tier enforcement (currently "Contact" on `/pricing`).
- Password reset + email verification + refresh tokens (production hardening).
- httpOnly cookie auth instead of localStorage-bearer.
- Per-firm team accounts with role-based access.
- Audit-pack export — bundle all records + SMRs + audit events for a customer as one PDF.

**Later**
- Computer-use review: have Claude operate the regulator portal where applicable.
- Federated identity-verification provider (FrankieOne / GBG / Sumsub).
- Mobile companion for on-site agent CDD.
- Postgres swap-in (just reimplement `cleared/store.py`).
- SIEM-style audit export to S3 with object lock.

---

## Project layout

```
cleared/
├── cleared/                  # Python package
│   ├── rules/
│   │   └── austrac_real_estate_rules.json
│   ├── connectors/
│   │   ├── __init__.py       # registry
│   │   ├── xero.py
│   │   ├── myob.py
│   │   └── generic_crm.py
│   ├── __init__.py
│   ├── settings.py           # CLEARED_* config + admin_email_set
│   ├── models.py             # Pydantic DTOs
│   ├── store.py              # SQLite — single source of persistence
│   ├── auth.py               # pbkdf2 + JWT + API keys + admin guard
│   ├── knowledge.py          # Rule loader + citation verifier
│   ├── screening.py          # Sanctions / PEP (rapidfuzz + OpenSanctions seam)
│   ├── llm.py                # Anthropic SDK wrapper (cached system prompt)
│   ├── mock.py               # Offline assessment fallback
│   ├── cdd_agent.py          # Customer → grounded RiskAssessment
│   ├── smr_agent.py          # Scenario → SMR narrative
│   ├── audit.py              # Record assembly + citation verification
│   ├── pdf.py                # fpdf2 audit-record PDF
│   ├── webhooks.py           # HMAC-signed delivery
│   ├── reminders.py          # Digest builder + SMTP send
│   ├── professions.py        # 5 profession contexts
│   ├── sanctions_sample.json # Demo screening list
│   ├── sample_data.py        # Demo customers
│   ├── api.py                # FastAPI routes + SPA host
│   ├── cli.py                # Operator CLI
│   ├── config.py             # Legacy re-export of settings
│   └── demo.py               # CLI demo
├── eval/
│   ├── cases.json
│   └── run_eval.py           # Citation validity + Opus-as-judge
├── tests/                    # pytest suite
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_store.py
│   ├── test_connectors.py
│   ├── test_api.py
│   └── test_reviews_audit.py
├── frontend/                 # Vite + React + TS SPA
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts
│       ├── auth.tsx
│       ├── theme.tsx
│       ├── types.ts
│       ├── index.css
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── primitives.tsx
│       │   ├── RecordView.tsx
│       │   ├── Reveal.tsx
│       │   ├── charts.tsx
│       │   ├── ProtectedRoute.tsx
│       │   └── AdminRoute.tsx
│       └── pages/
│           ├── Home.tsx
│           ├── Pricing.tsx
│           ├── About.tsx
│           ├── Contact.tsx
│           ├── Security.tsx
│           ├── Privacy.tsx
│           ├── Terms.tsx
│           ├── Changelog.tsx
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Dashboard.tsx
│           ├── Demo.tsx
│           ├── Records.tsx
│           ├── Settings.tsx
│           ├── Admin.tsx
│           └── NotFound.tsx
├── .env.example
├── .gitignore
├── Dockerfile
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
├── GO-LIVE.md
├── INTEGRATIONS.md
└── README.md   ← you are here
```

---

## Release history

In-app changelog lives at `/changelog`. Highlights:

| Version | What shipped |
|---|---|
| **v0.1** | Grounded CDD + SMR · rule pack · screening · FastAPI · SQLite · PDF export · marketing site |
| **v0.2** | Auth (JWT + API keys) · multi-profession · Xero/MYOB/generic connectors |
| **v0.3** | Outbound webhooks · CSV bulk import / export · pytest suite |
| **v0.4** | Ongoing monitoring · review cadence · immutable audit trail |
| **v0.5** | Dashboard charts (timeseries / top rules / weekly reviews) · duplicate-aware assessing |
| **v0.6** | Customer history chain · email-reminder digests · public beta-signup form |
| **v0.7** | About / Contact / Security / Privacy / Terms / Changelog · sitewide animations |
| **v0.8** | Admin console · `CLEARED_ADMIN_EMAILS` · cross-tenant overview / users / signups inbox / audit feed |
| **v0.9** | Operator CLI · 404 page · SEO meta + sitemap / robots · Dashboard onboarding · docs refresh |

---

## Contributing

This is currently a closed-source pre-revenue project. If you're at a Tranche-2 firm or a
partner platform (CRM, conveyancing, accounting), email **hello@cleared.com.au** and we'll talk.
Security disclosures go to **security@cleared.com.au** — see the `/security` page on the
running app for our responsible-disclosure policy.

---

## Licence

Proprietary. All rights reserved. The AUSTRAC rule references in
`cleared/rules/austrac_real_estate_rules.json` are paraphrased from publicly-available
guidance and are not the law.

---

## Disclaimer

Cleared is software, not legal advice. The rule pack is a paraphrased **MVP subset** for
prototyping — rule IDs are internal references. Verify all obligations, dates and thresholds
against the **AML/CTF Act 2006**, the **AML/CTF Rules**, and current AUSTRAC guidance before
relying on Cleared for a real assessment. A reporting entity always remains responsible for
its own AML/CTF program.
