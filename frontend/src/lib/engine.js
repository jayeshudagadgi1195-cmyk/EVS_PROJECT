// Browser port of the backend logic (calculator.py, advisor.py, insights.py, ml/predictor.py).
// Used only by the static GitHub Pages build, where there is no Python server.
// Formulas and rules are line-for-line the same as the Python versions.

export const CALCULATION_VERSION = '1.0'
export const CATEGORY_LABELS = {
  electricity: 'Electricity',
  car: 'Car travel',
  two_wheeler: 'Two-wheeler',
  public_transport: 'Public transport',
  cooking: 'Cooking (LPG)',
}
const FIELDS = {
  electricity: 'electricity_emissions',
  car: 'car_emissions',
  two_wheeler: 'two_wheeler_emissions',
  public_transport: 'public_transport_emissions',
  cooking: 'cooking_emissions',
}
const LIMITS = { electricity_kwh: 20000, car_km: 20000, two_wheeler_km: 20000, public_transport_km: 20000, lpg_kg: 500, renewable_pct: 100, household_members: 50 }
const r3 = (x) => Math.round(x * 1000) / 1000
const r2 = (x) => Math.round(x * 100) / 100
const r1 = (x) => Math.round(x * 10) / 10

/* ---------------- validation (calculator.validate_activity) ---------------- */
export function validateActivity(p, requireMonth = false) {
  const errors = {}
  const clean = {}
  if (!p || typeof p !== 'object') return [null, { body: 'Request body must be a JSON object.' }]
  const month = p.month
  if (month === undefined || month === null || month === '') {
    if (requireMonth) errors.month = 'Month is required (format YYYY-MM).'
    clean.month = null
  } else if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    errors.month = 'Month must use the format YYYY-MM, e.g. 2026-10.'
  } else clean.month = month

  let vt = String(p.vehicle_type || 'none').toLowerCase()
  if (!['none', 'car'].includes(vt)) { errors.vehicle_type = "Vehicle type must be 'none' or 'car'."; vt = 'none' }
  clean.vehicle_type = vt
  let ft = typeof p.fuel_type === 'string' && p.fuel_type ? p.fuel_type.toLowerCase() : null
  if (vt === 'car') {
    if (!['petrol', 'diesel', 'electric'].includes(ft)) { errors.fuel_type = 'Choose petrol, diesel or electric for a car.'; ft = 'petrol' }
  } else ft = null
  clean.fuel_type = ft

  const num = (field, def = 0) => {
    const v = p[field]
    if (v === undefined || v === null || v === '') return def
    const n = Number(v)
    if (typeof v === 'boolean' || Number.isNaN(n)) { errors[field] = 'Must be a number.'; return def }
    if (!Number.isFinite(n)) { errors[field] = 'Must be a finite number.'; return def }
    if (n < 0) { errors[field] = 'Cannot be negative.'; return def }
    if (LIMITS[field] !== undefined && n > LIMITS[field]) { errors[field] = `Must be at most ${LIMITS[field]}.`; return def }
    return n
  }
  for (const f of ['electricity_kwh', 'car_km', 'two_wheeler_km', 'public_transport_km', 'lpg_kg', 'renewable_pct']) clean[f] = num(f)
  let members = num('household_members', 1)
  if (members < 1 || !Number.isInteger(members)) { errors.household_members = 'Household members must be a whole number of at least 1.'; members = 1 }
  clean.household_members = members
  if (vt === 'none') clean.car_km = 0
  let mode = String(p.public_transport_mode || 'bus').toLowerCase()
  if (!['bus', 'rail'].includes(mode)) { errors.public_transport_mode = "Public transport mode must be 'bus' or 'rail'."; mode = 'bus' }
  clean.public_transport_mode = mode
  return [clean, errors]
}

/* ---------------- calculator.calculate ---------------- */
export const carFactor = (fuel, F) =>
  fuel === 'diesel' ? F.car_diesel : fuel === 'electric' ? F.ev_kwh_per_km * F.electricity_grid_india : F.car_petrol
