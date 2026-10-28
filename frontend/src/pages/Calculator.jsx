import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Bike, Bus, Car, Check, CheckCircle2, Flame, Fuel, Home, Leaf, RotateCcw, Save, TrainFront,
  Users, Zap, Ban, BatteryCharging,
} from 'lucide-react'
import { api } from '../lib/api'
import { CATEGORY_META, currentMonth, kg, monthLabel, tonnes } from '../lib/format'
import { Badge, Button, Card, Field, NumberInput, PageHeader, Segmented, Slider, Spinner, cx } from '../components/ui/Primitives'
import { ConfirmModal, useToast } from '../components/ui/Feedback'
import { RecommendationCard } from '../components/ui/Cards'

const STEPS = [
  { key: 'transport', label: 'Transportation', icon: Car },
  { key: 'electricity', label: 'Electricity', icon: Zap },
  { key: 'cooking', label: 'Cooking fuel', icon: Flame },
  { key: 'results', label: 'Results', icon: Leaf },
]

const INITIAL = {
  month: currentMonth(),
  vehicle_type: 'car',
  fuel_type: 'petrol',
  car_km: '400',
  two_wheeler_km: '0',
  public_transport_km: '100',
  public_transport_mode: 'bus',
  electricity_kwh: '220',
  household_members: '3',
  renewable_pct: 0,
  lpg_kg: '14.2',
}

const toPayload = (f) => ({
  ...f,
  car_km: Number(f.car_km || 0),
  two_wheeler_km: Number(f.two_wheeler_km || 0),
  public_transport_km: Number(f.public_transport_km || 0),
  electricity_kwh: Number(f.electricity_kwh || 0),
  household_members: Number(f.household_members || 1),
  renewable_pct: Number(f.renewable_pct || 0),
  lpg_kg: Number(f.lpg_kg || 0),
  fuel_type: f.vehicle_type === 'car' ? f.fuel_type : null,
})

function clientErrors(f) {
  const e = {}
  for (const k of ['car_km', 'two_wheeler_km', 'public_transport_km', 'electricity_kwh', 'lpg_kg']) {
    if (f[k] !== '' && (Number.isNaN(Number(f[k])) || Number(f[k]) < 0)) e[k] = 'Enter a number of 0 or more.'
  }
  const m = Number(f.household_members)
  if (!Number.isInteger(m) || m < 1) e.household_members = 'Enter a whole number of at least 1.'
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(f.month || '')) e.month = 'Pick a month.'
  return e
}

