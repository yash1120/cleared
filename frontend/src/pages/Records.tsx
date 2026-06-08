import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive } from 'lucide-react'
import { api } from '../api'
import type { AuditEvent, CDDRecord, LookupHit, RecordSummary, SMR } from '../types'
import { Button, Card, Kicker, RatingBadge, inputCls } from '../components/primitives'
import RecordView from '../components/RecordView'

function exportCsv(list: RecordSummary[]) {
  const cols = ['id', 'customer_name', 'entity_type', 'role', 'rating', 'enhanced_cdd', 'smr_consideration', 'created_at', 'external_ref', 'source']
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = [cols.join(','), ...list.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'cleared-records.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function Records() {
  const [list, setList] = useState<RecordSummary[] | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<CDDRecord | null>(null)
  const [smr, setSmr] = useState<SMR | null>(null)
  const [smrLoading, setSmrLoading] = useState(false)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [history, setHistory] = useState<LookupHit[]>([])
  const [reassessing, setReassessing] = useState(false)
  const [params, setParams] = useSearchParams()

  const load = useCallback(() => {
    api.records(q || undefined).then(setList).catch(() => setList([]))
  }, [q])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const openId = params.get('open')
    if (openId) {
      view(openId)
      params.delete('open')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = async (id: string) => {
    setSmr(null); setEvents([]); setHistory([])
    try {
      setSel(await api.record(id))
      setSmr(await api.getSmr(id))
      setEvents(await api.recordAudit(id))
      setHistory(await api.recordHistory(id))
    } catch {
      /* ignore */
    }
  }

  const view = async (id: string) => {
    setSel(null)
    await open(id)
  }

  const reassess = useCallback(async () => {
    if (!sel) return
    setReassessing(true)
    try {
      const fresh = await api.reassess(sel.record_id)
      setSel(fresh)
      setSmr(null)
      setEvents(await api.recordAudit(fresh.record_id))
      setHistory(await api.recordHistory(fresh.record_id))
      load()
    } catch {
      /* ignore */
    } finally {
      setReassessing(false)
    }
  }, [sel, load])

  const draftSmr = useCallback(async () => {
    if (!sel) return
    setSmrLoading(true)
    try {
      setSmr(await api.draftSmr(sel.record_id))
      load()
    } catch {
      /* ignore */
    } finally {
      setSmrLoading(false)
    }
  }, [sel, load])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Records</Kicker>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Assessment history</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every assessment is saved and retained for 7 years. Export any record as a PDF for your audit file.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className={inputCls + ' max-w-xs'} />
          <Button variant="secondary" size="sm" onClick={() => exportCsv(list || [])} disabled={!list || list.length === 0}>Export CSV</Button>
        </div>
      </div>

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[420px_1fr]">
        <Card className="overflow-hidden">
          {list === null ? (
            <div className="p-6 text-sm text-slate-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <Archive className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />
              <p className="mt-3">No records yet.</p>
              <p className="mt-1 text-xs">
                Run an assessment in the <Link to="/demo" className="text-emerald-700 dark:text-emerald-400">demo</Link>.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {list.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <button onClick={() => view(r.id)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-medium">{r.customer_name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {r.entity_type} · {r.role} · {new Date(r.created_at).toLocaleDateString('en-AU')}{r.has_smr ? ' · SMR' : ''}
                    </div>
                  </button>
                  <RatingBadge rating={r.rating} />
                  <button onClick={() => api.openPdf(r.id)} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">PDF</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div>
          {sel ? (
            <RecordView
              record={sel}
              smr={smr}
              onDraftSmr={draftSmr}
              smrLoading={smrLoading}
              onReassess={reassess}
              reassessing={reassessing}
              events={events}
              history={history}
            />
          ) : (
            <Card className="p-12 text-center text-slate-500 dark:text-slate-400">
              <Archive className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm">Select a record to view the full, cited assessment.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
