import { Link } from 'react-router-dom'
import { ArrowRight, ScrollText, ShieldCheck, Target, Users } from 'lucide-react'
import { Button, Card, Kicker } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Citeable by default',
    body: "If we can't show you which rule a decision came from, the decision doesn't belong in your audit file. Every output Cleared produces is grounded in a specific AUSTRAC reference.",
  },
  {
    icon: Target,
    title: 'Operate, don’t just set up',
    body: 'Most AML tools sell you a one-time policy PDF. The hard part is the recurring work: every new customer, every change in risk, every periodic review. That’s where Cleared lives.',
  },
  {
    icon: Users,
    title: 'Built for the desk',
    body: 'Real estate agents, conveyancers, accountants — not enterprise compliance teams. The product earns its place when it slots into a working day, not the other way around.',
  },
  {
    icon: ScrollText,
    title: 'Honest about uncertainty',
    body: 'The model can be wrong. A real assessor stays in the loop. Cleared shows its work so the human reviewer can override anything that looks off — and that override gets recorded too.',
  },
]

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Reveal>
        <Kicker>About Cleared</Kicker>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          We're building the compliance teammate AUSTRAC Tranche 2 needs.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          From 1&nbsp;July&nbsp;2026, around 80,000 Australian businesses become AML/CTF reporting entities for the first time —
          real estate agencies, conveyancers, accountants, legal practitioners, precious-metal dealers, and trust and company services providers.
          Most of them don't have a compliance team. Most never expected to need one.
        </p>
        <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
          Cleared exists because the day-to-day work — identity checks, beneficial-ownership resolution, sanctions screening,
          risk assessment, suspicious-matter reports, and the seven-year audit trail behind all of it — was never going to be
          done well with a Word template. It needs to happen, on every customer, in minutes, with citations a regulator can follow.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <Card className="mt-10 p-6 sm:p-8">
          <Kicker>What we believe</Kicker>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Four principles that shape the product.</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {VALUES.map((v) => (
              <li key={v.title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <v.icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-semibold">{v.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{v.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            ['80,000+', 'Newly captured businesses'],
            ['1 Jul 2026', 'Obligations live'],
            ['Up to $33M', 'Maximum penalties'],
          ].map(([n, l]) => (
            <Card key={l} className="p-5 text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{n}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{l}</div>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal delay={160}>
        <Card className="mt-10 p-8 text-center">
          <h2 className="text-xl font-bold tracking-tight">Working with us</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            We're a small team operating ahead of the deadline. If you're a firm that wants Cleared in production by July, or a partner
            (CRM, conveyancing platform, accountancy network) we should integrate with, we'd like to hear from you.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/contact"><Button>Get in touch <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/demo"><Button variant="secondary">Run the live demo</Button></Link>
          </div>
        </Card>
      </Reveal>
    </div>
  )
}