export const ptFactor = (mode, F) => (mode === 'rail' ? F.rail : F.bus)

export function calculate(a, F) {
  const members = Math.max(Math.trunc(a.household_members || 1), 1)
  const renewable = (a.renewable_pct || 0) / 100
  const electricity = (a.electricity_kwh * (1 - renewable) * F.electricity_grid_india) / members
  const car = a.vehicle_type === 'car' ? a.car_km * carFactor(a.fuel_type, F) : 0
  const two = a.two_wheeler_km * F.two_wheeler
  const pt = a.public_transport_km * ptFactor(a.public_transport_mode || 'bus', F)
  const transport = car + two + pt
  const cooking = (a.lpg_kg * F.lpg) / members
  const total = electricity + transport + cooking
  const cats = { electricity, car, two_wheeler: two, public_transport: pt, cooking }
  let highest = null
  if (total > 0) highest = Object.keys(cats).reduce((b, k) => (cats[k] > cats[b] ? k : b))
  return {
    electricity_emissions: r3(electricity),
    car_emissions: r3(car),
    two_wheeler_emissions: r3(two),
    public_transport_emissions: r3(pt),
    transport_emissions: r3(transport),
    cooking_emissions: r3(cooking),
    total_emissions: r3(total),
    annual_estimate: r3(total * 12),
    highest_category: highest,
    highest_category_label: highest ? CATEGORY_LABELS[highest] : null,
    categories: Object.entries(cats).map(([k, v]) => ({ key: k, label: CATEGORY_LABELS[k], value: r3(v), share: total > 0 ? r1((v / total) * 100) : 0 })),
    allocation_note: members > 1
      ? `Electricity and LPG are divided between ${members} household member(s); results show one person's allocated share.`
      : "Household size is 1, so electricity and LPG results equal the whole household's emissions.",
    calculation_version: CALCULATION_VERSION,
  }
}

/* ---------------- advisor.py ---------------- */
const pc = (x) => `${Math.round(x * 100)}%`
function rec(category, title, text, assumption, saving, total) {
  saving = Math.max(r2(saving), 0)
  const share = total > 0 ? saving / total : 0
  return {
    category, title, recommendation_text: text, assumption, estimated_savings: saving, annual_savings: r2(saving * 12),
    priority: share >= 0.08 ? 'high' : share >= 0.03 ? 'medium' : 'low',
  }
}

