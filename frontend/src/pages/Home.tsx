import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Building2, Check, Database, FileText, Layers, Scale, Search, ShieldCheck, Users,
} from 'lucide-react'
import { api } from '../api'
import { Button, Card, Field, Kicker, Pill, RatingBadge, RuleChip, inputCls } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const stats: [string, string][] = [
  ['1 Jul 2026', 'Obligations begin'],
  ['80,000+', 'Newly captured businesses'],
  ['Up to $33M', 'Maximum penalties'],
  ['Every decision', 'Cited to a rule'],
]

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="h-full p-5 lift">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
        {icon}
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
    </Card>
  )
}

function BetaSignup() {
  const [form, setForm] = useState({ email: '', firm: '', profession: 'real_estate', message: '' })
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('busy'); setErrorMsg(null)
    try {
      await api.betaSignup({
        email: form.email, firm: form.firm || undefined,
        profession: form.profession, message: form.message || undefined,
      })
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit — try again.')
    }
  }

  if (status === 'ok') {
    return (
      <Card className="p-10 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        <h2 className="mt-3 text-2xl font-bold tracking-tight">You're on the list.</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          Thanks — we'll reach out to <span className="font-medium text-slate-800 dark:text-slate-200">{form.email}</span> as Cleared opens to early customers.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <Kicker>Limited beta</Kicker>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Be ready before 1 July 2026.</h2>
          <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
            We're onboarding a small group of agencies, accountants and conveyancers ahead of Tranche 2 going live.
            Tell us about your firm and we'll be in touch with access and a tailored walk-through.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/demo"><Button variant="secondary">Run a sample first <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/pricing" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">See pricing</Link>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Work email">
            <input className={inputCls} type="email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@firm.com.au" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Firm">
              <input className={inputCls} value={form.firm}
                onChange={(e) => setForm((f) => ({ ...f, firm: e.target.value }))}
                placeholder="Acme Realty" />
            </Field>
            <Field label="You are">
              <select className={inputCls} value={form.profession}
                onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}>
                <option value="real_estate">Real estate</option>
                <option value="accounting">Accounting</option>
                <option value="legal">Legal / conveyancing</option>
                <option value="precious_metals">Precious metals</option>
                <option value="tcsp">Trust / company services</option>
              </select>
            </Field>
          </div>
          <Field label="Anything we should know? (optional)">
            <textarea rows={2} className={inputCls} value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Volume per month, biggest worry, current setup…" />
          </Field>
          {status === 'error' && errorMsg && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}
          <Button type="submit" disabled={status === 'busy' || !form.email}>
            {status === 'busy' ? 'Sending…' : <>Request beta access <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            We'll only use this to set up your beta access. No marketing list.
          </p>
        </form>
      </div>
    </Card>
  )
}

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:pt-20">
        <Reveal as="div" className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Kicker>AUSTRAC Tranche 2 · obligations live 1 July 2026</Kicker>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              AML compliance for AUSTRAC Tranche 2, done on every client.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Cleared screens your customer, assesses money-laundering risk, and produces an audit-ready record where{' '}
              <span className="font-medium text-slate-900 dark:text-slate-200">every decision is cited to a rule</span> — and
              drafts your suspicious-matter reports. When AUSTRAC reviews you, you have documentation, not guesswork.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register"><Button>Get started <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/#how"><Button variant="secondary">How it works</Button></Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">For real estate, accounting, legal, conveyancing, precious-metal dealers and trust/company providers.</p>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Citadel Holdings Pty Ltd</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">company · purchaser · A$8,900,000</div>
              </div>
              <RatingBadge rating="high" />
            </div>
            <div className="mt-3 flex gap-2">
              <Pill tone="accent">Enhanced CDD: required</Pill>
              <Pill>SMR consideration: no</Pill>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ['Foreign PEP among beneficial owners', ['RE-PEP-01', 'RE-ECDD-01']],
                ['Opaque offshore ownership structure', ['RE-BO-01', 'RE-BO-02']],
              ].map(([f, ids], i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-sm font-medium">{f as string}</div>
                  <div className="mt-1.5 flex gap-1.5">{(ids as string[]).map((id) => <RuleChip key={id}>{id}</RuleChip>)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Audit check passed — every cited rule exists in the pack.
            </div>
          </Card>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <Reveal>
        <Card className="grid grid-cols-2 divide-x divide-y divide-slate-200 dark:divide-slate-800 lg:grid-cols-4 lg:divide-y-0">
          {stats.map(([n, l]) => (
            <div key={l} className="p-5">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{n}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{l}</div>
            </div>
          ))}
        </Card>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20">
        <Reveal>
          <SectionHead
            kicker="The problem"
            title="A regulatory wave you can't opt out of."
            sub="From 1 July 2026, real estate agents, accountants, lawyers, conveyancers and dealers become AML/CTF reporting entities under AUSTRAC's Tranche 2 reforms. The obligations are real, recurring, and enforced."
          />
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { icon: <Users className="h-5 w-5" />, title: 'No compliance team', body: "Most agencies have never been reporting entities. Suddenly they must run identity checks, screening and reporting — with no one whose job this is." },
            { icon: <Search className="h-5 w-5" />, title: 'CDD on every deal', body: 'Identity, beneficial ownership, sanctions and PEP screening, ongoing monitoring — required for each vendor or buyer, not once a year.' },
            { icon: <AlertTriangle className="h-5 w-5" />, title: 'Audit & penalty exposure', body: "A failed AUSTRAC review and penalties into the millions. The free 'setup' tools hand you a policy PDF, not the daily work." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <FeatureCard icon={f.icon} title={f.title} body={f.body} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20">
        <Reveal>
          <SectionHead kicker="The solution" title="An AI agent that does the compliance work." sub="Cleared isn't a template generator. It runs the actual due diligence on every customer in minutes and produces a defensible record you can stand behind." />
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              'Screens sanctions & PEP lists and resolves beneficial ownership for companies, trusts and SMSFs.',
              'Assesses ML/TF risk and rates it — grounded in the AUSTRAC rule pack, with a citation on every factor.',
              'Drafts Suspicious Matter Reports from the facts, and keeps an audit trail you can hand to a regulator.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-7"><Link to="/demo"><Button>Run a sample assessment <ArrowRight className="h-4 w-4" /></Button></Link></div>
        </Reveal>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20">
        <Reveal>
          <SectionHead kicker="How it works" title="Three steps, one minute, on every listing." />
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            [<Users className="h-5 w-5" />, 'Enter the customer', 'Individual, company, trust or SMSF — typed in or pulled from your CRM. Add the transaction and anything you noticed.'],
            [<Search className="h-5 w-5" />, 'Cleared screens & assesses', 'Sanctions/PEP screening, beneficial-ownership resolution, and a risk rating grounded in AUSTRAC rules.'],
            [<ShieldCheck className="h-5 w-5" />, 'Get an audit-ready record', 'A rated, cited, defensible record — with an SMR drafted when warranted, and kept for 7 years.'],
          ].map(([icon, title, body], i) => (
            <Reveal key={i} delay={i * 70}>
              <Card className="relative h-full p-6 lift">
                <div className="absolute right-4 top-3 text-4xl font-bold text-slate-100 dark:text-slate-800">{i + 1}</div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">{icon as ReactNode}</span>
                <h3 className="mt-4 font-semibold">{title as string}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body as string}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20">
        <Reveal>
          <SectionHead kicker="Why Cleared" title="The agent you can trust in a regulated workflow." />
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {[
            { icon: <ShieldCheck className="h-5 w-5" />, title: 'Citeable by design', body: 'Every risk factor cites a specific rule, and a built-in verifier rejects hallucinated citations. Defensible in an audit — not a black box.' },
            { icon: <Layers className="h-5 w-5" />, title: "Operate, don't just set up", body: 'The free tools win the one-time policy document. Cleared owns the recurring CDD and reporting you do on every deal.' },
            { icon: <Building2 className="h-5 w-5" />, title: 'Built for your desk', body: 'Real estate first — and the conveyancers, accountants and dealers the enterprise vendors never bothered to serve.' },
            { icon: <Scale className="h-5 w-5" />, title: 'Grounded in AUSTRAC', body: 'Built on the AML/CTF framework with onshore data residency in mind. The rules are explicit and inspectable.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <FeatureCard icon={f.icon} title={f.title} body={f.body} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20">
        <Reveal>
          <SectionHead kicker="Capabilities" title="Everything a Tranche-2 obligation needs." />
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[
            [<Search className="h-4 w-4" />, 'CDD automation'],
            [<Layers className="h-4 w-4" />, 'Beneficial ownership'],
            [<AlertTriangle className="h-4 w-4" />, 'Sanctions & PEP screening'],
            [<FileText className="h-4 w-4" />, 'SMR drafting'],
            [<ShieldCheck className="h-4 w-4" />, 'Citation verification'],
            [<Database className="h-4 w-4" />, 'Audit trail · 7-yr records'],
          ].map(([icon, label], i) => (
            <Reveal key={i} delay={i * 40}>
              <Card className="flex items-center gap-3 p-4 lift">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400">{icon as ReactNode}</span>
                <span className="text-sm font-medium">{label as string}</span>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <BetaSignup />
        </Reveal>
      </section>
    </>
  )
}
