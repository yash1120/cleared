import { useState, type FormEvent } from 'react'
import { ArrowRight, AtSign, BookOpen, MessageSquare, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import { Button, Card, Field, Kicker, inputCls } from '../components/primitives'
import { Reveal } from '../components/Reveal'

const CHANNELS = [
  { icon: AtSign, label: 'Email', value: 'hello@cleared.com.au', detail: 'For sales, partnerships, and security disclosures.' },
  { icon: MessageSquare, label: 'Beta access', value: 'On the home page', detail: 'Or use the form on the right — we read every one.' },
  { icon: BookOpen, label: 'API docs', value: '/docs', detail: 'Live OpenAPI reference for the integration endpoints.' },
]

export default function Contact() {
  const [form, setForm] = useState({ email: '', name: '', firm: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('busy'); setErr(null)
    try {
      await api.betaSignup({
        email: form.email, name: form.name || undefined,
        firm: form.firm || undefined, message: form.message || undefined,
      })
      setStatus('ok')
    } catch (e) {
      setStatus('error')
      setErr(e instanceof Error ? e.message : 'Could not send. Try again.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <Reveal>
        <Kicker>Contact</Kicker>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">We'd like to hear from you.</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-400">
          Customers, partners, journalists, security researchers — drop us a line and a real person will reply.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Reveal delay={60}>
          <Card className="h-full p-6">
            <ul className="space-y-5">
              {CHANNELS.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{c.label}</div>
                    <div className="font-mono text-sm">{c.value}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-7 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
              We only use what you send to reply. No marketing list, no resale.
            </div>
          </Card>
        </Reveal>

        <Reveal delay={120}>
          <Card className="p-6">
            {status === 'ok' ? (
              <div className="py-12 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <h2 className="mt-3 text-xl font-bold tracking-tight">Thanks — we got it.</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                  We'll reply to <span className="font-medium text-slate-800 dark:text-slate-200">{form.email}</span> as soon as we can.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-3">
                <Field label="Your name">
                  <input className={inputCls} value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Citizen" />
                </Field>
                <Field label="Work email">
                  <input className={inputCls} type="email" required value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@firm.com.au" />
                </Field>
                <Field label="Firm (optional)">
                  <input className={inputCls} value={form.firm}
                    onChange={(e) => setForm((f) => ({ ...f, firm: e.target.value }))} placeholder="Acme Realty" />
                </Field>
                <Field label="Message">
                  <textarea rows={4} className={inputCls} required value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="What can we help with?" />
                </Field>
                {status === 'error' && err && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {err}
                  </div>
                )}
                <Button type="submit" disabled={status === 'busy' || !form.email || !form.message}>
                  {status === 'busy' ? 'Sending…' : <>Send message <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            )}
          </Card>
        </Reveal>
      </div>
    </div>
  )
}
