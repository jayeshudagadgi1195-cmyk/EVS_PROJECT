import { Link } from 'react-router-dom'
import { LogoMark } from '../components/ui/Logo'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <LogoMark className="mx-auto h-12 w-12" />
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-2 text-3xl">This page doesn’t exist</h1>
        <p className="muted mt-2">The link may be broken or the page was moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5">Home</Link>
          <Link to="/app/dashboard" className="rounded-xl bg-leaf-400 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-mint-400">Open dashboard</Link>
        </div>
      </div>
    </div>
  )
}
