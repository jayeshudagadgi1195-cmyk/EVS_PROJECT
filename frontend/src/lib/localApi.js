// In-browser replacement for the Flask API, used by the static GitHub Pages build.
// Same endpoints and response shapes as backend/app.py. Records are kept in this
// browser's localStorage instead of SQLite; the Random Forest is the real trained
// model exported by backend/ml/export_web.py.
import {
  CALCULATION_VERSION, buildInsights, buildRecommendations, calculate, categoriesOf, forecast,
  monthComparison, potentialSavings, simulate, validateActivity,
} from './engine'

const STORE = 'ecotrack.static.v1'
const DATA = `${import.meta.env.BASE_URL}data/`
const KEYS = ['month', 'vehicle_type', 'fuel_type', 'electricity_kwh', 'renewable_pct', 'household_members',
  'car_km', 'two_wheeler_km', 'public_transport_km', 'public_transport_mode', 'lpg_kg']

let ApiErrorClass = Error
export const setErrorClass = (C) => { ApiErrorClass = C }
const fail = (msg, status, details) => { throw new ApiErrorClass(msg, status, details) }

/* ---------- static data files ---------- */
const cache = {}
async function load(name) {
  if (!cache[name]) {
    cache[name] = fetch(DATA + name).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${name}`)
      return r.json()
    }).catch((e) => { delete cache[name]; fail(`${e.message}. Check your internet connection and reload.`, 0) })
  }
  return cache[name]
}
const factorRows = () => load('factors.json')
const factorValues = async () => Object.fromEntries((await factorRows()).map((f) => [f.activity_type, f.factor_value]))
const model = () => load('model.json')

/* ---------- storage ---------- */
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
function readState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE))
    if (s && Array.isArray(s.records)) return s
  } catch { /* storage blocked or corrupt */ }
  return null
}
let memory = null
function writeState(s) {
  memory = s
  try { localStorage.setItem(STORE, JSON.stringify(s)) } catch { /* private mode: keep in memory */ }
}

function makeRecord(activity, F, id, isDemo) {
  const res = calculate(activity, F)
  return {
    id, user_id: 1, ...Object.fromEntries(KEYS.map((k) => [k, activity[k]])), is_demo: isDemo ? 1 : 0, created_at: now(),
    electricity_emissions: res.electricity_emissions, car_emissions: res.car_emissions, two_wheeler_emissions: res.two_wheeler_emissions,
    public_transport_emissions: res.public_transport_emissions, transport_emissions: res.transport_emissions,
    cooking_emissions: res.cooking_emissions, total_emissions: res.total_emissions, calculation_version: res.calculation_version,
  }
}

async function demoState() {
  const [demo, F] = await Promise.all([load('demo.json'), factorValues()])
  return { nextId: demo.length + 1, records: demo.map((a, i) => makeRecord(a, F, i + 1, true)), predictions: [] }
}

async function state() {
  let s = memory || readState()
  if (!s) { s = await demoState(); writeState(s) }
  memory = s
  return s
}
const sorted = (rs) => [...rs].sort((a, b) => a.month.localeCompare(b.month))
const activityOf = (r) => Object.fromEntries(KEYS.map((k) => [k, r[k]]))
const tick = () => new Promise((r) => setTimeout(r, 120)) // small delay so loading states are visible

/* ---------- endpoints ---------- */
export const localApi = {
  async health() {
    await model()
    return { status: 'ok', database: 'browser localStorage', model: { ready: true, version: (await model()).meta.model_version }, mode: 'static-browser-demo' }
  },

  async dashboard() {
    const s = await state()
    const records = sorted(s.records)
    const user = { id: 1, display_name: 'Demo User' }
    if (!records.length) return { user, has_data: false, records: [], is_demo_data: false }
    const [F, M] = await Promise.all([factorValues(), model()])
    const latest = records[records.length - 1]
    const previous = records.length > 1 ? records[records.length - 2] : null
    const last12 = records.slice(-12)
    const annual = (last12.reduce((t, r) => t + r.total_emissions, 0) / last12.length) * 12
    const fc = forecast(M, records)
    const recs = buildRecommendations(activityOf(latest), F)
    const savings = potentialSavings(recs)
    const cats = categoriesOf(latest)
    const largest = cats.reduce((b, c) => (c.value > b.value ? c : b))
    const feed = [...records].sort((a, b) => (b.created_at + String(b.id).padStart(6, '0')).localeCompare(a.created_at + String(a.id).padStart(6, '0'))).slice(0, 4)
      .map((r) => ({ type: 'record', title: `Footprint saved for ${r.month}`, detail: `${r.total_emissions.toFixed(1)} kg CO2e`, is_demo: !!r.is_demo, timestamp: r.created_at }))
    s.predictions.slice(0, 3).forEach((p) => feed.push({ type: 'prediction', title: `Forecast generated for ${p.predicted_month}`, detail: `${p.predicted_emissions.toFixed(1)} kg CO2e`, is_demo: false, timestamp: p.created_at }))
    feed.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    await tick()
    return {
      user, has_data: true, is_demo_data: records.some((r) => r.is_demo), records, latest, previous,
      kpis: {
        monthly_total: latest.total_emissions,
        monthly_month: latest.month,
        monthly_change_pct: previous && previous.total_emissions ? Math.round(((latest.total_emissions - previous.total_emissions) / previous.total_emissions) * 1000) / 10 : null,
        annual_estimate: Math.round(annual * 100) / 100,
        annual_method: `Average of your last ${last12.length} saved month(s) x 12`,
        predicted_next: fc.predicted_emissions,
        predicted_month: fc.predicted_month,
        predicted_change_pct: fc.change_pct,
        prediction_error: null,
        potential_savings: savings,
        potential_savings_pct: latest.total_emissions ? Math.round((savings / latest.total_emissions) * 1000) / 10 : 0,
      },
      breakdown: cats,
      largest_contributor: largest,
      comparison: monthComparison(latest, previous),
      insights: buildInsights(records),
      recent_activity: feed.slice(0, 6),
      recommendations: recs.slice(0, 3),
      actual_vs_predicted: fc.backtest,
      forecast: fc,
    }
  },

  async calculate(body) {
    const [clean, errors] = validateActivity(body)
    if (Object.keys(errors).length) fail('Some inputs are invalid.', 422, errors)
    const F = await factorValues()
    return { input: clean, result: calculate(clean, F), recommendations: buildRecommendations(clean, F).slice(0, 4) }
  },

  async saveActivity(body, replace = false) {
    const [clean, errors] = validateActivity(body, true)
    if (Object.keys(errors).length) fail('Some inputs are invalid.', 422, errors)
    const s = await state()
    const existing = s.records.find((r) => r.month === clean.month)
    if (existing && !replace) fail(`You already saved a record for ${clean.month}. Replace it or choose another month.`, 409, { month: 'duplicate' })
    const rec = makeRecord(clean, await factorValues(), s.nextId++, false)
    s.records = s.records.filter((r) => r.month !== clean.month).concat(rec)
    writeState(s)
    await tick()
    return { message: 'Saved', record: rec }
  },

  async deleteActivity(id) {
    const s = await state()
    const before = s.records.length
    s.records = s.records.filter((r) => r.id !== Number(id))
    if (s.records.length === before) fail('Record not found.', 404)
    writeState(s)
    return { message: 'Deleted', id }
  },

  async resetDemo() {
    const s = await demoState()
    writeState(s)
    return { message: `Demo data restored (${s.records.length} months).` }
  },

  async history(params = {}) {
    const s = await state()
    const re = /^\d{4}-(0[1-9]|1[0-2])$/
    for (const k of ['month', 'from', 'to']) if (params[k] && !re.test(params[k])) fail(`'${k}' must use the format YYYY-MM.`, 400)
    const all = sorted(s.records)
    const records = all.filter((r) => (!params.month || r.month === params.month) && (!params.from || r.month >= params.from) && (!params.to || r.month <= params.to))
    const totals = {}
    records.forEach((r) => categoriesOf(r).forEach((c) => { totals[c.key] = (totals[c.key] || 0) + c.value }))
    const sum = Object.values(totals).reduce((a, b) => a + b, 0)
    let highest = null
    if (records.length && sum > 0) {
      const key = Object.keys(totals).reduce((b, k) => (totals[k] > totals[b] ? k : b))
      highest = { key, label: categoriesOf(records[0]).find((c) => c.key === key).label, value: Math.round(totals[key] * 100) / 100, share: Math.round((totals[key] / sum) * 1000) / 10 }
    }
    const tot = records.reduce((a, r) => a + r.total_emissions, 0)
    await tick()
    return {
      records, available_months: all.map((r) => r.month),
      summary: { count: records.length, total: Math.round(tot * 100) / 100, average: records.length ? Math.round((tot / records.length) * 100) / 100 : 0, highest_category: highest, category_totals: totals },
    }
  },

  async predictions() {
    const s = await state()
    const M = await model()
    const records = sorted(s.records)
    await tick()
    return {
      model: M.meta,
      forecast: records.length ? forecast(M, records) : null,
      forecast_error: records.length ? null : 'No saved months yet - add a calculation to get a forecast.',
      history: records.map((r) => ({ month: r.month, actual: r.total_emissions })),
      saved_predictions: s.predictions.slice(0, 10),
    }
  },

  async predict() {
    const s = await state()
    if (!s.records.length) fail('Save at least one month of activity before requesting a prediction.', 409)
    const fc = forecast(await model(), sorted(s.records))
    const p = { id: Date.now(), user_id: 1, predicted_month: fc.predicted_month, based_on_month: fc.based_on_month, predicted_emissions: fc.predicted_emissions, history_months: fc.history_months, model_version: fc.model_version, created_at: now() }
    s.predictions = [p, ...s.predictions].slice(0, 20)
    writeState(s)
    return { prediction_id: p.id, forecast: fc }
  },

  async recommendations() {
    const s = await state()
    const records = sorted(s.records)
    if (!records.length) return { has_data: false, recommendations: [], baseline: null }
    const latest = records[records.length - 1]
    const recs = buildRecommendations(activityOf(latest), await factorValues())
    await tick()
    return {
      has_data: true, baseline: latest, breakdown: categoriesOf(latest), recommendations: recs, potential_savings: potentialSavings(recs),
      method: 'Rule-based and explainable: each saving = activity change x published emission factor.',
    }
  },

  async simulate(body) {
    const s = await state()
    const records = sorted(s.records)
    if (!records.length) fail('No saved records to simulate. Save a calculation first.', 409)
    for (const k of ['car_reduction_pct', 'pt_substitution_pct', 'electricity_reduction_pct', 'lpg_reduction_pct', 'renewable_pct']) {
      const v = body[k]
      if (v !== undefined && v !== null && v !== '' && !(Number(v) >= 0 && Number(v) <= 100)) fail(`'${k}' must be between 0 and 100.`, 422)
    }
    return simulate(activityOf(records[records.length - 1]), await factorValues(), body)
  },

  async factors() {
    return { factors: await factorRows(), calculation_version: CALCULATION_VERSION, formula: 'Emissions (kg CO2e) = Activity data x Emission factor' }
  },

  exportUrl() {
    const s = memory || readState()
    const cols = ['month', 'vehicle_type', 'fuel_type', 'car_km', 'two_wheeler_km', 'public_transport_km', 'public_transport_mode', 'electricity_kwh',
      'renewable_pct', 'household_members', 'lpg_kg', 'electricity_emissions', 'car_emissions', 'two_wheeler_emissions', 'public_transport_emissions',
      'transport_emissions', 'cooking_emissions', 'total_emissions', 'calculation_version', 'is_demo']
    const lines = [cols.join(',')].concat(sorted(s?.records || []).map((r) => cols.map((c) => r[c] ?? '').join(',')))
    return `data:text/csv;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`
  },
}
