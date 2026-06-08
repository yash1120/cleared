import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { RiskRating } from '../types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const card = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx(card, className)}>{children}</div>
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' }
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed'
const btnVariant = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
}
const btnSize = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: BtnProps) {
  return (
    <button className={cx(btnBase, btnVariant[variant], btnSize[size], className)} {...rest}>
      {children}
    </button>
  )
}

export function RuleChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
  }
  return <span className={cx('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</span>
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{children}</div>
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export const RATING_META: Record<RiskRating, { label: string; cls: string; bar: string }> = {
  low: {
    label: 'Low',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  medium: {
    label: 'Medium',
    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  high: {
    label: 'High',
    cls: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300',
    bar: 'bg-orange-500',
  },
  unacceptable: {
    label: 'Unacceptable',
    cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
    bar: 'bg-red-500',
  },
}

export function RatingBadge({ rating }: { rating: RiskRating }) {
  const m = RATING_META[rating]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold', m.cls)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', m.bar)} />
      {m.label}
    </span>
  )
}
