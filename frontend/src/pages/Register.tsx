import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Button, Card, Field, Kicker, inputCls } from '../components/primitives'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [profs, setProfs] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firm, setFirm] = useState('')
  const [profession, setProfession] = useState('real_estate')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.professions().then(setProfs).catch(() => {})
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await register({ email, password, profession, firm_name: firm || null })
      nav('/dashboard')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-7">
        <Kicker>Create account</Kicker>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Get started with Cleared</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Your profession">
            <select className={inputCls} value={profession} onChange={(e) => setProfession(e.target.value)}>
              {Object.entries(profs).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Firm name (optional)">
            <input className={inputCls} value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="e.g. Acme Realty" />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {err && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {err}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Already have an account? <Link to="/login" className="font-medium text-emerald-700 dark:text-emerald-400">Sign in</Link>
        </p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Prototype — please don't enter real customer data.</p>
      </Card>
    </div>
  )
}
