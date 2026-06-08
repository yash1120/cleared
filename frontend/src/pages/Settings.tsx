import { useEffect, useState } from 'react'
import { Bell, Copy, KeyRound, Plug, Trash2, Upload, Webhook } from 'lucide-react'
import { api } from '../api'
import type { ApiKeyCreated, ApiKeyInfo, Connector, WebhookInfo } from '../types'
import { Button, Card, Kicker, RuleChip, inputCls } from '../components/primitives'

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((c) => c !== '')) rows.push(row) }
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {}
    headers.forEach((h, i) => { const v = (r[i] ?? '').trim(); if (v) o[h] = v })
    return o
  })
}

export default function Settings() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [name, setName] = useState('')
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [webhook, setWebhook] = useState<WebhookInfo | null>(null)
  const [whUrl, setWhUrl] = useState('')
  const [whSecret, setWhSecret] = useState<string | null>(null)
  const [whMsg, setWhMsg] = useState<string | null>(null)

  const [csvBusy, setCsvBusy] = useState(false)
  const [csvMsg, setCsvMsg] = useState<string | null>(null)

  type ReminderPreview = { to?: string; subject?: string; body?: string; overdue_count?: number; due_soon_count?: number; empty?: boolean }
  type ReminderSent = { sent: boolean; delivered?: boolean; mock?: boolean; reason?: string; error?: string; to?: string }
  const [reminderPreview, setReminderPreview] = useState<ReminderPreview | null>(null)
  const [reminderSent, setReminderSent] = useState<ReminderSent | null>(null)
  const [reminderBusy, setReminderBusy] = useState<'preview' | 'send' | null>(null)

  const onPreviewReminder = async () => {
    setReminderBusy('preview'); setReminderSent(null)
    try { setReminderPreview(await api.previewReminder()) }
    catch { setReminderPreview({ empty: true }) }
    finally { setReminderBusy(null) }
  }
  const onSendReminder = async () => {
    setReminderBusy('send')
    try {
      const r = await api.sendReminder()
      setReminderSent({ ...r, to: (r as ReminderSent).to ?? reminderPreview?.to })
    } catch (e) {
      setReminderSent({ sent: false, error: e instanceof Error ? e.message : 'send failed' })
    } finally { setReminderBusy(null) }
  }

  const load = () => {
    api.listKeys().then(setKeys).catch(() => {})
    api.integrations().then(setConnectors).catch(() => {})
    api.getWebhook().then((w) => setWebhook('url' in w ? (w as WebhookInfo) : null)).catch(() => {})
  }
  useEffect(load, [])

  const createKey = async () => {
    setBusy(true); setErr(null)
    try { setCreated(await api.createKey(name || 'Integration key')); setName(''); load() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not create key') }
    finally { setBusy(false) }
  }
  const revoke = async (id: string) => { await api.revokeKey(id); load() }

  const saveWebhook = async () => {
    setWhMsg(null)
    try { const r = await api.setWebhook(whUrl); setWhSecret(r.secret); setWhUrl(''); load() }
    catch (e) { setWhMsg(e instanceof Error ? e.message : 'Could not save webhook') }
  }
  const removeWebhook = async () => { await api.deleteWebhook(); setWebhook(null); setWhSecret(null) }
  const testWebhook = async () => {
    const r = await api.testWebhook()
    setWhMsg(r.delivered ? `Delivered (HTTP ${r.status}).` : `Not delivered: ${r.error || r.reason || 'unknown'}`)
  }

  const onCsv = async (file: File) => {
    setCsvBusy(true); setCsvMsg(null)
    try {
      const rows = parseCsv(await file.text())
      if (rows.length === 0) { setCsvMsg('No rows found. Expect a header row including "name".'); return }
      const r = await api.integrationImport('generic', rows)
      setCsvMsg(`Assessed ${r.assessed} contact${r.assessed === 1 ? '' : 's'}. See Records.`)
    } catch (e) {
      setCsvMsg(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setCsvBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Kicker>Integrations</Kicker>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">API keys, webhooks & connectors</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Connect Cleared to Xero, MYOB, your CRM or your own scripts — push a contact, get a cited,
        audit-ready assessment back.
      </p>

      {/* API keys */}
      <Card className="mt-7 p-6">
        <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h2 className="font-semibold">API keys</h2></div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Authenticate integrations with the <code className="font-mono text-xs">X-API-Key</code> header.</p>
        {created && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">New key — copy it now, it won't be shown again.</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1.5 font-mono text-xs dark:bg-slate-900">{created.key}</code>
              <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(created.key)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <input className={inputCls + ' max-w-xs'} value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Xero)" />
          <Button onClick={createKey} disabled={busy}>{busy ? 'Creating…' : 'Create key'}</Button>
        </div>
        {err && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</div>}
        <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
          {keys.length === 0 && <p className="py-3 text-sm text-slate-500 dark:text-slate-400">No keys yet.</p>}
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{k.name || 'Integration key'}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{k.prefix}…</span> · created {new Date(k.created_at).toLocaleDateString('en-AU')}
                  {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString('en-AU')}` : ' · never used'}
                </div>
              </div>
              <button onClick={() => revoke(k.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400" aria-label="Revoke key"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhooks */}
      <Card className="mt-5 p-6">
        <div className="flex items-center gap-2"><Webhook className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h2 className="font-semibold">Webhook</h2></div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          We POST a signed event to your URL when an assessment completes (header <code className="font-mono text-xs">X-Cleared-Signature</code>, HMAC-SHA256).
        </p>
        {webhook ? (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="truncate font-mono text-xs">{webhook.url}</span>
              <Button size="sm" variant="secondary" onClick={testWebhook}>Send test</Button>
              <Button size="sm" variant="ghost" onClick={removeWebhook}>Remove</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <input className={inputCls} value={whUrl} onChange={(e) => setWhUrl(e.target.value)} placeholder="https://your-system.example.com/cleared-webhook" />
            <Button onClick={saveWebhook} disabled={!whUrl}>Save</Button>
          </div>
        )}
        {whSecret && (
          <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs dark:border-emerald-800 dark:bg-emerald-950/40">
            Signing secret (shown once): <code className="font-mono">{whSecret}</code>
          </div>
        )}
        {whMsg && <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{whMsg}</div>}
      </Card>

      {/* Email reminders */}
      <Card className="mt-5 p-6">
        <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h2 className="font-semibold">Email reminders</h2></div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Digest of overdue and due-soon customer reviews. Configure SMTP via <code className="font-mono text-xs">CLEARED_SMTP_HOST</code> et al. in production — locally we'll mock the send so you can preview the contents.
        </p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onPreviewReminder} disabled={reminderBusy !== null}>
            {reminderBusy === 'preview' ? 'Generating…' : 'Preview digest'}
          </Button>
          <Button size="sm" onClick={onSendReminder} disabled={reminderBusy !== null}>
            {reminderBusy === 'send' ? 'Sending…' : 'Send now'}
          </Button>
        </div>
        {reminderPreview && (
          reminderPreview.empty ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No overdue or due-soon reviews — nothing to send.</p>
          ) : (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                To: <span className="font-mono">{reminderPreview.to}</span> · Subject: {reminderPreview.subject}
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{reminderPreview.body}</pre>
            </div>
          )
        )}
        {reminderSent && (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {reminderSent.reason === 'no reviews due' ? 'Nothing to send right now.'
              : reminderSent.delivered ? `Sent to ${reminderSent.to}.`
              : reminderSent.mock ? `Mock send (no SMTP configured) — the digest above is what would go to ${reminderSent.to}.`
              : `Failed: ${reminderSent.error || 'unknown'}`}
          </div>
        )}
      </Card>

      {/* CSV bulk import */}
      <Card className="mt-5 p-6">
        <div className="flex items-center gap-2"><Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h2 className="font-semibold">Bulk import (CSV)</h2></div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload a CSV with a header row (at least <code className="font-mono text-xs">name</code>; optional
          <code className="font-mono text-xs"> entity_type, abn_or_acn, transaction_value_aud, funds_source, notes, external_ref</code>). Each row is assessed.
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
          <Upload className="h-4 w-4" /> {csvBusy ? 'Importing…' : 'Choose CSV'}
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={csvBusy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsv(f); e.target.value = '' }} />
        </label>
        {csvMsg && <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{csvMsg}</div>}
      </Card>

      {/* Connectors */}
      <Card className="mt-5 p-6">
        <div className="flex items-center gap-2"><Plug className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h2 className="font-semibold">Connectors</h2></div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Push a provider contact to <code className="font-mono text-xs">POST /api/integrations/&lt;name&gt;/assess</code>.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {connectors.map((c) => (
            <div key={c.name} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2"><span className="font-medium">{c.label}</span><RuleChip>{c.name}</RuleChip></div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
            </div>
          ))}
        </div>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
{`curl -X POST http://localhost:8000/api/integrations/xero/assess \\
  -H "X-API-Key: <your key>" -H "Content-Type: application/json" \\
  -d '{"ContactID":"abc-123","Name":"Acme Pty Ltd"}'`}
        </pre>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Full API reference at <a className="font-medium text-emerald-700 dark:text-emerald-400" href="/docs" target="_blank" rel="noreferrer">/docs</a>.
        </p>
      </Card>
    </div>
  )
}
