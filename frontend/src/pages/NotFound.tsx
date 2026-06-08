import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { Button, Card, Kicker } from '../components/primitives'
import { Reveal } from '../components/Reveal'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <Reveal>
        <Card className="p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Compass className="h-6 w-6" />
          </span>
          <div className="mt-5"><Kicker>404</Kicker></div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">This page didn't pass screening.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            The page you're looking for doesn't exist (or was moved). The links below should get you back on the trail.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/"><Button>Back to home <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/demo"><Button variant="secondary">Run the live demo</Button></Link>
            <Link to="/contact"><Button variant="ghost">Tell us what broke</Button></Link>
          </div>
        </Card>
      </Reveal>
    </div>
  )
}
