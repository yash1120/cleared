import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Moon, ShieldCheck, Sun } from 'lucide-react'
import { useTheme } from '../theme'
import { useAuth } from '../auth'
import { Button } from './primitives'

const PROFESSION_LABELS: Record<string, string> = {
  real_estate: 'Real estate',
  accounting: 'Accounting',
  legal: 'Legal / conveyancing',
  precious_metals: 'Precious metals',
  tcsp: 'Trust & company services',
}

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

const marketingLinks = [
  { to: '/#how', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
]
const appLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/records', label: 'Records' },
  { to: '/settings', label: 'Integrations' },
]
const adminLink = { to: '/admin', label: 'Admin' }

export default function Layout() {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ScrollManager />
      <header className="fade-in-down sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-bold tracking-tight">Cleared</span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">AML/CTF compliance</span>
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {(user ? [...appLinks, ...(user.is_admin ? [adminLink] : [])] : marketingLinks).map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle light/dark theme"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <>
                <span className="hidden text-right leading-tight sm:block">
                  <span className="block text-xs font-medium">{user.firm_name || user.email}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    {PROFESSION_LABELS[user.profession] || user.profession}
                  </span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => { logout(); navigate('/') }}>Log out</Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button size="sm" variant="ghost">Log in</Button></Link>
                <Link to="/register"><Button size="sm">Sign up</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-bold">Cleared</span>
            </div>
            <p className="mt-3 max-w-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Audit-grade AML/CTF compliance for Australian real estate, built on the AUSTRAC framework.
            </p>
          </div>
          <div>
            <div className="mb-2 font-semibold">Product</div>
            <ul className="space-y-1.5 text-slate-500 dark:text-slate-400">
              <li><Link to="/#how" className="link-underline hover:text-slate-900 dark:hover:text-white">How it works</Link></li>
              <li><Link to="/records" className="link-underline hover:text-slate-900 dark:hover:text-white">Records</Link></li>
              <li><Link to="/pricing" className="link-underline hover:text-slate-900 dark:hover:text-white">Pricing</Link></li>
              <li><Link to="/demo" className="link-underline hover:text-slate-900 dark:hover:text-white">Live demo</Link></li>
              <li><Link to="/changelog" className="link-underline hover:text-slate-900 dark:hover:text-white">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-semibold">Company</div>
            <ul className="space-y-1.5 text-slate-500 dark:text-slate-400">
              <li><Link to="/about" className="link-underline hover:text-slate-900 dark:hover:text-white">About</Link></li>
              <li><Link to="/contact" className="link-underline hover:text-slate-900 dark:hover:text-white">Contact</Link></li>
              <li><Link to="/security" className="link-underline hover:text-slate-900 dark:hover:text-white">Security</Link></li>
              <li><Link to="/privacy" className="link-underline hover:text-slate-900 dark:hover:text-white">Privacy</Link></li>
              <li><Link to="/terms" className="link-underline hover:text-slate-900 dark:hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl border-t border-slate-200 px-4 py-4 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          Prototype · the rule pack is an MVP subset and not legal advice. Verify against the AML/CTF Act 2006 and current AUSTRAC guidance.
        </div>
      </footer>
    </div>
  )
}
