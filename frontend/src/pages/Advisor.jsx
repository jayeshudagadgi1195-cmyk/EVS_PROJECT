import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bus, Calculator, Car, Flame, Info, RotateCcw, SlidersHorizontal, Sparkles, Sun, TreePine, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { CATEGORY_META, kg, monthLabel } from '../lib/format'
import { AnimatedNumber, Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, Slider, Spinner, cx } from '../components/ui/Primitives'
import { RecommendationCard } from '../components/ui/Cards'

const ZERO = { car_reduction_pct: 0, pt_substitution_pct: 0, electricity_reduction_pct: 0, lpg_reduction_pct: 0, renewable_pct: null }
const PRESETS = [
  { name: 'Commuter switch', levers: { car_reduction_pct: 10, pt_substitution_pct: 40, electricity_reduction_pct: 0, lpg_reduction_pct: 0 } },
  { name: 'Efficient home', levers: { car_reduction_pct: 0, pt_substitution_pct: 0, electricity_reduction_pct: 20, lpg_reduction_pct: 10 } },
  { name: 'All in', levers: { car_reduction_pct: 20, pt_substitution_pct: 40, electricity_reduction_pct: 25, lpg_reduction_pct: 15, renewable_pct: 50 } },
]

export default function Advisor() {
  const { data, loading, error, reload } = useApi(api.recommendations)
  const [levers, setLevers] = useState(ZERO)
  const [sim, setSim] = useState(null)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!data?.has_data) return
    setSimLoading(true)
    const t = setTimeout(async () => {
      try {
        const body = Object.fromEntries(Object.entries(levers).filter(([, v]) => v !== null))
        setSim(await api.simulate(body))
        setSimError(null)
      } catch (e) {
        setSimError(e.message)
      } finally {
        setSimLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [levers, data])

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.has_data)
    return (
      <>
        <PageHeader eyebrow="Reduction advisor" title="Personalised reduction plan" />
        <EmptyState icon={Sparkles} title="Nothing to analyse yet" text="Save at least one month in the calculator and the advisor will rank the changes that cut the most CO₂e."
          action={<Button icon={Calculator} onClick={() => navigate('/app/calculator')}>Open calculator</Button>} />
      </>
    )

  const set = (k) => (v) => setLevers((l) => {
    const next = { ...l, [k]: v }
    if (next.car_reduction_pct + next.pt_substitution_pct > 100) {
      if (k === 'car_reduction_pct') next.pt_substitution_pct = 100 - v
      else next.car_reduction_pct = 100 - v
    }
    return next
  })
  const baseline = data.baseline
  const hasCar = baseline.vehicle_type === 'car' && baseline.car_km > 0
  const currentRenewable = baseline.renewable_pct
  const renewableValue = levers.renewable_pct ?? currentRenewable

  return (
    <div>
      <PageHeader eyebrow="Reduction advisor" title="Your personalised reduction plan"
        description={`Based on your latest saved month (${monthLabel(baseline.month)}). Tips are ranked by how much CO₂e they would save.`}
        actions={<Badge tone="green"><Info className="h-3 w-3" /> Rule-based & explainable — not ML</Badge>} />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card className="card-pad">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold">Recommended actions</h3>
                <p className="mt-0.5 text-xs text-zinc-500">Adopting the best tip in each category saves about <b className="text-mint-300">{kg(data.potential_savings)} kg CO₂e</b> a month</p>
              </div>
              <div className="flex gap-1.5">
                {data.breakdown.filter((c) => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 3).map((c) => (
                  <span key={c.key} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-400">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CATEGORY_META[c.key].color }} />{c.label} {c.share}%
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {data.recommendations.map((r, i) => <RecommendationCard key={r.title} rec={r} index={i} />)}
            </div>
            <p className="mt-4 text-[11px] text-zinc-500">{data.method}</p>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card className="card-pad">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold"><SlidersHorizontal className="h-4 w-4 text-leaf-400" /> Carbon reduction simulator</h3>
              {simLoading && <Spinner />}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => setLevers({ ...ZERO, ...p.levers })}
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-leaf-400/40 hover:text-mint-300">
                  {p.name}
                </button>
              ))}
              <button onClick={() => setLevers(ZERO)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:text-white">
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div className={cx(!hasCar && 'pointer-events-none opacity-40')}>
                <Slider label="Cut car travel" icon={Car} value={levers.car_reduction_pct} onChange={set('car_reduction_pct')}
                  helper={hasCar ? `Removes ${kg((baseline.car_km * levers.car_reduction_pct) / 100, 0)} of ${kg(baseline.car_km, 0)} km` : 'No car travel in your latest month'} />
              </div>
              <div className={cx(!hasCar && 'pointer-events-none opacity-40')}>
                <Slider label="Shift car km to public transport" icon={Bus} value={levers.pt_substitution_pct} onChange={set('pt_substitution_pct')}
                  helper={hasCar ? `Moves ${kg((baseline.car_km * levers.pt_substitution_pct) / 100, 0)} km to ${baseline.public_transport_mode === 'rail' ? 'metro/rail' : 'bus'}` : undefined} />
              </div>
              <Slider label="Reduce electricity use" icon={Zap} value={levers.electricity_reduction_pct} onChange={set('electricity_reduction_pct')} />
              <Slider label="Reduce LPG use" icon={Flame} value={levers.lpg_reduction_pct} onChange={set('lpg_reduction_pct')} />
              <Slider label="Renewable electricity share" icon={Sun} value={renewableValue} onChange={set('renewable_pct')}
                helper={`Currently ${currentRenewable}%`} />
            </div>

            {simError && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">{simError}</p>}
            {sim && (
              <div className="mt-7 border-t border-white/[0.06] pt-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                    <p className="text-[11px] text-zinc-500">Current</p>
                    <p className="num mt-1 text-xl font-bold text-white">{kg(sim.current.total_emissions)}</p>
                    <p className="text-[10px] text-zinc-500">kg CO₂e / month</p>
                  </div>
                  <div className="rounded-xl border border-leaf-400/25 bg-leaf-400/[0.07] p-3">
                    <p className="text-[11px] text-mint-300/80">Scenario</p>
                    <p className="num mt-1 text-xl font-bold text-mint-300">{kg(sim.scenario.total_emissions)}</p>
                    <p className="text-[10px] text-zinc-500">kg CO₂e / month</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-gradient-to-br from-leaf-400/15 via-leaf-400/5 to-transparent p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-zinc-400">Monthly savings</p>
                      <p className="text-3xl font-bold text-white"><AnimatedNumber value={sim.monthly_savings} /> <span className="text-sm font-medium text-zinc-500">kg</span></p>
                    </div>
                    <div className="text-right">
                      <p className="num text-2xl font-bold text-leaf-400">{sim.percent_reduction > 0 ? `−${sim.percent_reduction}` : sim.percent_reduction < 0 ? `+${Math.abs(sim.percent_reduction)}` : '0'}%</p>
                      <p className="text-[11px] text-zinc-500">reduction</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-lime-400" animate={{ width: `${Math.min(sim.percent_reduction, 100)}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-[13px] text-zinc-300">
                    <TreePine className="h-4 w-4 text-lime-400" /> <b className="num text-white">{kg(sim.annual_savings, 0)} kg</b> CO₂e saved per year
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {sim.current.categories.map((c) => {
                    const after = sim.scenario.categories.find((x) => x.key === c.key).value
                    const max = Math.max(...sim.current.categories.map((x) => x.value), 1)
                    return (
                      <div key={c.key} className="text-[11px]">
                        <div className="mb-1 flex justify-between text-zinc-400"><span>{c.label}</span><span className="num">{kg(c.value)} → <b className="text-white">{kg(after)}</b></span></div>
                        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="absolute inset-y-0 left-0 rounded-full bg-white/10" style={{ width: `${(c.value / max) * 100}%` }} />
                          <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: CATEGORY_META[c.key].color }}
                            animate={{ width: `${(after / max) * 100}%` }} transition={{ duration: 0.4 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{sim.method}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
