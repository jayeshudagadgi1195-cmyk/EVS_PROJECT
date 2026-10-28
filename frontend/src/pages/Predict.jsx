import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BrainCircuit, Calculator, CheckCircle2, Database, FlaskConical, GitBranch,
  Info, Save, SplitSquareHorizontal, Target,
} from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { kg, monthLabel, timeAgo } from '../lib/format'
import { AnimatedNumber, Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, cx } from '../components/ui/Primitives'
import { useToast } from '../components/ui/Feedback'
import { ActualPredictedChart, ChartCard } from '../components/charts/Charts'

const FEATURE_LABELS = {
  current_emissions: 'This month’s total',
  previous_emissions: 'Last month’s total',
  electricity_emissions: 'Electricity emissions',
  transport_emissions: 'Transport emissions',
  cooking_emissions: 'Cooking emissions',
  electricity_kwh: 'Electricity (kWh)',
  car_km: 'Car distance',
  two_wheeler_km: 'Two-wheeler distance',
  public_transport_km: 'Public transport distance',
  lpg_kg: 'LPG (kg)',
  household_members: 'Household size',
  renewable_pct: 'Renewable share',
  target_month_sin: 'Season (sin)',
  target_month_cos: 'Season (cos)',
}

export default function Predict() {
  const { data, loading, error, reload } = useApi(api.predictions)
  const [running, setRunning] = useState(false)
  const notify = useToast()
  const navigate = useNavigate()

  const run = async () => {
    setRunning(true)
    try {
      const r = await api.predict()
      notify(`Predicted ${kg(r.forecast.predicted_emissions)} kg CO₂e for ${monthLabel(r.forecast.predicted_month)}.`, 'success', 'Forecast saved')
      reload(true)
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} />

  const { model, forecast: fc, history, saved_predictions: saved } = data
  const m = model.metrics.model
  const base = model.metrics.baseline_same_as_this_month
  const improvement = base.mae > 0 ? ((base.mae - m.mae) / base.mae) * 100 : 0
  const maxImp = model.feature_importances[0]?.importance || 1

  return (
    <div>
      <PageHeader eyebrow="AI emission prediction" title="Next-month forecast"
        description="A scikit-learn Random Forest predicts next month’s emissions from this month’s activities, last month’s total and the season."
        actions={<>
          <Badge tone="amber"><FlaskConical className="h-3 w-3" /> Synthetic-data demonstration</Badge>
          {fc && <Button icon={Save} loading={running} onClick={run}>Generate & save forecast</Button>}
        </>} />

      {!fc ? (
        <EmptyState icon={BrainCircuit} title="No records to forecast from" text={data.forecast_error}
          action={<Button icon={Calculator} onClick={() => navigate('/app/calculator')}>Add a month</Button>} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="card-pad relative overflow-hidden lg:col-span-1">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(400px_200px_at_80%_0%,rgba(125,211,252,0.12),transparent)]" />
              <p className="relative text-[13px] font-medium text-zinc-400">Predicted for {monthLabel(fc.predicted_month)}</p>
              <p className="relative mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white"><AnimatedNumber value={fc.predicted_emissions} /></span>
                <span className="text-sm text-zinc-500">kg CO₂e</span>
              </p>
              <div className="relative mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <p className="text-[11px] text-zinc-500">Current ({monthLabel(fc.based_on_month, false)})</p>
                  <p className="num mt-1 text-lg font-semibold text-white">{kg(fc.current_emissions)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                  <p className="text-[11px] text-zinc-500">Expected change</p>
                  <p className={cx('num mt-1 flex items-center gap-1 text-lg font-semibold', fc.change > 0 ? 'text-amber-300' : 'text-leaf-400')}>
                    {fc.change > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {fc.change_pct === null ? '—' : `${Math.abs(fc.change_pct)}%`}
                  </p>
                </div>
              </div>
              <div className={cx('relative mt-4 flex gap-2.5 rounded-xl border p-3 text-xs leading-relaxed',
                fc.basis === 'personal' ? 'border-sky-300/15 bg-sky-300/[0.05] text-zinc-400' : 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100/90')}>
                {fc.basis === 'personal' ? <Info className="h-4 w-4 shrink-0 text-sky-300" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />}
                {fc.note}
              </div>
            </Card>

            <ChartCard className="lg:col-span-2" title="Historical vs predicted"
              subtitle={`Solid: actual · Dashed: model back-test${fc.backtest_mae !== null ? ` (avg error ${kg(fc.backtest_mae)} kg on your data)` : ''} · Dot: forecast`}>
              <ActualPredictedChart history={history} backtest={fc.backtest} forecast={fc} height={300} />
            </ChartCard>
          </div>
        </>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="card-pad lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold">Model evaluation <span className="font-normal text-zinc-500">· held-out synthetic months</span></h3>
            <Badge tone="sky">{model.model_version}</Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="MAE" value={m.mae} unit="kg CO₂e" hint="Average size of the error" />
            <Metric label="RMSE" value={m.rmse} unit="kg CO₂e" hint="Penalises big misses more" />
            <Metric label="R²" value={m.r2} unit="" digits={3} hint="Share of variation explained" />
          </div>
          <div className="mt-5 rounded-xl border border-white/[0.07] bg-ink-900/60 p-4">
            <p className="text-[13px] font-medium text-zinc-300">Compared with a simple baseline (“next month = this month”)</p>
            <div className="mt-3 space-y-2.5">
              {[['Random Forest', m.mae, '#34d399'], ['Naive baseline', base.mae, '#52525b']].map(([name, v, color]) => (
                <div key={name} className="flex items-center gap-3 text-xs">
                  <span className="w-28 text-zinc-400">{name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }}
                      animate={{ width: `${(v / Math.max(m.mae, base.mae)) * 100}%` }} transition={{ duration: 0.9 }} />
                  </div>
                  <span className="num w-20 text-right text-white">MAE {v}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              The model’s error is {Math.abs(improvement).toFixed(1)}% {improvement >= 0 ? 'lower' : 'higher'} than the baseline on synthetic test data.
            </p>
          </div>
          <div className="mt-5 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            <InfoRow icon={GitBranch} label="Algorithm" value={`${model.algorithm}, ${model.hyperparameters.n_estimators} trees`} />
            <InfoRow icon={Database} label="Training data" value={`${model.data.monthly_records.toLocaleString()} synthetic monthly records · ${model.data.synthetic_users} users`} />
            <InfoRow icon={SplitSquareHorizontal} label="Split" value={`Chronological: train ${model.data.train_target_months}, test ${model.data.test_target_months}`} />
            <InfoRow icon={Target} label="Target" value="Next month’s total emissions (kg CO₂e)" />
          </div>
        </Card>

        <Card className="card-pad">
          <h3 className="text-[15px] font-semibold">What the model relies on</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Random Forest feature importance</p>
          <div className="mt-5 space-y-3">
            {model.feature_importances.slice(0, 8).map((f, i) => (
              <div key={f.feature}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-zinc-400">{FEATURE_LABELS[f.feature] || f.feature}</span>
                  <span className="num text-zinc-300">{(f.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-lime-400" initial={{ width: 0 }}
                    animate={{ width: `${(f.importance / maxImp) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="card-pad">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold"><AlertTriangle className="h-4 w-4 text-amber-300" /> Model limitations</h3>
          <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-zinc-400">
            {[
              'Trained only on synthetic (computer-generated) data, not on real people’s records.',
              'Good scores on synthetic test data do not prove real-world accuracy.',
              'It learns typical patterns (seasons, habits); it cannot know about trips, guests or new appliances you haven’t logged.',
              'Uses only the latest two months as input, so it reacts slowly to big lifestyle changes.',
              'Emission factors are averages; real emissions vary by vehicle, grid region and appliance.',
            ].map((t) => (
              <li key={t} className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />{t}</li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-ink-900/70 px-3 py-2 text-[11px] text-zinc-500">{model.disclaimer}</p>
        </Card>

        <Card className="card-pad">
          <h3 className="text-[15px] font-semibold">Saved forecasts</h3>
          {saved.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">No forecasts saved yet. Use “Generate & save forecast” to store one in the database.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr><th className="pb-2 font-medium">For month</th><th className="pb-2 font-medium">Predicted</th><th className="pb-2 font-medium">History used</th><th className="pb-2 text-right font-medium">Created</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {saved.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 text-white">{monthLabel(p.predicted_month)}</td>
                      <td className="num py-2.5 text-white">{kg(p.predicted_emissions)} kg</td>
                      <td className="py-2.5 text-zinc-400">{p.history_months} months</td>
                      <td className="py-2.5 text-right text-zinc-500">{timeAgo(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500"><CheckCircle2 className="h-3.5 w-3.5 text-leaf-400" /> Predictions come from the trained model file, never from random numbers.</div>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value, unit, hint, digits = 2 }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1"><span className="text-2xl font-bold text-white"><AnimatedNumber value={value} digits={digits} /></span><span className="text-[11px] text-zinc-500">{unit}</span></p>
      <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
      <div><p className="text-[11px] text-zinc-500">{label}</p><p className="text-zinc-300">{value}</p></div>
    </div>
  )
}
