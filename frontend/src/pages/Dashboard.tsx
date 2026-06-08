import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, CalendarClock, FileText, Plug, Rocket, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth'
import type { RecordSummary, ReviewItem, RiskRating, Stats, TimeseriesPoint, TopRule, WeekBucket } from '../types'
import { Button, Card, Pill, RatingBadge } from '../components/primitives'
import { RuleBars, TimeSeriesArea, WeekBars } from '../components/charts'

const RATINGS: RiskRating[] = ['low', 'medium', 'high', 'unacceptable']
const BAR: Record<RiskRating, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  unacceptable: 'bg-red-500',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecordSummary[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [series, setSeries] = useState<TimeseriesPoint[]>([])
  const [rules, setRules] = useState<TopRule[]>([])
  const [weeks, setWeeks] = useState<WeekBucket[]>([])

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
    api.records().then((r) => setRecent(r.slice(0, 6))).catch(() => {})
    api.reviews().then(setReviews).catch(() => {})
    api.timeseries(30).then(setSeries).catch(() => {})
    api.topRules(6).then(setRules).catch(() => {})
    api.reviewsTimeline(12).then(setWeeks).catch(() => {})
  }, [])

  const total = stats?.records ?? 0
  const overdue = stats?.overdue ?? 0
  const kpis = [
    { label: 'Assessments', value: total, sub: null as string | null },
    { label: 'High / unacceptable', value: (stats?.by_rating?.high ?? 0) + (stats?.by_rating?.unacceptable ?? 0), sub: null },
    { label: 'SMRs flagged', value: stats?.smr_flagged ?? 0, sub: null },
    { label: 'Reviews due', value: stats?.reviews_due ?? 0, sub: overdue > 0 ? `${overdue} overdue` : null },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.firm_name || user?.email}</p>
        </div>
        <Link to="/demo"><Button>New assessment <ArrowRight className="h-4 w-4" /></Button></Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="text-3xl font-bold tabular-nums">{k.value}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{k.label}</span>
              {k.sub && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">{k.sub}</span>}
            </div>
          </Card>
        ))}
      </div>

      {total === 0 && (
        <Card className="mt-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Rocket className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight">Get your first assessment on the audit trail.</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Cleared comes alive once it has data. Three quick paths:
              </p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  { to: '/demo', label: 'Run a sample assessment', sub: 'Try one of the canned customers — 60 seconds.' },
                  { to: '/settings', label: 'Connect a system', sub: 'Push contacts from Xero/MYOB or import a CSV.' },
                  { to: '/settings', label: 'Generate an API key', sub: 'Drop assessments in from your own backend.' },
                ].map((s, i) => (
                  <li key={s.label}>
                    <Link to={s.to} className="block h-full rounded-lg border border-slate-200 p-3 transition-colors hover:border-emerald-300 dark:border-slate-800 dark:hover:border-emerald-800">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="font-mono text-[10px] tabular-nums text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                        {s.label}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.sub}</p>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Assessments
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Last 30 days</span>
          </div>
          <div className="mt-4"><TimeSeriesArea data={series} /></div>
        </Card>
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Top cited rules</h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">All time</span>
          </div>
          <div className="mt-4"><RuleBars items={rules} /></div>
        </Card>
      </div>

      <Card className="mt-5 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Review schedule
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Next 12 weeks · red bars = overdue rolled into this week</span>
        </div>
        <div className="mt-4"><WeekBars buckets={weeks} /></div>
      </Card>

      {reviews.length > 0 && (
        <Card className="mt-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Reviews due
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Next 30 days</span>
          </div>
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
            {reviews.slice(0, 8).map((r) => {
              const due = new Date(r.review_due)
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.customer_name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Due {due.toLocaleDateString('en-AU')}
                    </div>
                  </div>
                  {r.overdue ? (
                    <Pill tone="accent">Overdue</Pill>
                  ) : (
                    <RatingBadge rating={r.rating} />
                  )}
                  <Link to={`/records?open=${r.id}`} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    Open
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <h2 className="font-semibold">Risk breakdown</h2>
          <div className="mt-4 space-y-3">
            {RATINGS.map((r) => {
              const n = stats?.by_rating?.[r] ?? 0
              const pct = total ? Math.round((n / total) * 100) : 0
              return (
                <div key={r}>
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{r}</span>
                    <span className="text-slate-500">{n}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-2 rounded-full ${BAR[r]}`} style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent assessments</h2>
            <Link to="/records" className="text-xs font-medium text-emerald-700 dark:text-emerald-400">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No assessments yet. <Link to="/demo" className="text-emerald-700 dark:text-emerald-400">Run your first</Link>.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.customer_name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {r.entity_type} · {new Date(r.created_at).toLocaleDateString('en-AU')}{r.source ? ` · ${r.source}` : ''}
                    </div>
                  </div>
                  <RatingBadge rating={r.rating} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { to: '/records', icon: <FileText className="h-5 w-5" />, label: 'All records' },
          { to: '/settings', icon: <Plug className="h-5 w-5" />, label: 'Integrations' },
          { to: '/demo', icon: <ShieldCheck className="h-5 w-5" />, label: 'New assessment' },
        ].map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="flex items-center gap-3 p-4 transition-colors hover:border-emerald-300 dark:hover:border-emerald-800">
              <span className="text-emerald-600 dark:text-emerald-400">{a.icon}</span>
              <span className="text-sm font-medium">{a.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
