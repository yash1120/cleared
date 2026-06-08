import { AlertTriangle, Database, FileLock2, Globe2, KeyRound, ScrollText, ServerCog, ShieldCheck } from 'lucide-react'
import { Card, Kicker, Pill } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const POSTURE = [
  {
    icon: Database,
    title: 'Data residency in Australia',
    body: 'Customer records are designed to be stored on Australian infrastructure (production deployment to ap-southeast-2). The self-hosted edition keeps everything inside your own VPC.',
  },
  {
    icon: KeyRound,
    title: 'Hashed credentials, scoped API keys',
    body: 'Passwords are stored with PBKDF2-HMAC-SHA256 (200,000 iterations). API keys are stored only as SHA-256 hashes; the original key is shown once and never recoverable.',
  },
  {
    icon: FileLock2,
    title: 'Per-user record isolation',
    body: 'Every record carries a user_id and is filtered server-side on every query — there is no path in the API that returns a record across tenants.',
  },
  {
    icon: ScrollText,
    title: 'Append-only audit trail',
    body: 'Every material action — assessment, re-assessment, SMR draft, key creation, webhook change — writes an immutable audit_event with a user_id, timestamp, and human-readable detail.',
  },
  {
    icon: ServerCog,
    title: 'Signed outbound webhooks',
    body: 'Every webhook payload is signed with HMAC-SHA256 using a per-tenant secret shown once. Receivers should verify the X-Cleared-Signature header before trusting the body.',
  },
  {
    icon: Globe2,
    title: 'Defence-in-depth on screening',
    body: 'Sanctions/PEP screening uses OpenSanctions (or your own provider). Hits are surfaced verbatim with a score so a human can adjudicate — we never auto-clear a match.',
  },
]

const RETENTION = [
  ['CDD records', '7 years from creation', 'AML/CTF Act record-keeping requirement.'],
  ['SMR drafts', '7 years from creation', 'Same retention as the underlying assessment.'],
  ['Audit events', '7 years from event', 'Maintains a complete operational log.'],
  ['Beta-signup contacts', 'Until you ask us to delete', 'Marketing-only — never shared.'],
]

export default function Security() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <Reveal>
        <Kicker>Security & compliance</Kicker>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Built for a workflow a regulator will read.
        </h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-400">
          Cleared is the system of record for your AML/CTF program — so the security posture has to match. The product
          is engineered around the AUSTRAC framework, and the audit-safety properties below are baked into the data model,
          not added on top.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone="accent">AUSTRAC-aligned</Pill>
          <Pill>AML/CTF Act 2006</Pill>
          <Pill>7-year retention</Pill>
          <Pill>Append-only audit log</Pill>
        </div>
      </Reveal>

      <section className="mt-12">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight">Security posture</h2>
        </Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {POSTURE.map((p, i) => (
            <Reveal key={p.title} delay={i * 60}>
              <Card className="h-full p-5 lift">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{p.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight">Data retention</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            The AML/CTF Act mandates seven-year retention of customer-due-diligence records and reports. We retain by default and
            never silently delete — a record's <code className="font-mono text-xs">retain_until</code> field is populated on save.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <Card className="mt-6 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Data class</th>
                  <th className="px-4 py-3 font-medium">Retained for</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {RETENTION.map(([k, t, n]) => (
                  <tr key={k}>
                    <td className="px-4 py-3 font-medium">{k}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Reveal>
      </section>

      <section className="mt-14">
        <Reveal>
          <Card className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Responsible disclosure</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Found a vulnerability or a data-handling concern? Email us at <span className="font-mono">security@cleared.com.au</span>{' '}
                  with reproduction steps. We'll acknowledge within 48 hours and treat reports in good faith — no surprise legal threats,
                  ever. We do not currently run a paid bug bounty, but credit will be given (with your permission).
                </p>
              </div>
            </div>
          </Card>
        </Reveal>
      </section>

      <Reveal delay={80}>
        <p className="mt-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          Cleared is currently in beta. The AUSTRAC rule pack shipped with the product is an MVP subset; firms in production should
          have a legal practitioner verify the pack against the AML/CTF Act 2006 and current AUSTRAC guidance before relying on it
          for a real assessment.
        </p>
      </Reveal>
    </div>
  )
}
