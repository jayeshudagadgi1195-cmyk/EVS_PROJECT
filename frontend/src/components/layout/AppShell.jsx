import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen, BrainCircuit, Calculator, History, LayoutDashboard, Menu, Plus, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button, cx } from '../ui/Primitives'
import { api } from '../../lib/api'

export const NAV = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/calculator', label: 'Calculator', icon: Calculator },
  { to: '/app/predict', label: 'AI Prediction', icon: BrainCircuit },
  { to: '/app/advisor', label: 'Reduction Advisor', icon: Sparkles },
  { to: '/app/history', label: 'History & Analytics', icon: History },
  { to: '/app/methodology', label: 'Methodology', icon: BookOpen },
]

function useBackendStatus() {
  const [status, setStatus] = useState('checking')
  useEffect(() => {
    let alive = true
    const check = () =>
      api.health().then((h) => alive && setStatus(h.model?.ready ? 'online' : 'no-model')).catch(() => alive && setStatus('offline'))
    check()
    const id = setInterval(check, 15000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return status
}

function StatusPill({ status }) {
  const map = {
    checking: ['bg-zinc-500', 'Connecting…'],
    online: ['bg-leaf-400', 'API online'],
    'no-model': ['bg-amber-400', 'Model missing'],
    offline: ['bg-red-400', 'API offline'],
  }
  const [dot, text] = map[status]
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-400">
      <span className="relative flex h-2 w-2">
        {status === 'online' && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-60`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {text}
    </span>
  )
}

function SidebarContent({ onNavigate, status }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6"><Logo /></div>
      <p className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Workspace</p>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onNavigate}
            className={({ isActive }) => cx(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
            )}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl border border-white/[0.08] bg-gradient-to-r from-leaf-400/15 to-transparent"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                )}
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-leaf-400" />}
                <Icon className={cx('relative h-[18px] w-[18px]', isActive ? 'text-leaf-400' : 'text-zinc-500 group-hover:text-zinc-300')} />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <ShieldCheck className="h-4 w-4 text-leaf-400" /> Local demo mode
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
          Single demo profile, no login. Data stays in <span className="font-mono text-zinc-400">ecotrack.db</span> on this computer.
        </p>
        <div className="mt-3"><StatusPill status={status} /></div>
      </div>
    </div>
  )
}

// Keeps the old page on screen while it animates out.
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export default function AppShell() {
  const [open, setOpen] = useState(false)
  const status = useBackendStatus()
  const location = useLocation()
  const navigate = useNavigate()
  const current = NAV.find((n) => location.pathname.startsWith(n.to))

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] bg-ink-950/70 backdrop-blur-xl lg:block">
        <SidebarContent status={status} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/[0.08] bg-ink-900 lg:hidden"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
              <button className="absolute right-3 top-6 rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
              <SidebarContent status={status} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button className="rounded-lg p-2 text-zinc-300 hover:bg-white/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-zinc-500 sm:inline">EcoTrack AI</span>
              <span className="hidden text-zinc-700 sm:inline">/</span>
              <span className="truncate font-semibold text-white">{current?.label || 'App'}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden md:inline-flex"><StatusPill status={status} /></span>
              {!location.pathname.startsWith('/app/calculator') && (
                <Button size="sm" icon={Plus} onClick={() => navigate('/app/calculator')}>
                  <span className="hidden sm:inline">New calculation</span><span className="sm:hidden">New</span>
                </Button>
              )}
              <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-leaf-500/40 to-lime-400/20 text-xs font-bold text-white" title="Demo User">
                DU
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              <FrozenOutlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
