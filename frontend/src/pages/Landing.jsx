import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, BarChart3, BookOpen, BrainCircuit, Bus, Calculator, Car, CheckCircle2, Database, Github, History, Leaf,
  LineChart, Lock, PlugZap, ServerOff, Sparkles, TrainFront, Bike, TrendingDown, Zap,
} from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { kg, monthLabel } from '../lib/format'
import { Logo, LogoMark } from '../components/ui/Logo'
import { Button, cx } from '../components/ui/Primitives'
import { ActualPredictedChart, SourcesDonut, TrendAreaChart } from '../components/charts/Charts'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
}

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-hidden">
      <Nav />
      <Hero onStart={() => navigate('/app/calculator')} onExplore={() => navigate('/app/dashboard')} />
      <FactStrip />
      <HowItWorks />
      <Features />
      <AISection />
      <ImpactSection />
      <PreviewSection />
      <FinalCTA onStart={() => navigate('/app/calculator')} />
      <Footer />
    </div>
  )
}

function Nav() {
  const links = [['#how', 'How it works'], ['#features', 'Features'], ['#ai', 'AI predictions'], ['#impact', 'Impact'], ['#preview', 'Preview']]
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-ink-950/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white">{label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/app/calculator" className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white sm:block">Calculator</Link>
          <Link to="/app/dashboard"><Button size="sm">Open dashboard <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
        </div>
      </div>
    </header>
  )
}

/* ---------------- HERO ---------------- */
function Hero({ onStart, onExplore }) {
  return (
    <section className="relative px-5 pb-20 pt-32 sm:px-8 lg:pb-28 lg:pt-40">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-leaf-500/10 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-leaf-400/20 bg-leaf-400/[0.07] px-3 py-1 text-xs font-semibold text-mint-300">
            <Sparkles className="h-3.5 w-3.5" /> Personal carbon intelligence
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-[42px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-[68px]">
            Understand Your Impact.<br /><span className="text-gradient">Shape a Greener Tomorrow.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            Track your carbon footprint, predict future emissions, and discover smarter ways to live sustainably — powered by intelligent analytics.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}
            className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" onClick={onStart}><Calculator className="h-4 w-4" /> Start Calculating</Button>
            <Button size="lg" variant="secondary" onClick={onExplore}>Explore Dashboard <ArrowRight className="h-4 w-4" /></Button>
          </motion.div>
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-zinc-500">
            {['Published emission factors', 'Real Random Forest model', 'Runs 100% locally'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-leaf-400" />{t}</li>
            ))}
          </motion.ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  )
}

