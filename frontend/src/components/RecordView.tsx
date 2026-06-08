import { AlertTriangle, ArrowDown, ArrowUp, Check, Download, FileText, GitBranch, History, RefreshCw, ShieldCheck } from 'lucide-react'
import type { AuditEvent, CDDRecord, LookupHit, SMR } from '../types'
import { api } from '../api'
import { Button, Card, Pill, RatingBadge, RuleChip, Spinner, cx } from './primitives'

const fmtAUD = (n?: number | null) => (n == null ? null : 'A$' + n.toLocaleString('en-AU'))

const ACTION_LABEL: Record<string, string> = {
  'assessment.created': 'Assessment created',
  'review.completed': 'Re-assessed',
  'smr.drafted': 'SMR drafted',
}

export default function RecordView({
  record,
  smr,
  onDraftSmr,
  smrLoading,
  onReassess,
  reassessing,
  events,
  history,
}: {
  record: CDDRecord
  smr: SMR | null
  onDraftSmr?: () => void
  smrLoading?: boolean
  onReassess?: () => void
  reassessing?: boolean
  events?: AuditEvent[]
  history?: LookupHit[]
}) {
  const a = record.risk_assessment
  const c = record.customer
  const passed = record.citation_warnings.length === 0
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{c.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {c.entity_type} · {c.role}
            {fmtAUD(c.transaction_value_aud) ? ` · ${fmtAUD(c.transaction_value_aud)}` : ''}
          </p>
        </div>
        <RatingBadge rating={a.rating} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill tone={a.enhanced_cdd_required ? 'accent' : 'neutral'}>Enhanced CDD: {a.enhanced_cdd_required ? 'required' : 'no'}</Pill>
        <Pill tone={a.smr_consideration ? 'accent' : 'neutral'}>SMR consideration: {a.smr_consideration ? 'yes' : 'no'}</Pill>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{a.summary}</p>

      {record.screening_hits.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" /> Screening matches
          </div>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {record.screening_hits.map((h, i) => (
              <li key={i}>
                {h.query_name} ~ <span className="font-medium">{h.matched_name}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">· {h.list_name} · score {h.score}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Risk factors — grounded in the rule pack
      </h4>
      <ul className="space-y-2">
        {a.risk_factors.map((f, i) => {
          const up = f.direction === 'increases'
          return (
            <li key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span
                  className={cx(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md',
                    up
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
                  )}
                >
                  {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{f.factor}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{f.explanation}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.rule_ids.map((id) => (
                      <RuleChip key={id}>{id}</RuleChip>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <h4 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Recommended actions
      </h4>
      <ul className="space-y-1.5">
        {a.recommended_actions.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {s}
          </li>
        ))}
      </ul>

      <div
        className={cx(
          'mt-5 flex items-center gap-2 rounded-lg border p-3 text-xs',
          passed
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
        )}
      >
        {passed ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <span>{passed ? 'Audit check passed — every cited rule ID exists in the pack.' : record.citation_warnings.join(' ')}</span>
      </div>

      {a.smr_consideration && (
        <div className="mt-4">
          {!smr && onDraftSmr && (
            <Button variant="secondary" size="sm" onClick={onDraftSmr} disabled={smrLoading}>
              {smrLoading ? (
                <>
                  <Spinner /> Drafting…
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" /> Draft Suspicious Matter Report
                </>
              )}
            </Button>
          )}
          {smr && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <FileText className="h-4 w-4" /> Draft Suspicious Matter Report
                <span className="ml-auto text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  {smr.recommended ? 'Recommended: submit' : 'Not recommended'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-200">Grounds: </span>
                {smr.grounds_for_suspicion}
              </p>
              <ul className="mt-2 space-y-1">
                {smr.indicators.map((ind, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="text-amber-600">▸</span>
                    {ind.indicator}
                    {ind.rule_ids.map((id) => (
                      <RuleChip key={id}>{id}</RuleChip>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="mt-3 whitespace-pre-wrap border-t border-amber-200/60 pt-3 text-xs leading-relaxed text-slate-600 dark:border-amber-900/60 dark:text-slate-400">
                {smr.narrative}
              </p>
            </div>
          )}
        </div>
      )}

      {history && history.length > 1 && (
        <div className="mt-6">
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <GitBranch className="h-3.5 w-3.5" /> Customer history · {history.length} assessments
          </h4>
          <ol className="space-y-1.5">
            {history.map((h, i) => {
              const current = h.id === record.record_id
              return (
                <li key={h.id} className={cx(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                  current ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                )}>
                  <span className="font-mono text-[10px] tabular-nums text-slate-400">
                    {String(history.length - i).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-300">
                    {new Date(h.created_at).toLocaleDateString('en-AU')}
                    {current && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">current</span>}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400">{h.rating}</span>
                  {!current && (
                    <a href={`/records?open=${h.id}`} className="text-[11px] font-medium text-emerald-700 hover:underline dark:text-emerald-400">Open</a>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <History className="h-3.5 w-3.5" /> Activity trail
          </h4>
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-200">{ACTION_LABEL[e.action] || e.action}</span>
                {e.detail && <span className="truncate text-slate-500 dark:text-slate-400">{e.detail}</span>}
                <span className="ml-auto shrink-0 tabular-nums text-slate-400 dark:text-slate-500">
                  {new Date(e.at).toLocaleString('en-AU')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button variant="secondary" size="sm" onClick={() => api.openPdf(record.record_id)}>
          <Download className="h-3.5 w-3.5" /> Download PDF
        </Button>
        {onReassess && (
          <Button variant="ghost" size="sm" onClick={onReassess} disabled={reassessing}>
            {reassessing ? <><Spinner /> Re-assessing…</> : <><RefreshCw className="h-3.5 w-3.5" /> Re-assess</>}
          </Button>
        )}
        <span className="text-[11px] text-slate-400 dark:text-slate-500">Saved · retained 7 years</span>
        <span className="ml-auto font-mono text-[10px] text-slate-400 dark:text-slate-600">
          {record.record_id.slice(0, 8)} · {record.gen_model}
        </span>
      </div>
    </Card>
  )
}
