import { useCallback, useEffect, useState } from 'react'
import { Archive, Inbox, Mail, ScrollText, ShieldCheck, Users } from 'lucide-react'
import { api } from '../api'
import type { AdminAuditEvent, AdminOverview, AdminSignupRow, AdminUserRow } from '../types'
import { Button, Card, Kicker, Pill } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const ACTION_LABEL: Record<string, string> = {
  'assessment.created': 'Assessment',
  'review.completed': 'Re-assess',
  'smr.drafted': 'SMR drafted',
  'webhook.set': 'Webhook set',
  'webhook.removed': 'Webhook removed',
  'apikey.created': 'API key created',
  'apikey.revoked': 'API key revoked',
  'reminder.sent': 'Reminder sent',
}

export default function Admin() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [signups, setSignups] = useState<AdminSignupRow[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [audit, setAudit] = useState<AdminAuditEvent[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [o, s, u, a] = await Promise.allSettled([
      api.adminOverview(), api.adminSignups(showArchived),
      api.adminUsers(), api.adminAudit(50),
    ])
    if (o.status === 'fulfilled') setOverview(o.value)
    if (s.status === 'fulfilled') setSignups(s.value)
    if (u.status === 'fulfilled') setUsers(u.value)
    if (a.status === 'fulfilled') setAudit(a.value)
  }, [showArchived])

  useEffect(() => { load() }, [load])

  const contact = async (id: string) => {
    setBusy(id)
    try { await api.adminMarkContacted(id); load() } finally { setBusy(null) }
  }
  const archive = async (id: string) => {
    setBusy(id)
    try { await api.adminArchiveSignup(id); load() } finally { setBusy(null) }
  }

  const kpis = overview
    ? [
        { label: 'Users', value: overview.users, sub: overview.admins > 0 ? `${overview.admins} admin` : null },
        { label: 'Records', value: overview.records, sub: `+${overview.last_7_days.records} this week` },
        { label: 'SMRs', value: overview.smrs, sub: null },
        { label: 'Beta signups', value: overview.signups_open, sub: `${overview.signups_total} total · +${overview.last_7_days.signups} this week` },
      ]
    : []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Reveal>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <Kicker>Admin</Kicker>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Operator console</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cross-tenant read access for operators on the <code className="font-mono text-xs">CLEARED_ADMIN_EMAILS</code> list.
        </p>
      </Reveal>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 40}>
            <Card className="p-5 lift">
              <div className="text-3xl font-bold tabular-nums">{k.value}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{k.label}</span>
                {k.sub && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">{k.sub}</span>}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Beta signups */}
      <Reveal>
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <Inbox className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Beta signups
              <Pill>{signups.length}</Pill>
            </h2>
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
          </div>
          {signups.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Nothing in the inbox.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {signups.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium">{s.name || s.firm || s.email}</span>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{s.email}</span>
                        {s.profession && <Pill>{s.profession.replace('_', ' ')}</Pill>}
                        {s.contacted_at && <Pill tone="accent">contacted</Pill>}
                        {s.archived_at && <Pill>archived</Pill>}
                      </div>
                      {s.firm && s.firm !== s.name && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.firm}</div>
                      )}
                      {s.message && (
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.message}</p>
                      )}
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {new Date(s.created_at).toLocaleString('en-AU')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${s.email}`}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Mail className="mr-1 inline h-3 w-3" /> Reply
                      </a>
                      {!s.contacted_at && (
                        <Button size="sm" variant="secondary" onClick={() => contact(s.id)} disabled={busy === s.id}>
                          Mark contacted
                        </Button>
                      )}
                      {!s.archived_at && (
                        <Button size="sm" variant="ghost" onClick={() => archive(s.id)} disabled={busy === s.id}>
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>

      {/* Users */}
      <Reveal>
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center gap-2 p-6 pb-3">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold">Users</h2>
            <Pill>{users.length}</Pill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Firm</th>
                  <th className="px-4 py-2 font-medium">Profession</th>
                  <th className="px-4 py-2 font-medium text-right">Records</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{u.firm_name || '—'}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{u.profession.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{u.records_count}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('en-AU')}
                    </td>
                    <td className="px-4 py-2">
                      {u.is_admin ? <Pill tone="accent">admin</Pill> : <span className="text-slate-400 dark:text-slate-500">user</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      {/* Recent audit (cross-tenant) */}
      <Reveal>
        <Card className="mt-6 p-6">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold">Recent audit feed</h2>
            <Pill>{audit.length}</Pill>
          </div>
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
            {audit.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 py-2 text-xs">
                <span className="w-36 shrink-0 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{e.user_email || '—'}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{ACTION_LABEL[e.action] || e.action}</span>
                {e.detail && <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-400">{e.detail}</span>}
                <span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-500">{new Date(e.at).toLocaleString('en-AU')}</span>
              </li>
            ))}
            {audit.length === 0 && <li className="py-3 text-sm text-slate-500 dark:text-slate-400">No events yet.</li>}
          </ul>
        </Card>
      </Reveal>
    </div>
  )
}
