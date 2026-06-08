/**
 * Lightweight, dependency-free SVG charts for the Cleared dashboard.
 * All three share the same look: thin, monochrome (theme-aware), no axes furniture
 * beyond the start/end labels — these read as data sparks, not a chart-library showcase.
 */
import type { TimeseriesPoint, TopRule, WeekBucket } from '../types'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })

// --------------------------------------------------------------------------- //
// TimeSeriesArea — daily assessments over the trailing N days.
// --------------------------------------------------------------------------- //
export function TimeSeriesArea({ data, height = 120 }: { data: TimeseriesPoint[]; height?: number }) {
  const W = 600
  const H = height
  const PAD_T = 10
  const PAD_B = 22
  const innerH = H - PAD_T - PAD_B
  if (data.length === 0) return <EmptyChart height={H} label="No assessments yet" />
  const max = Math.max(1, ...data.map((d) => d.total))
  const step = data.length > 1 ? W / (data.length - 1) : 0
  const pts = data.map((d, i) => ({
    x: i * step,
    y: PAD_T + innerH * (1 - d.total / max),
  }))
  const line = 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
  const area = `${line} L${pts[pts.length - 1].x},${H - PAD_B} L${pts[0].x},${H - PAD_B} Z`
  const startLabel = fmtDate(data[0].date)
  const endLabel = fmtDate(data[data.length - 1].date)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-32 w-full overflow-visible">
      <defs>
        <linearGradient id="cs-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="text-emerald-500 dark:text-emerald-400">
        <path d={area} fill="url(#cs-area-grad)" />
        <path d={line} fill="none" strokeWidth="2" stroke="currentColor" vectorEffect="non-scaling-stroke" />
      </g>
      <text x={4} y={H - 6} className="fill-slate-400 text-[10px]" style={{ fontSize: 10 }}>{startLabel}</text>
      <text x={W - 4} y={H - 6} textAnchor="end" className="fill-slate-400 text-[10px]" style={{ fontSize: 10 }}>{endLabel}</text>
      <text x={W - 4} y={PAD_T + 4} textAnchor="end" className="fill-slate-400 text-[10px]" style={{ fontSize: 10 }}>peak {max}</text>
    </svg>
  )
}

// --------------------------------------------------------------------------- //
// RuleBars — horizontal leaderboard of the most-cited rule IDs.
// --------------------------------------------------------------------------- //
export function RuleBars({ items }: { items: TopRule[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No rules cited yet.</p>
  }
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.rule_id}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300">{it.rule_id}</span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">{it.count}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-[width]"
              style={{ width: `${(it.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// --------------------------------------------------------------------------- //
// WeekBars — reviews due bucketed by week for the next N weeks.
// --------------------------------------------------------------------------- //
export function WeekBars({ buckets, height = 130 }: { buckets: WeekBucket[]; height?: number }) {
  const W = 600
  const H = height
  const PAD_B = 22
  const PAD_T = 10
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const slot = W / Math.max(1, buckets.length)
  const barW = Math.max(6, slot * 0.55)
  const total = buckets.reduce((s, b) => s + b.count, 0)
  if (total === 0) return <EmptyChart height={H} label="No reviews scheduled in this window" />
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-32 w-full overflow-visible">
      {buckets.map((b, i) => {
        const x = i * slot + (slot - barW) / 2
        const h = (b.count / max) * (H - PAD_T - PAD_B)
        const y = H - PAD_B - h
        const overdue = b.overdue_count > 0
        const showLabel = i === 0 || i === buckets.length - 1 || i % 3 === 1
        return (
          <g key={b.week_start}>
            <rect
              x={x} y={y} width={barW} height={h || 0} rx="1.5"
              className={overdue ? 'fill-red-500' : 'fill-emerald-500/70 dark:fill-emerald-400/70'}
            />
            {showLabel && (
              <text x={x + barW / 2} y={H - 6} textAnchor="middle"
                className="fill-slate-400" style={{ fontSize: 10 }}>
                {fmtDate(b.week_start)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function EmptyChart({ height, label }: { height: number; label: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500"
      style={{ height }}
    >
      {label}
    </div>
  )
}
