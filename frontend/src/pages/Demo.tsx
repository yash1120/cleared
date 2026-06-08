import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import type { CDDRecord, Customer, LookupHit, SMR, SampleEntry } from '../types'
import { Button, Card, Field, Kicker, Spinner, inputCls } from '../components/primitives'
import RecordView from '../components/RecordView'

const ENTITY = ['individual', 'company', 'trust', 'smsf', 'partnership', 'other']
const ROLE = ['vendor', 'purchaser', 'lessor', 'lessee']

const blank = (): Customer => ({
  name: '', entity_type: 'individual', role: 'vendor', country: 'Australia',
  identification_provided: [], beneficial_owners: [], transaction_value_aud: null,
  cash_component_aud: null, funds_source: null, notes: null,
})

export default function Demo() {
  const [samples, setSamples] = useState<Record<string, SampleEntry>>({})
  const [mode, setMode] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer>(blank())
  const [rec, setRec] = useState<CDDRecord | null>(null)
  const [smr, setSmr] = useState<SMR | null>(null)
  const [loading, setLoading] = useState(false)
  const [smrLoading, setSmrLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hits, setHits] = useState<LookupHit[]>([])

  useEffect(() => {
    const name = customer.name.trim()
    if (name.length < 3) { setHits([]); return }
    const t = setTimeout(() => {
      api.lookup({ name }).then(setHits).catch(() => setHits([]))
    }, 350)
    return () => clearTimeout(t)
  }, [customer.name])

  useEffect(() => {
    api.health().then((h) => setMode(h.mode)).catch(() => setMode('offline'))
    api.samples()
      .then((s) => {
        const t: Record<string, SampleEntry> = {}
        for (const [k, v] of Object.entries(s)) t[k] = { ...v, customer: { ...v.customer, _key: k } }
        setSamples(t)
        const first = Object.values(t)[0]
        if (first) setCustomer(first.customer)
      })
      .catch(() => {})
  }, [])

  const set = (k: keyof Customer, v: unknown) => setCustomer((c) => ({ ...c, [k]: v }))
  const num = (v: string) => (v === '' ? null : Number(v))

  const assess = useCallback(async () => {
    setLoading(true); setError(null); setRec(null); setSmr(null)
    try {
      const { _key, ...payload } = customer
      setRec(await api.assess(payload as Customer))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [customer])

  const draftSmr = useCallback(async () => {
    if (!rec) return
    setSmrLoading(true)
    try {
      setSmr(await api.draftSmr(rec.record_id, customer.notes))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSmrLoading(false)
    }
  }, [rec, customer])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <Kicker>Live demo{mode ? ` · ${mode} mode` : ''}</Kicker>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Assess a customer</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pick a sample or edit the fields, then assess. Every assessment is saved to Records.
        </p>
      </div>

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(samples).map(([k, s]) => (
              <button
                key={k}
                onClick={() => setCustomer({ ...s.customer })}
                className={
                  'rounded-lg border px-3 py-1.5 text-xs ' +
                  (customer._key === k
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800')
                }
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Customer name">
                <input className={inputCls} value={customer.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Acme Holdings Pty Ltd" />
              </Field>
            </div>
            <Field label="Entity type">
              <select className={inputCls} value={customer.entity_type} onChange={(e) => set('entity_type', e.target.value)}>
                {ENTITY.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Role">
              <select className={inputCls} value={customer.role} onChange={(e) => set('role', e.target.value)}>
                {ROLE.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Transaction (AUD)">
              <input type="number" className={inputCls} value={customer.transaction_value_aud ?? ''} onChange={(e) => set('transaction_value_aud', num(e.target.value))} />
            </Field>
            <Field label="Cash component (AUD)">
              <input type="number" className={inputCls} value={customer.cash_component_aud ?? ''} onChange={(e) => set('cash_component_aud', num(e.target.value))} />
            </Field>
            <div className="col-span-2">
              <Field label="Source of funds / wealth">
                <input className={inputCls} value={customer.funds_source ?? ''} onChange={(e) => set('funds_source', e.target.value || null)} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes / observed behaviour">
                <textarea rows={3} className={inputCls} value={customer.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
              </Field>
            </div>
          </div>

          {customer.beneficial_owners.length > 0 && (
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[10px] font-medium uppercase tracking-wide">Beneficial owners</span>
              <ul className="mt-1 space-y-0.5">
                {customer.beneficial_owners.map((b, i) => (
                  <li key={i}>• {b.name} <span className="text-slate-400">({b.role}{b.is_pep ? ', PEP' : ''})</span></li>
                ))}
              </ul>
            </div>
          )}

          {hits.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                {hits.length} prior assessment{hits.length === 1 ? '' : 's'} for this customer
              </div>
              <ul className="mt-2 space-y-1.5">
                {hits.map((h) => (
                  <li key={h.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
                      {h.customer_name}
                      <span className="text-slate-500 dark:text-slate-400"> · {new Date(h.created_at).toLocaleDateString('en-AU')}</span>
                    </span>
                    <span className="font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400">{h.rating}</span>
                    <Link to={`/records?open=${h.id}`} className="text-[11px] font-medium text-emerald-700 hover:underline dark:text-emerald-400">Open</Link>
                  </li>
                ))}
              </ul>
              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">
                Pressing <span className="font-medium">Assess</span> creates a new dated, immutable record. To roll a prior assessment forward instead, open it and click <span className="font-medium">Re-assess</span> — they'll be linked in the audit trail.
              </p>
            </div>
          )}

          <Button className="mt-5 w-full" onClick={assess} disabled={loading || !customer.name}>
            {loading ? <><Spinner /> Assessing…</> : <><ShieldCheck className="h-4 w-4" /> Assess customer</>}
          </Button>
        </Card>

        <div>
          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          {rec ? (
            <RecordView record={rec} smr={smr} onDraftSmr={draftSmr} smrLoading={smrLoading} />
          ) : (
            <Card className="p-12 text-center text-slate-500 dark:text-slate-400">
              <ShieldCheck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm">
                Pick a sample customer and press <span className="font-medium text-slate-700 dark:text-slate-200">Assess customer</span>.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