function HeroVisual() {
  // Purely decorative illustration (labelled as such) - live numbers live in the app.
  const path = 'M0 120 C 40 110, 60 70, 100 78 S 160 120, 200 96 S 260 40, 300 52 S 360 80, 400 34'
  const segments = [
    { len: 38, color: '#bef264' }, { len: 27, color: '#34d399' }, { len: 14, color: '#2dd4bf' }, { len: 8, color: '#7dd3fc' }, { len: 13, color: '#fbbf24' },
  ]
  let offset = 0
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[540px]" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-tr from-leaf-400/10 via-transparent to-lime-400/10 blur-2xl" />
      <div className="card relative overflow-hidden border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5"><LogoMark className="h-7 w-7" /><span className="text-sm font-semibold text-white">Footprint overview</span></div>
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Illustration</span>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[['Electricity', Zap, 'text-lime-300'], ['Transport', Car, 'text-mint-300'], ['Cooking', Leaf, 'text-amber-200']].map(([l, Icon, c], i) => (
            <motion.div key={l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <Icon className={cx('h-4 w-4', c)} />
              <p className="mt-2 text-[11px] text-zinc-500">{l}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-lime-400" initial={{ width: 0 }} animate={{ width: ['72%', '58%', '24%'][i] }} transition={{ delay: 0.9 + i * 0.1, duration: 1 }} />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-[1fr_120px] items-center gap-5">
          <svg viewBox="0 0 400 140" className="w-full">
            <defs>
              <linearGradient id="hv-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#34d399" stopOpacity=".35" /><stop offset="1" stopColor="#34d399" stopOpacity="0" /></linearGradient>
              <linearGradient id="hv-line" x1="0" x2="1"><stop offset="0" stopColor="#6ee7b7" /><stop offset="1" stopColor="#bef264" /></linearGradient>
            </defs>
            {[35, 70, 105].map((y) => <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />)}
            <motion.path d={`${path} L400 140 L0 140 Z`} fill="url(#hv-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} />
            <motion.path d={path} fill="none" stroke="url(#hv-line)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 1.6, ease: 'easeInOut' }} />
            <motion.path d="M400 34 L 440 22" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="4 6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} />
            <motion.circle cx="400" cy="34" r="5" fill="#07110c" stroke="#bef264" strokeWidth="2.5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2, type: 'spring' }} />
          </svg>
          <svg viewBox="0 0 42 42" className="w-full -rotate-90">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            {segments.map((s, i) => {
              const el = (
                <motion.circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={s.color} strokeWidth="5" strokeDashoffset={-offset}
                  initial={{ strokeDasharray: '0 100' }} animate={{ strokeDasharray: `${s.len - 1.5} ${100 - s.len + 1.5}` }} transition={{ delay: 0.8 + i * 0.12, duration: 0.8 }} pathLength="100" />
              )
              offset += s.len
              return el
            })}
          </svg>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
        transition={{ opacity: { delay: 1.4 }, x: { delay: 1.4 }, y: { delay: 2, duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
        className="card absolute -left-4 bottom-10 hidden items-center gap-3 border-white/10 bg-ink-850/90 px-4 py-3 sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf-400/15 text-leaf-400"><TrendingDown className="h-4 w-4" /></span>
        <div><p className="text-[11px] text-zinc-500">Simulated saving</p><p className="text-sm font-semibold text-white">Shift trips to metro</p></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 1.6 }, x: { delay: 1.6 }, y: { delay: 2.2, duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
        className="card absolute -right-3 -top-5 hidden items-center gap-3 border-white/10 bg-ink-850/90 px-4 py-3 sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-300/15 text-sky-300"><BrainCircuit className="h-4 w-4" /></span>
        <div><p className="text-[11px] text-zinc-500">Random Forest</p><p className="text-sm font-semibold text-white">Next-month forecast</p></div>
      </motion.div>
    </motion.div>
  )
}

function FactStrip() {
  const facts = [
    ['7', 'sourced emission factors'], ['1,440', 'synthetic training records'], ['6', 'connected modules'], ['0', 'API keys or paid services'],
  ]
  return (
    <section className="border-y border-white/[0.05] bg-white/[0.015] px-5 py-10 sm:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
        {facts.map(([n, l], i) => (
          <motion.div key={l} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="text-center">
            <p className="num text-3xl font-bold text-white sm:text-4xl">{n}</p>
            <p className="mt-1 text-[13px] text-zinc-500">{l}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function SectionHead({ eyebrow, title, text, center }) {
  return (
    <motion.div {...fadeUp} className={cx('max-w-2xl', center && 'mx-auto text-center')}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-[42px] sm:leading-[1.1]">{title}</h2>
      {text && <p className="mt-4 text-[17px] leading-relaxed text-zinc-400">{text}</p>}
    </motion.div>
  )
}

function HowItWorks() {
  const steps = [
    { icon: Calculator, title: 'Log your month', text: 'Enter travel distances, electricity units from your bill and LPG use.' },
    { icon: BarChart3, title: 'Calculate', text: 'Activity × published emission factor gives your footprint in kg CO₂e.' },
    { icon: BrainCircuit, title: 'Predict', text: 'A trained Random Forest forecasts next month’s emissions.' },
    { icon: Sparkles, title: 'Reduce', text: 'Ranked tips and a what-if simulator show what to change first.' },
  ]
  return (
    <section id="how" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHead eyebrow="How EcoTrack AI works" title="From your bill to a better habit in four steps" center />
        <div className="relative mt-16 grid gap-6 md:grid-cols-4">
          <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-leaf-400/40 to-transparent md:block" />
          {steps.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="relative text-center">
              <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-ink-850 text-mint-300 shadow-glow">
                <Icon className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-lime-400 text-[11px] font-bold text-ink-950">{i + 1}</span>
              </div>
              <h3 className="mt-6 text-lg">{title}</h3>
              <p className="mx-auto mt-2 max-w-[240px] text-sm leading-relaxed text-zinc-400">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const items = [
    { icon: BarChart3, title: 'Analytics dashboard', text: 'KPIs, trend, source breakdown and month-over-month comparison — all computed from your saved records.', span: 'md:col-span-2', big: true },
    { icon: Calculator, title: 'Multi-step calculator', text: 'Guided inputs with a live estimate as you type.' },
    { icon: BrainCircuit, title: 'AI forecasting', text: 'Next-month prediction with back-testing and model metrics.' },
    { icon: Sparkles, title: 'Reduction simulator', text: 'Drag sliders to see monthly and annual savings instantly.' },
    { icon: History, title: 'History & export', text: 'Filter, compare months, delete records, download CSV.' },
    { icon: BookOpen, title: 'Transparent methodology', text: 'Every factor with its source, year, unit and caveats.' },
  ]
  return (
    <section id="features" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHead eyebrow="Features" title="Everything you need to understand your footprint" text="Built as one connected system: every page reads from the same local database and the same emission factors." />
        <div className="mt-14 grid gap-4 md:grid-cols-4">
          {items.map(({ icon: Icon, title, text, span, big }, i) => (
            <motion.div key={title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }} whileHover={{ y: -4 }}
              className={cx('card group relative overflow-hidden p-6 transition-colors hover:border-white/[0.14]', span || 'md:col-span-1', i === 1 && 'md:col-span-2')}>
              {big && <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-leaf-400/10 blur-3xl" />}
              <span className="relative grid h-11 w-11 place-items-center rounded-xl border border-leaf-400/20 bg-leaf-400/10 text-mint-300 transition-transform group-hover:scale-105"><Icon className="h-5 w-5" /></span>
              <h3 className={cx('relative mt-5', big ? 'text-xl' : 'text-base')}>{title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
              {big && (
                <div className="relative mt-6 flex h-16 items-end gap-1.5">
                  {[40, 55, 48, 70, 62, 85, 74, 66, 58, 52, 47, 44].map((h, j) => (
                    <motion.div key={j} className="flex-1 rounded-t bg-gradient-to-t from-leaf-500/40 to-lime-400/70"
                      initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: 0.3 + j * 0.04, duration: 0.6 }} />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function OfflineNote({ what }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <ServerOff className="h-6 w-6 text-zinc-500" />
      <p className="max-w-xs text-sm text-zinc-500">Start the backend (<span className="font-mono text-zinc-400">backend\run.ps1</span>) to see {what}.</p>
    </div>
  )
}

function AISection() {
  const { data, error, loading } = useApi(api.predictions)
  const m = data?.model
  return (
    <section id="ai" className="relative px-5 py-24 sm:px-8 lg:py-32">
      <div className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-sky-400/[0.06] blur-[100px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="AI-powered predictions" title="A real model, honestly evaluated"
            text="EcoTrack trains a scikit-learn Random Forest on synthetic monthly histories, splits them by time, and predicts the following month — no random numbers, no hidden formulas." />
          <motion.ul {...fadeUp} className="mt-8 space-y-4">
            {[
              ['Chronological split', 'Trained on earlier months, tested on later months it has never seen.'],
              ['No target leakage', 'Only information known at the end of a month is used to predict the next.'],
              ['Baseline comparison', 'Scored against a simple “same as this month” guess so the numbers mean something.'],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf-400" />
                <div><p className="font-semibold text-white">{t}</p><p className="text-sm text-zinc-400">{d}</p></div>
              </li>
            ))}
          </motion.ul>
        </div>
        <motion.div {...fadeUp} className="card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Live model card</p>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">Synthetic-data demo</span>
          </div>
          {loading ? <div className="skeleton mt-6 h-48 rounded-xl" /> : error || !m ? <OfflineNote what="live model metrics" /> : (
            <>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[['MAE', m.metrics.model.mae], ['RMSE', m.metrics.model.rmse], ['R²', m.metrics.model.r2]].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                    <p className="text-[11px] text-zinc-500">{l}</p><p className="num mt-1 text-xl font-bold text-white">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2 text-[13px]">
                {[
                  ['Algorithm', `Random Forest · ${m.hyperparameters.n_estimators} trees`],
                  ['Training records', `${m.data.monthly_records.toLocaleString()} synthetic months`],
                  ['Test window', m.data.test_target_months],
                  ['Baseline MAE', `${m.metrics.baseline_same_as_this_month.mae} kg CO₂e`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/[0.05] py-2"><span className="text-zinc-500">{k}</span><span className="text-zinc-200">{v}</span></div>
                ))}
              </div>
              {data.forecast && (
                <p className="mt-5 rounded-xl bg-sky-300/[0.07] px-4 py-3 text-[13px] text-sky-100">
                  Demo profile forecast for {monthLabel(data.forecast.predicted_month)}: <b className="num">{kg(data.forecast.predicted_emissions)} kg CO₂e</b>
                </p>
              )}
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}

const MODE_ICONS = { car_petrol: Car, car_diesel: Car, two_wheeler: Bike, bus: Bus, rail: TrainFront }

function ImpactSection() {
  const { data, error, loading } = useApi(api.factors)
  const modes = (data?.factors || []).filter((f) => MODE_ICONS[f.activity_type])
  const max = Math.max(...modes.map((f) => f.factor_value * 10), 1)
  const grid = data?.factors.find((f) => f.activity_type === 'electricity_grid_india')
  const lpg = data?.factors.find((f) => f.activity_type === 'lpg')
  return (
    <section id="impact" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHead eyebrow="Environmental impact" title="Small daily choices add up" center
          text="The same 10 km trip can produce very different emissions. These numbers come straight from the emission factors EcoTrack uses." />
        <div className="mt-14 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <motion.div {...fadeUp} className="card p-6 sm:p-8">
            <p className="text-sm font-semibold text-white">Emissions for a 10 km journey</p>
            <p className="text-xs text-zinc-500">kg CO₂e per person</p>
            {loading ? <div className="skeleton mt-6 h-56 rounded-xl" /> : error ? <OfflineNote what="the factor comparison" /> : (
              <div className="mt-7 space-y-4">
                {modes.map((f, i) => {
                  const Icon = MODE_ICONS[f.activity_type]
                  const v = f.factor_value * 10
                  return (
                    <div key={f.id} className="flex items-center gap-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-zinc-300"><Icon className="h-4 w-4" /></span>
                      <div className="flex-1">
                        <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-zinc-300">{f.label}</span><span className="num font-semibold text-white">{v.toFixed(2)}</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                          <motion.div className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-lime-400" initial={{ width: 0 }}
                            whileInView={{ width: `${(v / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.9 }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
          <div className="grid gap-4">
            {[
              { icon: PlugZap, title: '1 kWh of grid power in India', value: grid ? `${grid.factor_value} kg CO₂` : '—', note: grid ? `CEA CO₂ Baseline Database, ${grid.publication_year}` : '' },
              { icon: Leaf, title: 'One 14.2 kg LPG cylinder', value: lpg ? `${(lpg.factor_value * 14.2).toFixed(1)} kg CO₂` : '—', note: 'Derived from IPCC 2006 default factors' },
              { icon: Database, title: 'Your data, your device', value: 'Local SQLite', note: 'No accounts, no cloud, no tracking' },
            ].map(({ icon: Icon, title, value, note }, i) => (
              <motion.div key={title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="card flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-lime-400/20 bg-lime-400/10 text-lime-300"><Icon className="h-5 w-5" /></span>
                <div><p className="text-[13px] text-zinc-400">{title}</p><p className="num text-xl font-bold text-white">{value}</p><p className="text-[11px] text-zinc-500">{note}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewSection() {
  const { data, error, loading } = useApi(api.dashboard)
  const [tab, setTab] = useState('trend')
  const tabs = [['trend', 'Trend', LineChart], ['sources', 'Sources', BarChart3], ['forecast', 'Forecast', BrainCircuit]]
  const trend = data?.records?.map((r) => ({ month: r.month, total: r.total_emissions })) || []
  return (
    <section id="preview" className="px-5 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow="Interactive product preview" title="See the dashboard with live demo data" center
          text="This preview reads the same API as the app. Switch views below, then open the full dashboard." />
        <motion.div {...fadeUp} className="card mt-12 overflow-hidden p-2">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" /><span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="ml-4 flex gap-1 rounded-xl bg-ink-900/80 p-1">
              {tabs.map(([k, l, Icon]) => (
                <button key={k} onClick={() => setTab(k)} className={cx('relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', tab === k ? 'text-ink-950' : 'text-zinc-400 hover:text-white')}>
                  {tab === k && <motion.span layoutId="preview-tab" className="absolute inset-0 -z-0 rounded-lg bg-mint-300" />}
                  <Icon className="relative h-3.5 w-3.5" /><span className="relative">{l}</span>
                </button>
              ))}
            </div>
            <Link to="/app/dashboard" className="ml-auto hidden text-xs font-semibold text-leaf-400 hover:text-mint-300 sm:block">Open full dashboard →</Link>
          </div>
          <div className="p-5 sm:p-8">
            {loading ? <div className="skeleton h-72 rounded-xl" /> : error ? <OfflineNote what="the live preview" /> : !data?.has_data ? (
              <p className="py-16 text-center text-sm text-zinc-500">No records yet — add a month in the calculator to populate the preview.</p>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[['This month', data.kpis.monthly_total, 'kg'], ['Annual est.', data.kpis.annual_estimate / 1000, 't'], ['Forecast', data.kpis.predicted_next, 'kg'], ['Savings potential', data.kpis.potential_savings, 'kg']].map(([l, v, u]) => (
                      <div key={l} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                        <p className="text-[11px] text-zinc-500">{l}</p>
                        <p className="num mt-1 text-lg font-bold text-white">{v === null ? '—' : kg(v, u === 't' ? 2 : 1)} <span className="text-[11px] font-normal text-zinc-500">{u}</span></p>
                      </div>
                    ))}
                  </div>
                  {tab === 'trend' && <TrendAreaChart data={trend} height={300} />}
                  {tab === 'sources' && <div className="mx-auto max-w-sm"><SourcesDonut breakdown={data.breakdown} /></div>}
                  {tab === 'forecast' && <ActualPredictedChart history={trend.map((t) => ({ month: t.month, actual: t.total }))} backtest={data.actual_vs_predicted} forecast={data.forecast} height={300} />}
                  {data.is_demo_data && <p className="mt-4 text-center text-[11px] text-zinc-500">Showing clearly-labelled demo records from the local database.</p>}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function FinalCTA({ onStart }) {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <motion.div {...fadeUp} className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-leaf-400/20 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 px-6 py-16 text-center sm:px-16">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-leaf-400/20 blur-[90px]" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-5xl">Your first footprint takes <span className="text-gradient">two minutes.</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">Grab last month’s electricity bill, estimate how far you travelled, and see where your emissions really come from.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={onStart}><Calculator className="h-4 w-4" /> Start Calculating</Button>
            <Link to="/app/methodology"><Button size="lg" variant="secondary"><BookOpen className="h-4 w-4" /> Read the methodology</Button></Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-5 py-12 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">Intelligent personal carbon footprint prediction & reduction platform. A college environmental-technology prototype.</p>
          <p className="mt-4 flex items-center gap-2 text-xs text-zinc-600"><Lock className="h-3.5 w-3.5" /> Local demo · no login · no tracking</p>
        </div>
        {[
          ['Product', [['Dashboard', '/app/dashboard'], ['Calculator', '/app/calculator'], ['AI Prediction', '/app/predict']]],
          ['Act', [['Reduction advisor', '/app/advisor'], ['History', '/app/history']]],
          ['Learn', [['Methodology', '/app/methodology'], ['How it works', '#how'], ['Impact', '#impact']]],
        ].map(([title, links]) => (
          <div key={title}>
            <p className="text-[13px] font-semibold text-white">{title}</p>
            <ul className="mt-4 space-y-2.5">
              {links.map(([l, to]) => (
                <li key={l}>{to.startsWith('#') ? <a href={to} className="text-sm text-zinc-500 hover:text-white">{l}</a> : <Link to={to} className="text-sm text-zinc-500 hover:text-white">{l}</Link>}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-white/[0.05] pt-6 text-xs text-zinc-600 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} EcoTrack AI · Built with React, Flask, SQLite & scikit-learn</p>
        <p className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> Repository link: add yours in ASSIGNMENT.md</p>
      </div>
    </footer>
  )
}
