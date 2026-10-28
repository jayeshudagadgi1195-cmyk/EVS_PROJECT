import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, BrainCircuit, CalendarRange, Database, Download, Flame, Info, Leaf, Sparkles, TrendingDown,
  TrendingUp, Zap,
} from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { CATEGORY_META, kg, monthLabel, pct, timeAgo, tonnes } from '../lib/format'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, cx } from '../components/ui/Primitives'
import { KpiCard, RecommendationCard } from '../components/ui/Cards'
import { useToast } from '../components/ui/Feedback'
import { ActualPredictedChart, ChartCard, ElecTransportBar, SourcesDonut, TrendAreaChart } from '../components/charts/Charts'

const TONE = {
  positive: { icon: TrendingDown, cls: 'text-leaf-400 bg-leaf-400/10 border-leaf-400/20' },
  warning: { icon: TrendingUp, cls: 'text-amber-300 bg-amber-300/10 border-amber-300/20' },
  info: { icon: Info, cls: 'text-sky-300 bg-sky-300/10 border-sky-300/20' },
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(api.dashboard)
  const navigate = useNavigate()
  const notify = useToast()
  const [restoring, setRestoring] = useState(false)

  const restore = async () => {
    setRestoring(true)
    try {
      const r = await api.resetDemo()
      notify(r.message, 'success')
      reload()
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data.has_data)
    return (
      <>
        <PageHeader eyebrow="Overview" title="Your carbon overview" />
        <EmptyState icon={Leaf} title="No footprint records yet"
          text="Calculate your first month to unlock the dashboard, AI forecast and personalised recommendations — or restore the demo records to explore."
          action={<div className="flex flex-wrap justify-center gap-2">
            <Button icon={ArrowRight} onClick={() => navigate('/app/calculator')}>Start calculating</Button>
            <Button variant="secondary" icon={Database} loading={restoring} onClick={restore}>Restore demo data</Button>
          </div>} />
      </>
    )

  const { kpis, records, breakdown, largest_contributor: largest, comparison, insights, recent_activity, recommendations, forecast } = data
  const trend = records.map((r) => ({ month: r.month, total: r.total_emissions }))

  return (
    <div>
      <PageHeader
        eyebrow={`Overview · ${monthLabel(kpis.monthly_month)}`}
        title={`Welcome back, ${data.user.display_name}`}
        description="Every figure below is calculated from the records saved in your local database."
        actions={<>
          <a href={api.exportUrl()} download><Button variant="secondary" size="sm" icon={Download}>Export CSV</Button></a>
          <Button size="sm" variant="secondary" icon={Sparkles} onClick={() => navigate('/app/advisor')}>Reduce emissions</Button>
        </>}
      />

      {data.is_demo_data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-lime-400/15 bg-lime-400/[0.05] px-4 py-3 text-[13px] text-lime-100/90 sm:flex-row sm:items-center">
          <Database className="h-4 w-4 shrink-0 text-lime-300" />
          <p className="flex-1">You are viewing <b>demo records</b> (labelled “Demo” in History). Add your own months in the calculator or delete demo rows any time.</p>
          <Link to="/app/history" className="font-semibold text-lime-300 hover:text-lime-200">Manage records →</Link>
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Activity} label="Monthly footprint" value={kpis.monthly_total} change={kpis.monthly_change_pct}
          changeLabel="vs previous month" delay={0} />
        <KpiCard icon={CalendarRange} label="Estimated annual" value={kpis.annual_estimate / 1000} unit="t CO₂e" digits={2}
          accent="lime" footnote={kpis.annual_method} delay={0.05} />
        <KpiCard icon={BrainCircuit} label={`Predicted · ${kpis.predicted_month ? monthLabel(kpis.predicted_month) : 'next month'}`}
          value={kpis.predicted_next} change={kpis.predicted_change_pct} changeLabel="Random Forest forecast" accent="sky"
          footnote={kpis.prediction_error || undefined} delay={0.1} />
        <KpiCard icon={Leaf} label="Potential savings" value={kpis.potential_savings} unit="kg / month" accent="amber"
          changeLabel={`${kpis.potential_savings_pct}% of this month · top tip per category`} delay={0.15} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Monthly carbon emission trend" subtitle={`Total kg CO₂e · ${records.length} months`} delay={0.1}>
          <TrendAreaChart data={trend} height={360} />
        </ChartCard>
        <ChartCard title="Emission sources" subtitle={monthLabel(kpis.monthly_month)} delay={0.15}>
          <SourcesDonut breakdown={breakdown} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Electricity vs transportation" subtitle="kg CO₂e per month" delay={0.1}>
          <ElecTransportBar records={records} height={330} />
        </ChartCard>
        <div className="flex flex-col gap-4">
          <Card delay={0.15} className="card-pad relative overflow-hidden">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl" style={{ background: `${CATEGORY_META[largest.key].color}33` }} />
            <p className="text-[13px] font-medium text-zinc-400">Largest contributor</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${CATEGORY_META[largest.key].color}1f`, color: CATEGORY_META[largest.key].color }}>
                {largest.key === 'electricity' ? <Zap className="h-5 w-5" /> : largest.key === 'cooking' ? <Flame className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-lg font-semibold text-white">{largest.label}</p>
                <p className="num text-[13px] text-zinc-400">{kg(largest.value)} kg · {largest.share}% of total</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="h-full rounded-full" style={{ background: CATEGORY_META[largest.key].color }}
                initial={{ width: 0 }} animate={{ width: `${largest.share}%` }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </Card>
          <Card delay={0.2} className="card-pad flex-1">
            <h3 className="text-[15px] font-semibold">Sustainability insights</h3>
            <ul className="mt-4 space-y-3">
              {insights.slice(0, 3).map((ins, i) => {
                const t = TONE[ins.tone] || TONE.info
                const Icon = t.icon
                return (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }} className="flex gap-3">
                    <span className={cx('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border', t.cls)}><Icon className="h-3.5 w-3.5" /></span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">{ins.title}</p>
                      <p className="text-xs leading-relaxed text-zinc-500">{ins.text}</p>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Actual vs predicted emissions"
          subtitle="Back-test: each month predicted by the model from the month before it"
          actions={<Link to="/app/predict" className="text-xs font-semibold text-leaf-400 hover:text-mint-300">Model details →</Link>} delay={0.1}>
          {data.actual_vs_predicted.length ? (
            <ActualPredictedChart backtest={data.actual_vs_predicted} history={trend.map((t) => ({ month: t.month, actual: t.total }))} forecast={forecast} />
          ) : (
            <p className="py-16 text-center text-sm text-zinc-500">{kpis.prediction_error || 'Save at least two consecutive months to compare predictions with actual values.'}</p>
          )}
        </ChartCard>
        <Card delay={0.15} className="card-pad">
          <h3 className="text-[15px] font-semibold">Monthly comparison</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {monthLabel(kpis.monthly_month)} vs {data.previous ? monthLabel(data.previous.month) : 'no previous month'}
          </p>
          <div className="mt-4 divide-y divide-white/[0.05]">
            {comparison.map((row) => (
              <div key={row.key} className={cx('flex items-center justify-between py-2.5 text-[13px]', row.key === 'total' && 'font-semibold')}>
                <span className="flex items-center gap-2 text-zinc-300">
                  {row.key !== 'total' && <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_META[row.key].color }} />}
                  {row.label}
                </span>
                <span className="flex items-center gap-3">
                  <span className="num text-white">{kg(row.current)}</span>
                  <span className={cx('num w-16 text-right text-xs',
                    row.change_pct === null ? 'text-zinc-600' : row.change_pct > 0 ? 'text-amber-300' : 'text-leaf-400')}>
                    {pct(row.change_pct)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card delay={0.1} className="card-pad lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Personalised recommendations</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Ranked by estimated monthly saving for {monthLabel(kpis.monthly_month)}</p>
            </div>
            <Link to="/app/advisor" className="text-xs font-semibold text-leaf-400 hover:text-mint-300">Open advisor →</Link>
          </div>
          <div className="space-y-2.5">
            {recommendations.map((r, i) => <RecommendationCard key={r.title} rec={r} index={i} compact />)}
          </div>
        </Card>
        <Card delay={0.15} className="card-pad">
          <h3 className="text-[15px] font-semibold">Recent activity</h3>
          <ol className="relative mt-4 space-y-4 border-l border-white/[0.07] pl-5">
            {recent_activity.map((e, i) => (
              <li key={i} className="relative">
                <span className={cx('absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-ink-950', e.type === 'prediction' ? 'bg-sky-300' : 'bg-leaf-400')} />
                <p className="text-[13px] font-medium text-white">{e.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                  {e.detail} · {timeAgo(e.timestamp)} {e.is_demo && <Badge tone="lime">Demo</Badge>}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[11px] text-zinc-600">Annual estimate: {tonnes(kpis.annual_estimate)} t CO₂e</p>
        </Card>
      </div>
    </div>
  )
}
