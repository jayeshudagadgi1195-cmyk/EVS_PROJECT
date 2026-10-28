import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card } from '../ui/Primitives'
import { CATEGORY_META, kg, monthLabel, shortMonth } from '../../lib/format'

export function ChartCard({ title, subtitle, actions, children, className = '', delay = 0 }) {
  return (
    <Card delay={delay} className={`card-pad flex flex-col ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </Card>
  )
}

export function ChartTooltip({ active, payload, label, labelFormatter = monthLabel, unit = 'kg CO₂e' }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value !== null && p.value !== undefined)
  return (
    <div className="min-w-[170px] rounded-xl border border-white/10 bg-ink-850/95 px-3.5 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{labelFormatter(label)}</p>
      <div className="space-y-1.5">
        {rows.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-2 text-zinc-300">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
              {p.name}
            </span>
            <span className="num font-semibold text-white">{kg(p.value)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-zinc-500">{unit}</p>
    </div>
  )
}

const axisProps = { tickLine: false, axisLine: false, tickMargin: 10 }

export function TrendAreaChart({ data, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#bef264" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} minTickGap={16} />
        <YAxis {...axisProps} width={48} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)' }} />
        <Area type="monotone" dataKey="total" name="Total" stroke="url(#trendStroke)" strokeWidth={2.5}
          fill="url(#trendFill)" activeDot={{ r: 5, fill: '#07110c', stroke: '#bef264', strokeWidth: 2 }}
          animationDuration={1100} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function SourcesDonut({ breakdown, height = 220 }) {
  const data = breakdown.filter((c) => c.value > 0)
  const total = data.reduce((s, c) => s + c.value, 0)
  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="68%" outerRadius="92%"
              paddingAngle={2.5} cornerRadius={6} stroke="none" animationDuration={1000}>
              {data.map((c) => <Cell key={c.key} fill={CATEGORY_META[c.key].color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip labelFormatter={() => 'Share of footprint'} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-2xl font-bold text-white">{kg(total, 0)}</p>
            <p className="text-[11px] text-zinc-500">kg CO₂e</p>
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {breakdown.map((c) => (
          <li key={c.key} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-zinc-300">
              <span className="h-2.5 w-2.5 rounded-[4px]" style={{ background: CATEGORY_META[c.key].color }} />
              {c.label}
            </span>
            <span className="num text-zinc-400"><span className="font-semibold text-white">{kg(c.value)}</span> · {c.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ElecTransportBar({ records, height = 260 }) {
  const data = records.map((r) => ({ month: r.month, electricity: r.electricity_emissions, transport: r.transport_emissions }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={3}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} minTickGap={8} />
        <YAxis {...axisProps} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 8 }} />
        <Bar dataKey="electricity" name="Electricity" fill="#bef264" radius={[5, 5, 0, 0]} maxBarSize={18} animationDuration={900} />
        <Bar dataKey="transport" name="Transport" fill="#34d399" radius={[5, 5, 0, 0]} maxBarSize={18} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Actual vs model-predicted totals, plus the next-month forecast as a dashed point. */
export function ActualPredictedChart({ backtest = [], history = [], forecast, height = 280 }) {
  const map = new Map()
  history.forEach((h) => map.set(h.month, { month: h.month, actual: h.actual }))
  backtest.forEach((b) => map.set(b.month, { ...(map.get(b.month) || { month: b.month }), actual: b.actual, predicted: b.predicted }))
  let data = [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
  if (forecast) {
    const last = data[data.length - 1]
    if (last) last.forecast = last.actual
    data = [...data, { month: forecast.predicted_month, forecast: forecast.predicted_emissions }]
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} minTickGap={12} />
        <YAxis {...axisProps} width={48} domain={['auto', 'auto']} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)' }} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 8 }} />
        {forecast && <ReferenceLine x={forecast.based_on_month} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 4" />}
        <Line type="monotone" dataKey="actual" name="Actual" stroke="#6ee7b7" strokeWidth={2.5}
          dot={{ r: 3, fill: '#07110c', strokeWidth: 2 }} activeDot={{ r: 5 }} animationDuration={1000} connectNulls />
        <Line type="monotone" dataKey="predicted" name="Model back-test" stroke="#bef264" strokeWidth={2}
          strokeDasharray="5 5" dot={false} animationDuration={1200} connectNulls />
        {forecast && (
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#fbbf24" strokeWidth={2} strokeDasharray="2 4"
            dot={{ r: 5, fill: '#fbbf24', stroke: '#07110c', strokeWidth: 2 }} animationDuration={1400} legendType="circle" />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function StackedCategoryChart({ records, height = 300 }) {
  const data = records.map((r) => ({
    month: r.month, electricity: r.electricity_emissions, car: r.car_emissions,
    two_wheeler: r.two_wheeler_emissions, public_transport: r.public_transport_emissions, cooking: r.cooking_emissions,
  }))
  const keys = Object.keys(CATEGORY_META)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickFormatter={shortMonth} {...axisProps} minTickGap={8} />
        <YAxis {...axisProps} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 8 }} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} name={CATEGORY_META[k].label} stackId="a" fill={CATEGORY_META[k].color}
            maxBarSize={34} radius={i === keys.length - 1 ? [5, 5, 0, 0] : 0} animationDuration={900} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CompareBars({ a, b, height = 260 }) {
  const data = Object.keys(CATEGORY_META).map((k) => ({
    month: CATEGORY_META[k].label,
    a: a?.[`${k}_emissions`] ?? 0,
    b: b?.[`${k}_emissions`] ?? 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="month" width={110} {...axisProps} />
        <Tooltip content={<ChartTooltip labelFormatter={(l) => l} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
        <Bar dataKey="a" name={a ? monthLabel(a.month) : 'Month A'} fill="#6ee7b7" radius={[0, 5, 5, 0]} maxBarSize={14} />
        <Bar dataKey="b" name={b ? monthLabel(b.month) : 'Month B'} fill="#bef264" radius={[0, 5, 5, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}