export function buildRecommendations(a, F) {
  const total = calculate(a, F).total_emissions
  const members = Math.max(a.household_members || 1, 1)
  const out = []
  const carKm = a.vehicle_type === 'car' ? a.car_km || 0 : 0
  if (carKm > 0) {
    const cf = carFactor(a.fuel_type, F)
    const shift = 0.3 * carKm
    out.push(rec('transport', 'Move 30% of car trips to bus or metro',
      `Taking public transport for about ${shift.toFixed(0)} km of your ${carKm.toFixed(0)} km monthly driving cuts emissions because each passenger shares the vehicle's footprint.`,
      `Saving = ${shift.toFixed(0)} km x (${cf.toFixed(4)} car - ${F.bus.toFixed(4)} bus) kg CO2e/km`, shift * (cf - F.bus), total))
    const cut = 0.15 * carKm
    out.push(rec('transport', 'Combine errands and skip short drives',
      `Planning trips together and walking or cycling for short distances can remove around ${cut.toFixed(0)} km of driving a month.`,
      `Assumes 15% less driving. Saving = ${cut.toFixed(0)} km x ${cf.toFixed(4)} kg CO2e/km`, cut * cf, total))
  }
  const tw = a.two_wheeler_km || 0
  if (tw > 0) {
    const shift = 0.2 * tw
    out.push(rec('transport', 'Use metro or cycle for some two-wheeler rides',
      `Replacing about ${shift.toFixed(0)} km of two-wheeler travel with metro, walking or cycling reduces fuel burned.`,
      `Assumes 20% shifted to metro. Saving = ${shift.toFixed(0)} km x (${F.two_wheeler.toFixed(4)} - ${F.rail.toFixed(4)}) kg CO2e/km`,
      shift * (F.two_wheeler - F.rail), total))
  }
  const kwh = a.electricity_kwh || 0
  const ren = (a.renewable_pct || 0) / 100
  const g = F.electricity_grid_india
  if (kwh > 0) {
    const ck = 0.15 * kwh
    out.push(rec('electricity', 'Upgrade to efficient appliances',
      'Switching to LED lighting, star-rated fans, ACs and fridges, and unplugging idle devices, typically trims household electricity use.',
      `Assumes 15% less electricity. Saving = ${ck.toFixed(0)} kWh x (1 - ${pc(ren)} renewable) x ${g} / ${members} people`,
      (ck * (1 - ren) * g) / members, total))
    if (kwh / members > 80) {
      const ak = 0.1 * kwh
      out.push(rec('electricity', 'Run the AC at 24-26°C and use timers',
        'A higher thermostat setting and timer/sleep modes reduce compressor run-time, the biggest electricity load in many Indian homes.',
        `Illustrative 10% reduction. Saving = ${ak.toFixed(0)} kWh x (1 - ${pc(ren)}) x ${g} / ${members}`, (ak * (1 - ren) * g) / members, total))
    }
    if (ren < 0.5) {
      const extra = 0.5 - ren
      out.push(rec('electricity', 'Cover half your power with renewables',
        'Rooftop solar (PM Surya Ghar scheme) or a green-power tariff from your electricity provider can replace grid electricity.',
        `Raise renewable share from ${pc(ren)} to 50%. Saving = ${kwh.toFixed(0)} kWh x ${pc(extra)} x ${g} / ${members}`,
        (kwh * extra * g) / members, total))
    }
  }
  const lpg = a.lpg_kg || 0
  if (lpg > 0) {
    const cut = 0.1 * lpg
    out.push(rec('cooking', 'Cook smarter with lids and pressure cookers',
      'Covering pans, using a pressure cooker and soaking grains and lentils shortens cooking time and saves gas.',
      `Illustrative 10% less LPG. Saving = ${cut.toFixed(2)} kg x ${F.lpg} / ${members} people`, (cut * F.lpg) / members, total))
  }
  return out.filter((r) => r.estimated_savings > 0).sort((x, y) => y.estimated_savings - x.estimated_savings)
}

export function potentialSavings(recs) {
  const best = {}
  for (const r of recs) if (!best[r.category] || r.estimated_savings > best[r.category].estimated_savings) best[r.category] = r
  return r2(Object.values(best).reduce((s, r) => s + r.estimated_savings, 0))
}

export function simulate(a, F, lv = {}) {
  const clamp = (v) => Math.min(Math.max(Number(v || 0), 0), 100)
  const carRed = clamp(lv.car_reduction_pct)
  let ptSub = clamp(lv.pt_substitution_pct)
  if (carRed + ptSub > 100) ptSub = 100 - carRed
  const elecRed = clamp(lv.electricity_reduction_pct)
  const lpgRed = clamp(lv.lpg_reduction_pct)
  const current = calculate(a, F)
  const s = { ...a }
  const carKm = a.vehicle_type === 'car' ? a.car_km : 0
  s.car_km = carKm * (1 - (carRed + ptSub) / 100)
  s.public_transport_km = a.public_transport_km + (carKm * ptSub) / 100
  s.electricity_kwh = a.electricity_kwh * (1 - elecRed / 100)
  s.lpg_kg = a.lpg_kg * (1 - lpgRed / 100)
  if (lv.renewable_pct !== undefined && lv.renewable_pct !== null) s.renewable_pct = clamp(lv.renewable_pct)
  const scenario = calculate(s, F)
  const saving = current.total_emissions - scenario.total_emissions
  return {
    inputs: { car_reduction_pct: carRed, pt_substitution_pct: ptSub, electricity_reduction_pct: elecRed, lpg_reduction_pct: lpgRed, renewable_pct: s.renewable_pct },
    current, scenario, scenario_activity: s,
    monthly_savings: r2(saving),
    annual_savings: r2(saving * 12),
    percent_reduction: current.total_emissions > 0 ? r1((saving / current.total_emissions) * 100) : 0,
    method: 'Scenario activity values are recalculated with the same emission factors (emissions = activity x factor). This is arithmetic, not machine learning.',
  }
}

