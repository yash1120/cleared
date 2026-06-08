# Cleared — audit-grade AML/CTF compliance for AUSTRAC Tranche 2

> An AI agent that runs customer due diligence on every customer and keeps a defensible record —
> so that when AUSTRAC reviews the firm, every risk decision is documented and grounded in a
> specific rule.

Built for Australia's **Tranche 2** AML/CTF reforms (core obligations commence **1 July 2026**),
which capture real estate agents, accountants, lawyers/conveyancers, precious-metal dealers and
trust/company service providers. Beachhead: **real estate agencies** — high CDD frequency,
demonstrably unprepared, and outside the practice-management bundlers' reach.

## Why this and not the dozen other "Tranche 2" tools

The crowded race is the one-time *AML program template*. Cleared owns the **recurring operational
layer** nobody else does: CDD on every customer + ongoing monitoring + SMR drafting + an immutable
audit trail. The differentiator is **grounding** — every risk factor cites a rule, a post-generation
verifier rejects hallucinated citations, and the audit log records every action. That's the thing a
regulated buyer can sign off on.

## What it does

### Core CDD workflow
- **Grounded CDD agent** — takes a customer (individual / company / trust / SMSF / partnership) and
  produces a structured `RiskAssessment`: rating, risk factors **each cited to an AUSTRAC rule ID**,
  recommended actions, enhanced-CDD + SMR flags.
- **Citation verifier** — checks every cited rule ID against the rule pack and flags hallucinations
  on the record (`citation_warnings`). This is the audit-safety guarantee.
- **Sanctions / PEP screening** — rapidfuzz against a sample list, with a clean
  [OpenSanctions](https://www.opensanctions.org/) seam (`CLEARED_OPENSANCTIONS_URL`).
- **SMR drafter** — turns a flagged scenario into a grounded Suspicious Matter Report narrative.
- **PDF export** — `fpdf2`-generated, latin-1 sanitised, ready for the audit file.

### Ongoing operations (the wedge)
- **Periodic reviews** with cadence by risk rating (unacceptable 30d / high 90d / medium 365d /
  low 730d). The dashboard surfaces what's due, what's overdue.
- **Re-assessment chain** — every re-assess creates a new dated, immutable record and links to its
  predecessor in the audit trail. Walk the full chain on the record page.
- **Immutable audit log** — every material action (assess, re-assess, SMR draft, key/webhook
  changes, reminder sent) writes an `audit_event` you can hand to the regulator.
- **Email reminders** — daily digest of overdue + due-soon reviews; mock unless SMTP is configured.
- **Customer-history lookup** — duplicate-warning on the demo form when you start to assess someone
  who already has a record (with a link to **Re-assess** instead).

### Multi-tenant, multi-profession, integration-friendly
- **Auth** — pbkdf2 + JWT for humans, `cak_…` API keys (SHA-256-only storage) for machines.
- **Multi-profession** — real estate, accounting, legal/conveyancing, precious metals, trust/company.
- **Connector framework** — Xero, MYOB, generic CRM; map a partner contact to a Cleared customer.
- **CSV bulk import / export**; **HMAC-SHA256-signed outbound webhooks**.

### UI
- React 18 + Vite + TypeScript + Tailwind. Light + dark theme.
- Marketing site: Home, Pricing, About, Contact, Security, Privacy, Terms, Changelog.
- App: Dashboard (KPIs + 3 charts), Records (with audit trail + history chain), Demo, Settings
  (integrations + reminders), Admin console (for `CLEARED_ADMIN_EMAILS` operators).
- Tasteful, dependency-free entrance animations (IntersectionObserver + CSS, respects
  `prefers-reduced-motion`).

## Stack

Python 3.11 · Anthropic SDK (`messages.parse`, rule-pack prompt-caching) · Claude **Sonnet 4.6**
for generation · Claude **Opus 4.7** as the eval judge · FastAPI · Pydantic v2 ·
pydantic-settings · SQLite (WAL) · rapidfuzz · fpdf2 · PyJWT · httpx · pytest. Frontend:
React 18 · Vite · TypeScript · Tailwind · react-router-dom · lucide-react. Zero chart-library
dependency — charts are hand-rolled SVG.

## Run it

```bash
cd cleared
python -m venv .venv && .venv\Scripts\activate   # Windows (PowerShell)
# source .venv/bin/activate                       # macOS / Linux
pip install -r requirements.txt

cd frontend && npm install && npm run build && cd ..

copy .env.example .env                            # then add ANTHROPIC_API_KEY + CLEARED_SECRET_KEY
# cp .env.example .env                            # macOS / Linux

python -m uvicorn cleared.api:app --reload --port 8000
# Open http://localhost:8000
```

### No API key? It runs offline.
Without `ANTHROPIC_API_KEY`, every assessment falls back to **mock mode** (canned/heuristic, still
routed through the same verifier + rendering pipeline). Force it explicitly with `CLEARED_MOCK=1`.

### Operator commands
```bash
python -m cleared.cli seed-admin you@yourdomain.com   # create / promote an admin
python -m cleared.cli info                             # snapshot: users / records / signups
python -m cleared.cli run-reminders                    # send overdue-review digests (cron this)
python -m cleared.cli export-signups signups.csv       # dump the beta inbox
```

### Tests
```bash
pip install -r requirements-dev.txt
python -m pytest tests/ -q
```

## Layout

```
cleared/
  cleared/
    rules/austrac_real_estate_rules.json   # grounding source
    settings.py            # env-driven config (CLEARED_*)
    models.py              # Customer, RiskAssessment, SMR, CDDRecord, auth/admin DTOs
    knowledge.py           # rule loader + valid-ID set for citation verification
    screening.py           # sanctions/PEP (sample list + OpenSanctions seam)
    llm.py                 # Anthropic wrapper: cached system + messages.parse
    cdd_agent.py / smr_agent.py
    auth.py                # pbkdf2 + JWT + API keys + admin guard
    store.py               # SQLite: users, records, smrs, audit, signups, webhooks, beta_signups
    api.py                 # FastAPI routes (under /api), serves the built SPA
    professions.py         # real estate / accounting / legal / dealers / TCSP
    connectors/            # xero, myob, generic
    webhooks.py            # signed delivery
    reminders.py           # digest builder + SMTP send (mock when unconfigured)
    pdf.py                 # audit-record PDF
    cli.py                 # operator CLI
    sample_data.py / demo.py
  eval/                    # citation-validity + Opus-as-judge scoreboard
  tests/                   # pytest (39+)
  frontend/                # Vite + React + TS + Tailwind app
  Dockerfile · GO-LIVE.md · INTEGRATIONS.md · .env.example
```

## Disclaimer

The rule pack is a condensed, paraphrased **MVP subset** for prototyping — **not legal advice**,
and rule IDs are internal references. Verify all obligations, dates and thresholds against the
AML/CTF Act 2006, the AML/CTF Rules, and current AUSTRAC guidance before any real-world use.
See `GO-LIVE.md` for the full production checklist.