export default function CalculatorPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL)
  const [live, setLive] = useState(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)
  const [dupOpen, setDupOpen] = useState(false)
  const notify = useToast()
  const navigate = useNavigate()

  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(null) }
  const localErrors = useMemo(() => clientErrors(form), [form])
  const errors = { ...fieldErrors, ...localErrors }

  // Live estimate from the real backend calculator (debounced)
  useEffect(() => {
    const { month, ...rest } = localErrors
    if (Object.keys(rest).length) return
    setLiveLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.calculate(toPayload(form))
        setLive(res)
        setServerError(null)
        setFieldErrors({})
      } catch (e) {
        setServerError(e.message)
        setFieldErrors(e.details || {})
      } finally {
        setLiveLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [form, localErrors])

  const stepErrors = {
    0: ['car_km', 'two_wheeler_km', 'public_transport_km'],
    1: ['electricity_kwh', 'household_members'],
    2: ['lpg_kg'],
  }
  const canContinue = !(stepErrors[step] || []).some((k) => errors[k])

  const save = async (replace = false) => {
    if (errors.month) { notify('Choose a valid month before saving.', 'error'); return }
    setSaving(true)
    try {
      const res = await api.saveActivity(toPayload(form), replace)
      setSaved(res.record)
      setDupOpen(false)
      notify(`Footprint for ${monthLabel(form.month)} saved to your history.`, 'success', 'Saved')
    } catch (e) {
      if (e.status === 409) setDupOpen(true)
      else notify(e.message, 'error', 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const result = live?.result

  return (
    <div>
      <PageHeader eyebrow="Carbon calculator" title="Calculate your monthly footprint"
        description="Emissions = activity × emission factor. Every factor comes from a published source — see Methodology." />

      {/* Stepper */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          const Icon = s.icon
          return (
            <button key={s.key} onClick={() => (i <= step || canContinue) && setStep(i)}
              className={cx('group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors sm:px-4',
                active ? 'border-leaf-400/30 bg-leaf-400/[0.07]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15')}>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition-colors',
                done ? 'bg-leaf-400 text-ink-950' : active ? 'bg-mint-300/15 text-mint-300' : 'bg-white/[0.05] text-zinc-500')}>
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block text-[11px] text-zinc-500">Step {i + 1}</span>
                <span className={cx('block truncate text-[13px] font-semibold', active || done ? 'text-white' : 'text-zinc-400')}>{s.label}</span>
              </span>
              {active && <motion.span layoutId="step-bar" className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-leaf-400 to-lime-400" />}
            </button>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="card-pad sm:p-8">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={step}
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 1, x: 0 }}
              transition={{ duration: 0 }}
            >
              {step === 0 && (
                <div className="space-y-6">
                  <StepTitle icon={Car} title="Transportation" text="Distances you personally travel in a typical month." />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field as="div" label="Vehicle type">
                      <Segmented value={form.vehicle_type} onChange={set('vehicle_type')}
                        options={[{ value: 'car', label: 'Car', icon: Car }, { value: 'none', label: 'No car', icon: Ban }]} />
                    </Field>
                    <Field as="div" label="Fuel type" hint={form.vehicle_type === 'none' ? 'Not needed' : undefined}>
                      <div className={cx(form.vehicle_type === 'none' && 'pointer-events-none opacity-40')}>
                        <Segmented value={form.fuel_type} onChange={set('fuel_type')}
                          options={[{ value: 'petrol', label: 'Petrol', icon: Fuel }, { value: 'diesel', label: 'Diesel' }, { value: 'electric', label: 'EV', icon: BatteryCharging }]} />
                      </div>
                    </Field>
                  </div>
                  {form.vehicle_type === 'car' && (
                    <Field label="Monthly car distance" error={errors.car_km} suffix="km / month"
                      hint={form.fuel_type === 'electric' ? 'EV energy use is an illustrative 0.15 kWh/km' : undefined}>
                      <NumberInput value={form.car_km} onChange={set('car_km')} placeholder="0" />
                    </Field>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Public transport distance" error={errors.public_transport_km} suffix="km / month">
                      <NumberInput value={form.public_transport_km} onChange={set('public_transport_km')} placeholder="0" />
                    </Field>
                    <Field as="div" label="Public transport mode">
                      <Segmented value={form.public_transport_mode} onChange={set('public_transport_mode')}
                        options={[{ value: 'bus', label: 'Bus', icon: Bus }, { value: 'rail', label: 'Metro / rail', icon: TrainFront }]} />
                    </Field>
                  </div>
                  <Field label={<span className="flex items-center gap-2"><Bike className="h-4 w-4 text-zinc-500" />Two-wheeler distance <Badge>Optional</Badge></span>}
                    error={errors.two_wheeler_km} suffix="km / month">
                    <NumberInput value={form.two_wheeler_km} onChange={set('two_wheeler_km')} placeholder="0" />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <StepTitle icon={Zap} title="Household electricity" text="Use the kWh units shown on your monthly electricity bill." />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Monthly electricity use" error={errors.electricity_kwh} suffix="kWh / month">
                      <NumberInput value={form.electricity_kwh} onChange={set('electricity_kwh')} placeholder="0" />
                    </Field>
                    <Field label={<span className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-500" />People in household</span>} error={errors.household_members}>
                      <NumberInput value={form.household_members} onChange={set('household_members')} step="1" min="1" />
                    </Field>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-ink-900/60 p-5">
                    <Slider label="Renewable electricity share (optional)" value={form.renewable_pct} onChange={set('renewable_pct')}
                      icon={Home} helper="Rooftop solar or a certified green tariff. Renewable kWh are counted as zero-emission." />
                  </div>
                  <InfoNote>
                    <b className="text-white">Allocated share:</b> the household’s electricity is divided equally between {form.household_members || 1} {Number(form.household_members) === 1 ? 'person' : 'people'}, so results show <b className="text-white">your individual share</b>, not the whole household total.
                  </InfoNote>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <StepTitle icon={Flame} title="Cooking fuel" text="LPG used by your household in a month." />
                  <Field label="LPG consumption" error={errors.lpg_kg} suffix="kg / month">
                    <NumberInput value={form.lpg_kg} onChange={set('lpg_kg')} placeholder="0" step="0.1" />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {[0, 0.5, 1, 1.5, 2].map((c) => (
                      <button key={c} type="button" onClick={() => set('lpg_kg')(String(+(c * 14.2).toFixed(1)))}
                        className={cx('rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                          Number(form.lpg_kg) === +(c * 14.2).toFixed(1) ? 'border-leaf-400/40 bg-leaf-400/10 text-mint-300' : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-white')}>
                        {c === 0 ? 'None' : `${c} cylinder${c > 1 ? 's' : ''}`}
                      </button>
                    ))}
                  </div>
                  <InfoNote>
                    A domestic Indian cylinder holds 14.2 kg. LPG is shared by the household, so it is also divided between {form.household_members || 1} {Number(form.household_members) === 1 ? 'person' : 'people'}. Induction or electric cooking is already counted in your electricity use. Other fuels (PNG, firewood) are not included because we did not have a verified factor in matching units.
                  </InfoNote>
                </div>
              )}

              {step === 3 && (
                <Results result={result} input={live?.input} recs={live?.recommendations || []} form={form} setMonth={set('month')}
                  monthError={errors.month} onSave={() => save(false)} saving={saving} saved={saved} loading={liveLoading && !result}
                  onReset={() => { setForm(INITIAL); setStep(0); setSaved(null) }} navigate={navigate} />
              )}
            </motion.div>
          </AnimatePresence>

          {serverError && step < 3 && <p className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{serverError}</p>}

          {step < 3 && (
            <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)} disabled={step === 0}>Back</Button>
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                {step === 2 ? 'See results' : 'Continue'} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>

        {/* Live estimate panel */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="card-pad relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-leaf-400/15 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <p className="eyebrow">Live estimate</p>
              {liveLoading && <Spinner />}
            </div>
            <p className="relative mt-3 flex items-baseline gap-1.5">
              <span className="num text-4xl font-bold text-white">{result ? kg(result.total_emissions) : '—'}</span>
              <span className="text-sm text-zinc-500">kg CO₂e / mo</span>
            </p>
            <p className="relative mt-1 text-xs text-zinc-500">≈ {result ? tonnes(result.annual_estimate) : '—'} t CO₂e per year</p>
            <div className="relative mt-5 space-y-3">
              {(result?.categories || []).map((c) => (
                <div key={c.key}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-zinc-400">{c.label}</span>
                    <span className="num text-zinc-300">{kg(c.value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div className="h-full rounded-full" style={{ background: CATEGORY_META[c.key].color }}
                      animate={{ width: `${c.share}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="relative mt-5 text-[11px] leading-relaxed text-zinc-500">Calculated by the backend with the stored emission factors (v{result?.calculation_version || '1.0'}).</p>
          </Card>
        </div>
      </div>

      <ConfirmModal open={dupOpen} onClose={() => setDupOpen(false)} onConfirm={() => save(true)} loading={saving}
        title={`Replace ${monthLabel(form.month)}?`} confirmLabel="Replace record"
        message={`You already have a saved record for ${monthLabel(form.month)}. Replacing it will overwrite that month with these new values.`} />
    </div>
  )
}

function StepTitle({ icon: Icon, title, text }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-leaf-400/20 bg-leaf-400/10 text-mint-300"><Icon className="h-5 w-5" /></span>
      <div>
        <h2 className="text-xl">{title}</h2>
        <p className="text-sm text-zinc-500">{text}</p>
      </div>
    </div>
  )
}

function InfoNote({ children }) {
  return <p className="rounded-xl border border-sky-300/15 bg-sky-300/[0.05] px-4 py-3 text-[13px] leading-relaxed text-zinc-400">{children}</p>
}

function Results({ result, recs, form, setMonth, monthError, onSave, saving, saved, loading, onReset, navigate }) {
  if (loading || !result) return <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div>
  const top = result.categories.find((c) => c.key === result.highest_category)
  return (
    <div className="space-y-7">
      <StepTitle icon={Leaf} title="Your results" text={result.allocation_note} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Monthly emissions" value={kg(result.total_emissions)} unit="kg CO₂e" highlight />
        <Stat label="Annual estimate" value={tonnes(result.annual_estimate)} unit="t CO₂e / year" />
        <Stat label="Highest contributor" value={top?.label || 'None'} unit={top ? `${top.share}% of total` : ''} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Category breakdown</h3>
        <div className="space-y-2.5">
          {result.categories.map((c, i) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-[13px] text-zinc-400">{c.label}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-lg bg-white/[0.04]">
                <motion.div className="flex h-full items-center rounded-lg px-2 text-[11px] font-semibold text-ink-950"
                  style={{ background: CATEGORY_META[c.key].color }} initial={{ width: 0 }}
                  animate={{ width: `${Math.max(c.share, c.value > 0 ? 3 : 0)}%` }} transition={{ delay: i * 0.06, duration: 0.7 }}>
                  {c.share >= 12 ? `${c.share}%` : ''}
                </motion.div>
              </div>
              <span className="num w-20 text-right text-[13px] font-semibold text-white">{kg(c.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {recs.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Reduction suggestions</h3>
          <div className="space-y-2.5">{recs.map((r, i) => <RecommendationCard key={r.title} rec={r} index={i} compact />)}</div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-ink-900/60 p-5">
        {saved ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-leaf-400" />
            <p className="flex-1 text-sm text-zinc-300">Saved for <b className="text-white">{monthLabel(saved.month)}</b>. Your dashboard, forecast and recommendations are updated.</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/app/history')}>History</Button>
              <Button size="sm" onClick={() => navigate('/app/dashboard')}>Dashboard</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Save this calculation for month" error={monthError}>
                <input type="month" className="field [color-scheme:dark]" value={form.month} onChange={(e) => setMonth(e.target.value)} />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" icon={RotateCcw} onClick={onReset}>Start over</Button>
              <Button icon={Save} loading={saving} onClick={onSave}>Save to history</Button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-500">How is this calculated? <Link to="/app/methodology" className="font-semibold text-leaf-400 hover:text-mint-300">See emission factors and sources →</Link></p>
    </div>
  )
}

function Stat({ label, value, unit, highlight }) {
  return (
    <div className={cx('rounded-2xl border p-4', highlight ? 'border-leaf-400/25 bg-leaf-400/[0.07]' : 'border-white/[0.07] bg-white/[0.025]')}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cx('num mt-1.5 truncate text-2xl font-bold', highlight ? 'text-mint-300' : 'text-white')}>{value}</p>
      <p className="text-[11px] text-zinc-500">{unit}</p>
    </div>
  )
}