/* ---------------- insights.py ---------------- */
export function categoriesOf(rec) {
  const t = rec.total_emissions || 0
  return Object.entries(FIELDS).map(([k, f]) => ({ key: k, label: CATEGORY_LABELS[k], value: r2(rec[f]), share: t > 0 ? r1((rec[f] / t) * 100) : 0 }))
}
const pctChange = (n, o) => (o === null || o === undefined || o === 0 ? null : r1(((n - o) / o) * 100))

export function monthComparison(latest, prev) {
  if (!latest) return []
  const rows = Object.entries(FIELDS).map(([k, f]) => ({
    key: k, label: CATEGORY_LABELS[k], current: r2(latest[f]), previous: prev ? r2(prev[f]) : null, change_pct: pctChange(latest[f], prev ? prev[f] : null),
  }))
  rows.push({ key: 'total', label: 'Total', current: r2(latest.total_emissions), previous: prev ? r2(prev.total_emissions) : null, change_pct: pctChange(latest.total_emissions, prev ? prev.total_emissions : null) })
  return rows
}

export function buildInsights(records) {
  if (!records.length) return []
  const out = []
  const latest = records[records.length - 1]
  const top = categoriesOf(latest).sort((x, y) => y.value - x.value)[0]
  if (top.value > 0) out.push({ tone: 'info', title: `${top.label} leads your footprint`, text: `It made up ${top.share.toFixed(1)}% of your emissions in ${latest.month}.` })
  if (records.length >= 2) {
    const prev = records[records.length - 2]
    const ch = pctChange(latest.total_emissions, prev.total_emissions)
    if (ch !== null) {
      const up = ch > 0
      out.push({ tone: up ? 'warning' : 'positive', title: up ? `Up ${ch}% from last month` : `Down ${Math.abs(ch)}% from last month`,
        text: `Total emissions ${up ? 'rose' : 'fell'} from ${prev.total_emissions.toFixed(0)} to ${latest.total_emissions.toFixed(0)} kg CO2e.` })
    }
    let best = null
    for (const [k, f] of Object.entries(FIELDS)) {
      const d = latest[f] - prev[f]
      if (!best || Math.abs(d) > Math.abs(best.d)) best = { d, k }
    }
    if (Math.abs(best.d) >= 1) {
      out.push({ tone: best.d > 0 ? 'warning' : 'positive', title: `${CATEGORY_LABELS[best.k]} ${best.d > 0 ? 'increased' : 'decreased'} the most`,
        text: `A change of ${best.d > 0 ? '+' : ''}${best.d.toFixed(1)} kg CO2e compared with ${prev.month}.` })
    }
  }
  if (records.length >= 3) {
    const lo = records.reduce((b, r) => (r.total_emissions < b.total_emissions ? r : b))
    const hi = records.reduce((b, r) => (r.total_emissions > b.total_emissions ? r : b))
    out.push({ tone: 'positive', title: `Lowest month: ${lo.month}`, text: `${lo.total_emissions.toFixed(0)} kg CO2e. Your highest was ${hi.month} at ${hi.total_emissions.toFixed(0)} kg.` })
    if (records.length >= 6) {
      const avg = (rs) => rs.reduce((s, r) => s + r.total_emissions, 0) / rs.length
      const ch = pctChange(avg(records.slice(-3)), avg(records.slice(-6, -3)))
      if (ch !== null) out.push({ tone: ch > 0 ? 'warning' : 'positive', title: '3-month trend', text: `Your recent 3-month average is ${Math.abs(ch)}% ${ch > 0 ? 'higher' : 'lower'} than the 3 months before.` })
    }
  }
  return out.slice(0, 5)
}

