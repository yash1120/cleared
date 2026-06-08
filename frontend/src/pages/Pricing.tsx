import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button, Card, Kicker, cx } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const tiers: { name: string; sub: string; price: string; features: string[]; popular?: boolean }[] = [
  {
    name: 'Solo',
    sub: 'For sole agents & small offices',
    price: 'Contact',
    features: ['Up to 50 assessments / mo', 'CDD + screening + SMR drafting', 'Citation-verified records', 'Email support'],
  },
  {
    name: 'Team',
    sub: 'For growing agencies',
    price: 'Contact',
    popular: true,
    features: ['Up to 300 assessments / mo', 'Everything in Solo', 'Audit trail & 7-yr retention', 'CRM import', 'Priority support'],
  },
  {
    name: 'Agency',
    sub: 'For franchises & networks',
    price: 'Contact',
    features: ['Unlimited assessments', 'Everything in Team', 'Multi-office & roles', 'SSO & data-residency controls', 'Dedicated onboarding'],
  },
]

export default function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <Kicker>Pricing</Kicker>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Priced against the cost of getting it wrong.</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Compliance runs agencies $6k–$80k+ a year and the penalties reach $33M. Cleared is a fraction of that. Final
            pricing is set during the design-partner phase.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid items-start gap-5 md:grid-cols-3">
        {tiers.map((t, i) => (
          <Reveal key={t.name} delay={i * 80}>
          <Card className={cx('relative p-6 lift', t.popular && 'ring-2 ring-emerald-500')}>
            {t.popular && (
              <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Most popular
              </span>
            )}
            <div className="text-lg font-bold">{t.name}</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.sub}</div>
            <div className="mt-4 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{t.price}</div>
            <Link to="/demo" className="mt-4 block">
              <Button variant={t.popular ? 'primary' : 'secondary'} className="w-full">Book a walkthrough</Button>
            </Link>
            <ul className="mt-5 space-y-2">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
          </Card>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
