import { Link } from 'react-router-dom'
import { Card, Kicker } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'The service',
    body: (
      <p>
        Cleared (the "Service") is an AML/CTF compliance assistant for Australian reporting entities under Tranche 2.
        It produces customer-due-diligence assessments, sanctions/PEP screening, suspicious-matter-report drafts and an
        immutable audit trail. The Service is provided by Cleared on a subscription basis, subject to these Terms and
        any signed order form between us.
      </p>
    ),
  },
  {
    title: 'Your account',
    body: (
      <p>
        You are responsible for the security of your account credentials and any API keys you create. We log every action
        a key takes against the audit trail of the owning account. Notify us immediately at <span className="font-mono">security@cleared.com.au</span>
        if you suspect a key has been compromised.
      </p>
    ),
  },
  {
    title: 'Your data, your obligation',
    body: (
      <>
        <p>
          Cleared assists you in producing AML/CTF compliance artefacts. It does not replace the human assessor.
          You remain the AUSTRAC reporting entity and you remain responsible for the assessments you submit, the
          customers you onboard, and the matters you report.
        </p>
        <p className="mt-3">
          The AUSTRAC rule pack shipped with the product is an MVP subset. Firms using Cleared in production should
          have a legal practitioner verify the pack against the AML/CTF Act 2006 and current AUSTRAC guidance.
        </p>
      </>
    ),
  },
  {
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="ml-5 mt-3 list-disc space-y-1.5">
          <li>Use the Service to launder money, finance terrorism, or otherwise break the law.</li>
          <li>Submit data on individuals you have no legitimate compliance reason to assess.</li>
          <li>Reverse-engineer or attempt to extract the rule pack or model behaviour for resale.</li>
          <li>Use the Service to provide AML/CTF advice to clients of a different reporting entity without their consent.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'No warranty on AI outputs',
    body: (
      <p>
        Risk assessments, rule citations and SMR drafts are produced by AI models with human-readable grounding. We
        verify cited rules against the pack and flag hallucinated IDs, but you must review every output before relying
        on it for a decision or filing. The Service is provided "as is"; we exclude implied warranties to the extent the
        Australian Consumer Law permits.
      </p>
    ),
  },
  {
    title: 'Fees',
    body: (
      <p>
        Subscription fees are described on the <Link to="/pricing" className="font-medium text-emerald-700 dark:text-emerald-400 link-underline">pricing page</Link>
        {' '}or in your order form. Fees are in AUD and exclude GST unless stated. We'll notify you at least 30 days before any price change.
      </p>
    ),
  },
  {
    title: 'Termination',
    body: (
      <p>
        Either party may terminate the subscription with 30 days' notice. We may suspend the Service immediately for
        material breach of these Terms. On termination, you retain the right to export your records (CSV + PDF) for 30 days,
        after which we close read access. Audit records are retained for the seven-year retention period regardless of
        subscription status.
      </p>
    ),
  },
  {
    title: 'Liability',
    body: (
      <p>
        To the extent permitted by law, our liability for any claim arising out of the Service is capped at the fees you
        paid in the twelve months preceding the claim. Neither party is liable for consequential or indirect loss.
      </p>
    ),
  },
  {
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the law of New South Wales, Australia. Disputes will be submitted to the courts of NSW.
      </p>
    ),
  },
]

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Reveal>
        <Kicker>Terms of service</Kicker>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">The rules of using Cleared.</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Last updated: 28 May 2026</p>
      </Reveal>

      <div className="mt-10 space-y-5">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.title} delay={i * 30}>
            <Card className="p-6">
              <h2 className="font-bold tracking-tight">{s.title}</h2>
              <div className="prose-sm mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{s.body}</div>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={80}>
        <p className="mt-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          These Terms are a working draft for our beta and not a substitute for a signed agreement. Talk to us before deploying Cleared
          for a regulated workflow and we'll put a real contract in front of you.
        </p>
      </Reveal>
    </div>
  )
}