/* ---------------- ml/predictor.py (Random Forest inference) ---------------- */
export const nextMonth = (m) => {
  let [y, mo] = m.split('-').map(Number)
  mo += 1
  if (mo > 12) { mo = 1; y += 1 }
  return `${y}-${String(mo).padStart(2, '0')}`
}
const monthAngle = (m) => {
  const a = (2 * Math.PI * (Number(m.slice(5, 7)) - 1)) / 12
  return [Math.sin(a), Math.cos(a)]
}

export function featureRow(cur, prev) {
  const [s, c] = monthAngle(nextMonth(cur.month))
  return {
    electricity_kwh: cur.electricity_kwh, car_km: cur.car_km, two_wheeler_km: cur.two_wheeler_km,
    public_transport_km: cur.public_transport_km, lpg_kg: cur.lpg_kg, household_members: cur.household_members,
    renewable_pct: cur.renewable_pct, electricity_emissions: cur.electricity_emissions, transport_emissions: cur.transport_emissions,
    cooking_emissions: cur.cooking_emissions, current_emissions: cur.total_emissions,
    previous_emissions: prev ? prev.total_emissions : cur.total_emissions, target_month_sin: s, target_month_cos: c,
  }
}

/** Average of every tree's leaf value - exactly what scikit-learn's RandomForestRegressor.predict does. */
export function predictRow(model, x) {
  let sum = 0
  for (const t of model.trees) {
    let n = 0
    while (t.l[n] !== -1) n = x[t.f[n]] <= t.t[n] ? t.l[n] : t.r[n]
    sum += t.v[n]
  }
  return sum / model.trees.length
}

export function forecast(model, records) {
  if (!records.length) return null
  records = [...records].sort((a, b) => a.month.localeCompare(b.month))
  const preds = records.map((r, i) => {
    const row = featureRow(r, i > 0 ? records[i - 1] : null)
    return predictRow(model, model.features.map((f) => row[f]))
  })
  const months = records.map((r) => nextMonth(r.month))
  const byMonth = Object.fromEntries(records.map((r) => [r.month, r.total_emissions]))
  const backtest = []
  months.slice(0, -1).forEach((m, i) => {
    if (m in byMonth) backtest.push({ month: m, actual: r2(byMonth[m]), predicted: r2(preds[i]) })
  })
  const latest = records[records.length - 1]
  const predicted = r2(Math.max(preds[preds.length - 1], 0))
  const current = latest.total_emissions
  const change = predicted - current
  const h = records.length
  const errs = backtest.map((b) => Math.abs(b.actual - b.predicted))
  return {
    predicted_month: months[months.length - 1],
    based_on_month: latest.month,
    predicted_emissions: predicted,
    current_emissions: r2(current),
    change: r2(change),
    change_pct: current > 0 ? r1((change / current) * 100) : null,
    history_months: h,
    basis: h >= 3 ? 'personal' : 'synthetic_demo',
    note: h >= 3
      ? `Based on your ${h} saved months. The model itself was trained on synthetic data, so treat this as an estimate, not a guarantee.`
      : `You only have ${h} saved month(s). The forecast mostly reflects patterns the model learned from synthetic demo users rather than your personal history. Save at least 3 consecutive months for a more personal forecast.`,
    backtest,
    backtest_mae: errs.length ? r2(errs.reduce((s, e) => s + e, 0) / errs.length) : null,
    model_version: model.meta.model_version,
  }
}
