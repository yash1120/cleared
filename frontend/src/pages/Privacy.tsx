import { Link } from 'react-router-dom'
import { Card, Kicker } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <p>
          Cleared collects two distinct classes of data: information about <em>you</em> (the customer of Cleared) and information about your
          customers (data you submit so Cleared can assess them).
        </p>
        <ul className="ml-5 mt-3 list-disc space-y-1.5">
          <li><span className="font-medium">Your account:</span> email, hashed password, firm name, and the profession you selected.</li>
          <li><span className="font-medium">Operational data:</span> records, SMRs, API keys (stored only as a SHA-256 hash), webhook URLs and secrets, audit-event log.</li>
          <li><span className="font-medium">Customer data you submit:</span> the customer's name, entity type, identifiers (ABN/ACN), beneficial owners, transaction value, and any notes you add.</li>
          <li><span className="font-medium">Telemetry:</span> minimal — request method, path, and response status for operating the service. No third-party analytics.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    body: (
      <>
        <p>We use the data you submit only to:</p>
        <ul className="ml-5 mt-3 list-disc space-y-1.5">
          <li>Produce the assessments, screening results, SMR drafts and audit records you asked Cleared to produce.</li>
          <li>Deliver outbound webhooks to the URL you configured.</li>
          <li>Send review-reminder digests to your account email when you have overdue or due-soon reviews.</li>
          <li>Diagnose and fix bugs you report.</li>
        </ul>
        <p className="mt-3">We don't train models on your data. We don't sell or share your data with third parties.</p>
      </>
    ),
  },
  {
    id: 'who-can-see-it',
    title: 'Who can see your data',
    body: (
      <p>
        Records are scoped per user — there is no API path that returns data across tenants. Cleared engineers can access production
        data only when investigating a specific support request, and that access is logged. Subprocessors are limited to the cloud
        infrastructure provider and (if you enable it) your SMTP provider for review-reminder emails.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'Retention & deletion',
    body: (
      <p>
        CDD records, SMR drafts and audit events are retained for seven years to satisfy the AML/CTF Act. Account data is retained while
        your account is active. If you ask us to delete your account, we'll close it within 30 days and purge identifiable data on the
        seventh anniversary of the most recent record. The audit log is append-only — we don't redact historical entries.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <p>
        Australian users have rights under the Privacy Act 1988 to access, correct and (within retention obligations) request deletion
        of personal information we hold about them. Email <span className="font-mono">privacy@cleared.com.au</span> and we'll respond
        within 30 days.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        We'll publish material changes to this policy on the <Link to="/changelog" className="font-medium text-emerald-700 dark:text-emerald-400 link-underline">changelog</Link>
        {' '}with at least 14 days' notice before they take effect.
      </p>
    ),
  },
]

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Reveal>
        <Kicker>Privacy policy</Kicker>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">How we handle data.</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Last updated: 28 May 2026</p>
        <p className="mt-5 leading-relaxed text-slate-600 dark:text-slate-400">
          This is the plain-language version of how Cleared collects, uses and protects information. We aim to keep it short and accurate —
          if anything below is unclear, please email us at <span className="font-mono">privacy@cleared.com.au</span>.
        </p>
      </Reveal>

      <div className="mt-10 space-y-5">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.id} delay={i * 40}>
            <Card id={s.id} className="p-6 scroll-mt-24">
              <h2 className="font-bold tracking-tight">{s.title}</h2>
              <div className="prose-sm mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {s.body}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={80}>
        <p className="mt-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Cleared is currently in beta and operating in Australia. This policy describes our intent; if you are a customer with specific
          contractual privacy requirements, contact us and we'll work with you on a data-processing addendum.
        </p>
      </Reveal>
    </div>
  )
}
