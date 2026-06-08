import { Link } from 'react-router-dom'
import { Activity, BarChart3, Bell, GitBranch, History, KeyRound, Plug, ScrollText, ShieldCheck, Sparkles } from 'lucide-react'
import { Card, Kicker, Pill } from '../components/primitives'
import { Reveal } from '../components/Reveal'

type Entry = {
  version: string
  date: string
  title: string
  highlights: { icon: React.ComponentType<{ className?: string }>; label: string }[]
  body: React.ReactNode
}

const ENTRIES: Entry[] = [
  {
    version: 'v0.7',
    date: '28 May 2026',
    title: 'Company pages + sitewide animations',
    highlights: [
      { icon: Sparkles, label: 'Reveal on scroll' },
      { icon: ScrollText, label: 'About / Security / Privacy / Terms' },
    ],
    body: (
      <p>
        About, Contact, Security, Privacy, Terms and this Changelog are all live. A new <code className="font-mono text-xs">&lt;Reveal&gt;</code>
        {' '}component drives entrance animations across the marketing site using IntersectionObserver — no new dependencies, and motion
        is suppressed automatically when <code className="font-mono text-xs">prefers-reduced-motion</code> is set.
      </p>
    ),
  },
  {
    version: 'v0.6',
    date: '28 May 2026',
    title: 'Customer history · email reminders · beta signup',
    highlights: [
      { icon: GitBranch, label: 'Customer history chain' },
      { icon: Bell, label: 'Email reminder digests' },
      { icon: ShieldCheck, label: 'Public beta signup' },
    ],
    body: (
      <p>
        Each customer's chain of re-assessments now shows up on the record page so you can walk back through every dated assessment.
        Settings has an <em>Email reminders</em> card that previews and sends an overdue-review digest (mock-sends locally; configure
        SMTP in production via <code className="font-mono text-xs">CLEARED_SMTP_*</code>). The home page collects beta access requests
        directly into the database.
      </p>
    ),
  },
  {
    version: 'v0.5',
    date: '28 May 2026',
    title: 'Dashboard charts + duplicate-aware assessing',
    highlights: [
      { icon: BarChart3, label: 'Hand-rolled SVG charts' },
      { icon: ScrollText, label: 'Duplicate lookup on Demo' },
    ],
    body: (
      <p>
        The Dashboard now shows assessments-over-time (area chart), top cited rules (leaderboard), and a 12-week review schedule
        with overdue items in red. The Demo page debounces a lookup against your existing records and warns you before you create
        a duplicate dated assessment — pointing you at <em>Re-assess</em> instead.
      </p>
    ),
  },
  {
    version: 'v0.4',
    date: '28 May 2026',
    title: 'Ongoing monitoring + immutable audit trail',
    highlights: [
      { icon: History, label: 'Activity trail per record' },
      { icon: Activity, label: 'Periodic review cadence' },
    ],
    body: (
      <p>
        Every record now has a <code className="font-mono text-xs">review_due</code> date scaled by risk rating (high → 90 days,
        medium → 365, low → 730, unacceptable → 30). The new audit-events table captures every material action — assessment,
        re-assessment, SMR draft, key/webhook changes — with timestamps and detail, exposed through{' '}
        <code className="font-mono text-xs">/api/audit</code> and per-record audit endpoints.
      </p>
    ),
  },
  {
    version: 'v0.3',
    date: '28 May 2026',
    title: 'Outbound webhooks + CSV import/export + tests',
    highlights: [
      { icon: Plug, label: 'Signed webhook deliveries' },
      { icon: ScrollText, label: 'CSV bulk import & export' },
    ],
    body: (
      <p>
        Configurable outbound webhooks fire after each assessment, signed with HMAC-SHA256 and a per-tenant secret. Records can be
        bulk-imported from CSV (mapped through the generic connector) and the full records list exports back to CSV. The pytest
        suite now covers per-user isolation and the auth + connector flows.
      </p>
    ),
  },
  {
    version: 'v0.2',
    date: '28 May 2026',
    title: 'Auth, integrations & multi-profession',
    highlights: [
      { icon: KeyRound, label: 'JWT + scoped API keys' },
      { icon: Plug, label: 'Xero / MYOB / generic connectors' },
    ],
    body: (
      <p>
        Per-user accounts with JWT-backed sessions, scoped API keys for machine-to-machine integrations, and a connector framework
        that maps Xero, MYOB and generic CRM payloads into a Cleared customer for assessment. Adds support for accounting, legal,
        precious-metal and TCSP professions alongside real estate.
      </p>
    ),
  },
  {
    version: 'v0.1',
    date: '28 May 2026',
    title: 'First cut',
    highlights: [
      { icon: ShieldCheck, label: 'Grounded CDD + SMR' },
    ],
    body: (
      <p>
        The original release. Pydantic domain models, the AUSTRAC rule pack, an LLM-grounded CDD agent (with citation verification),
        sanctions/PEP screening, the SMR drafter, FastAPI, SQLite persistence with 7-year retention, and the marketing + demo site.
      </p>
    ),
  },
]

export default function Changelog() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Reveal>
        <Kicker>Changelog</Kicker>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">What shipped, when.</h1>
        <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
          A running log of what's new in Cleared. Subscribe to the email digest in <Link to="/settings" className="font-medium text-emerald-700 dark:text-emerald-400 link-underline">Settings</Link>{' '}
          if you're logged in.
        </p>
      </Reveal>

      <ol className="relative mt-10 space-y-6 border-l border-slate-200 pl-6 dark:border-slate-800">
        {ENTRIES.map((e, i) => (
          <Reveal key={e.version} as="li" delay={i * 50}>
            <span className="absolute -left-[7px] mt-1.5 grid h-3 w-3 place-items-center rounded-full bg-emerald-600 ring-4 ring-slate-50 dark:bg-emerald-400 dark:ring-slate-950"></span>
            <Card className="p-6 lift">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">{e.version}</span> · {e.title}
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">{e.date}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.highlights.map((h) => (
                  <Pill key={h.label}>
                    <h.icon className="mr-1 inline h-3 w-3 -translate-y-px" />
                    {h.label}
                  </Pill>
                ))}
              </div>
              <div className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{e.body}</div>
            </Card>
          </Reveal>
        ))}
      </ol>
    </div>
  )
}
