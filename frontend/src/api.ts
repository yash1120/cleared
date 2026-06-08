import type {
  AdminAuditEvent, AdminOverview, AdminSignupRow, AdminUserRow,
  ApiKeyCreated, ApiKeyInfo, AuditEvent, CDDRecord, Connector, Customer, Health, LookupHit, RecordSummary,
  ReviewItem, SMR, SampleEntry, Stats, TimeseriesPoint, TokenResponse, TopRule, User, WebhookCreated,
  WebhookInfo, WeekBucket,
} from './types'

const TOKEN_KEY = 'cleared_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function handle<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let msg = `Request failed (${r.status})`
    try {
      const j = await r.json()
      if (j?.detail) msg = j.detail
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number }
    err.status = r.status
    throw err
  }
  return (await r.json()) as T
}

async function getJSON<T>(url: string): Promise<T> {
  return handle<T>(await fetch(url, { headers: authHeaders() }))
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    }),
  )
}

export const api = {
  health: () => getJSON<Health>('/api/health'),
  professions: () => getJSON<Record<string, string>>('/api/professions'),
  samples: () => getJSON<Record<string, SampleEntry>>('/api/samples'),
  stats: () => getJSON<Stats>('/api/stats'),
  reviews: () => getJSON<ReviewItem[]>('/api/reviews'),
  audit: () => getJSON<AuditEvent[]>('/api/audit'),
  timeseries: (days = 30) => getJSON<TimeseriesPoint[]>(`/api/stats/timeseries?days=${days}`),
  topRules: (limit = 8) => getJSON<TopRule[]>(`/api/stats/top_rules?limit=${limit}`),
  reviewsTimeline: (weeks = 12) => getJSON<WeekBucket[]>(`/api/stats/reviews_timeline?weeks=${weeks}`),
  lookup: (q: { name?: string; external_ref?: string }) => {
    const p = new URLSearchParams()
    if (q.name) p.set('name', q.name)
    if (q.external_ref) p.set('external_ref', q.external_ref)
    return getJSON<LookupHit[]>('/api/records/lookup?' + p.toString())
  },

  register: (body: { email: string; password: string; profession: string; firm_name?: string | null }) =>
    postJSON<TokenResponse>('/api/auth/register', body),
  login: (body: { email: string; password: string }) => postJSON<TokenResponse>('/api/auth/login', body),
  me: () => getJSON<User>('/api/auth/me'),

  listKeys: () => getJSON<ApiKeyInfo[]>('/api/keys'),
  createKey: (name: string) => postJSON<ApiKeyCreated>('/api/keys', { name }),
  revokeKey: async (id: string) => {
    const r = await fetch('/api/keys/' + id, { method: 'DELETE', headers: authHeaders() })
    if (!r.ok) throw new Error('Could not revoke key')
  },
  integrations: () => getJSON<Connector[]>('/api/integrations'),
  integrationImport: (provider: string, rows: Record<string, unknown>[]) =>
    postJSON<{ assessed: number; results: { record_id: string; name: string; rating: string; external_ref?: string | null }[] }>(
      '/api/integrations/' + provider + '/import', rows,
    ),
  getWebhook: () => getJSON<WebhookInfo | Record<string, never>>('/api/webhook'),
  setWebhook: async (url: string) =>
    handle<WebhookCreated>(
      await fetch('/api/webhook', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ url }) }),
    ),
  deleteWebhook: async () => {
    await fetch('/api/webhook', { method: 'DELETE', headers: authHeaders() })
  },
  testWebhook: () => postJSON<{ delivered: boolean; status?: number; error?: string; reason?: string }>('/api/webhook/test', {}),

  assess: (c: Customer) => postJSON<CDDRecord>('/api/cdd', c),
  records: (q?: string) =>
    getJSON<RecordSummary[]>('/api/records' + (q ? '?q=' + encodeURIComponent(q) : '')),
  record: (id: string) => getJSON<CDDRecord>('/api/records/' + id),
  reassess: (id: string) => postJSON<CDDRecord>('/api/records/' + id + '/reassess', {}),
  recordAudit: (id: string) => getJSON<AuditEvent[]>('/api/records/' + id + '/audit'),
  recordHistory: (id: string) => getJSON<LookupHit[]>('/api/records/' + id + '/history'),
  previewReminder: () =>
    postJSON<{ to?: string; subject?: string; body?: string; overdue_count?: number; due_soon_count?: number; empty?: boolean }>(
      '/api/reminders/preview', {},
    ),
  sendReminder: () =>
    postJSON<{ sent: boolean; delivered?: boolean; mock?: boolean; reason?: string; error?: string }>(
      '/api/reminders/send', {},
    ),
  betaSignup: (payload: { email: string; name?: string; firm?: string; profession?: string; message?: string }) =>
    postJSON<{ ok: boolean }>('/api/beta-signup', payload),

  adminOverview: () => getJSON<AdminOverview>('/api/admin/overview'),
  adminUsers: () => getJSON<AdminUserRow[]>('/api/admin/users'),
  adminSignups: (includeArchived = false) =>
    getJSON<AdminSignupRow[]>('/api/admin/signups' + (includeArchived ? '?include_archived=true' : '')),
  adminMarkContacted: (id: string) => postJSON<{ ok: boolean }>('/api/admin/signups/' + id + '/contact', {}),
  adminArchiveSignup: (id: string) => postJSON<{ ok: boolean }>('/api/admin/signups/' + id + '/archive', {}),
  adminAudit: (limit = 50) => getJSON<AdminAuditEvent[]>('/api/admin/audit?limit=' + limit),
  getSmr: async (id: string): Promise<SMR | null> => {
    const r = await fetch('/api/records/' + id + '/smr', { headers: authHeaders() })
    return r.ok ? ((await r.json()) as SMR) : null
  },
  draftSmr: (id: string, scenario?: string | null) =>
    postJSON<SMR>('/api/records/' + id + '/smr', { scenario: scenario ?? null }),
  openPdf: async (id: string) => {
    const r = await fetch('/api/records/' + id + '/pdf', { headers: authHeaders() })
    if (!r.ok) throw new Error('Could not load PDF')
    const url = URL.createObjectURL(await r.blob())
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}
