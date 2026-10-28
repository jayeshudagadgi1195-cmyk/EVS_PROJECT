import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, Calculator, Database, Download, Filter, Layers, Sigma, Trash2, TrendingUp, X } from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { CATEGORY_META, kg, monthLabel, pct } from '../lib/format'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageSkeleton, cx } from '../components/ui/Primitives'
import { ConfirmModal, useToast } from '../components/ui/Feedback'
import { ChartCard, CompareBars, StackedCategoryChart, TrendAreaChart } from '../components/charts/Charts'

export default function HistoryPage() {
  const [filters, setFilters] = useState({ month: '', from: '', to: '' })
  const { data, loading, error, reload } = useApi(() => api.history(filters), [filters.month, filters.from, filters.to])
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [compare, setCompare] = useState({ a: '', b: '' })
  const notify = useToast()
  const navigate = useNavigate()

  const months = data?.available_months || []
  const records = data?.records || []

  // Default comparison: last two months available
  useEffect(() => {
    if (months.length >= 2 && (!months.includes(compare.a) || !months.includes(compare.b)))
      setCompare({ a: months[months.length - 2], b: months[months.length - 1] })
  }, [months]) // eslint-disable-line react-hooks/exhaustive-deps

  const [allRecords, setAllRecords] = useState([])
  useEffect(() => {
    // full history (unfiltered) for the comparison widget
    api.history().then((r) => setAllRecords(r.records)).catch(() => setAllRecords([]))
  }, [data])
  const recA = useMemo(() => allRecords.find((r) => r.month === compare.a), [allRecords, compare.a])
  const recB = useMemo(() => allRecords.find((r) => r.month === compare.b), [allRecords, compare.b])

  const remove = async () => {
    setDeleting(true)
    try {
      await api.deleteActivity(toDelete.id)
      notify(`Deleted the record for ${monthLabel(toDelete.month)}.`, 'success')
      setToDelete(null)
      reload(true)
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const restore = async () => {
    setRestoring(true)
    try {
      const r = await api.resetDemo()
      notify(r.message, 'success')
      setFilters({ month: '', from: '', to: '' })
      reload()
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setRestoring(false)
    }
  }

  const filtered = filters.month || filters.from || filters.to
  const s = data?.summary

  return (
    <div>
      <PageHeader eyebrow="History & analytics" title="Your footprint over time"
        description="Every saved calculation, with trends, month-to-month comparison and CSV export."
        actions={<>
          <Button variant="secondary" size="sm" icon={Database} loading={restoring} onClick={restore}>Restore demo data</Button>
          <a href={api.exportUrl()} download><Button size="sm" icon={Download} disabled={!months.length}>Export CSV</Button></a>
        </>} />

      {loading && !data ? <PageSkeleton /> : error ? <ErrorState error={error} onRetry={reload} /> : !months.length ? (
        <EmptyState icon={Layers} title="No saved calculations" text="Your history is empty. Save a month from the calculator, or restore the demo records."
          action={<Button icon={Calculator} onClick={() => navigate('/app/calculator')}>Open calculator</Button>} />
      ) : (
        <>
          {/* Filters */}
          <Card className="mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-end">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-300 md:pb-2.5"><Filter className="h-4 w-4 text-zinc-500" /> Filter</div>
            <Select label="Single month" value={filters.month} onChange={(v) => setFilters({ month: v, from: '', to: '' })}
              options={[['', 'All months'], ...months.map((m) => [m, monthLabel(m)])]} />
            <Select label="From" value={filters.from} onChange={(v) => setFilters((f) => ({ ...f, month: '', from: v }))}
              options={[['', 'Any'], ...months.map((m) => [m, monthLabel(m)])]} />
            <Select label="To" value={filters.to} onChange={(v) => setFilters((f) => ({ ...f, month: '', to: v }))}
              options={[['', 'Any'], ...months.map((m) => [m, monthLabel(m)])]} />
            {filtered && (
              <Button variant="ghost" size="sm" icon={X} className="md:mb-1" onClick={() => setFilters({ month: '', from: '', to: '' })}>Clear</Button>
            )}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Summary icon={Layers} label="Records shown" value={s.count} />
            <Summary icon={Sigma} label="Total emissions" value={`${kg(s.total, 0)} kg`} />
            <Summary icon={TrendingUp} label="Monthly average" value={`${kg(s.average)} kg`} />
            <Summary icon={Database} label="Highest category" value={s.highest_category?.label || '—'}
              sub={s.highest_category ? `${s.highest_category.share}% of emissions shown` : undefined}
              color={s.highest_category ? CATEGORY_META[s.highest_category.key].color : undefined} />
          </div>

          {records.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-500">No records match these filters.</p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Emissions by category" subtitle="Stacked kg CO₂e per month"><StackedCategoryChart records={records} /></ChartCard>
              <ChartCard title="Emission trend" subtitle="Total kg CO₂e"><TrendAreaChart data={records.map((r) => ({ month: r.month, total: r.total_emissions }))} height={300} /></ChartCard>
            </div>
          )}

          {months.length >= 2 && (
            <Card className="card-pad mt-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold"><ArrowLeftRight className="h-4 w-4 text-leaf-400" /> Compare months</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Pick any two saved months</p>
                </div>
                <div className="flex gap-3">
                  <Select label="Month A" value={compare.a} onChange={(v) => setCompare((c) => ({ ...c, a: v }))} options={months.map((m) => [m, monthLabel(m)])} />
                  <Select label="Month B" value={compare.b} onChange={(v) => setCompare((c) => ({ ...c, b: v }))} options={months.map((m) => [m, monthLabel(m)])} />
                </div>
              </div>
              {recA && recB && (
                <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
                  <CompareBars a={recA} b={recB} />
                  <div className="space-y-3">
                    {[recA, recB].map((r, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <p className="text-[11px] text-zinc-500">{monthLabel(r.month)}</p>
                        <p className="num text-xl font-bold text-white">{kg(r.total_emissions)} <span className="text-xs font-normal text-zinc-500">kg CO₂e</span></p>
                      </div>
                    ))}
                    {(() => {
                      const change = recA.total_emissions ? ((recB.total_emissions - recA.total_emissions) / recA.total_emissions) * 100 : null
                      return (
                        <p className={cx('rounded-xl px-3.5 py-3 text-[13px]', change > 0 ? 'bg-amber-300/10 text-amber-200' : 'bg-leaf-400/10 text-mint-300')}>
                          {monthLabel(recB.month)} is <b className="num">{pct(change)}</b> vs {monthLabel(recA.month)}
                        </p>
                      )
                    })()}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Table */}
          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 sm:px-6">
              <h3 className="text-[15px] font-semibold">Saved calculations</h3>
              <span className="text-xs text-zinc-500">{records.length} rows · kg CO₂e</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead className="border-y border-white/[0.06] bg-white/[0.02] text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    {['Month', 'Car', 'Two-wheeler', 'Public tr.', 'Electricity', 'Cooking', 'Total', ''].map((h, i) => (
                      <th key={i} className={cx('px-4 py-3 font-medium first:pl-6', i > 0 && i < 7 && 'text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <AnimatePresence initial={false}>
                    {[...records].reverse().map((r) => (
                      <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                        className="group transition-colors hover:bg-white/[0.025]">
                        <td className="px-4 py-3 pl-6">
                          <span className="font-semibold text-white">{monthLabel(r.month)}</span>
                          {r.is_demo ? <Badge tone="lime" className="ml-2">Demo</Badge> : null}
                          <p className="text-[11px] text-zinc-500">{r.electricity_kwh} kWh · {r.car_km} km car · {r.lpg_kg} kg LPG</p>
                        </td>
                        {['car_emissions', 'two_wheeler_emissions', 'public_transport_emissions', 'electricity_emissions', 'cooking_emissions'].map((k) => (
                          <td key={k} className="num px-4 py-3 text-right text-zinc-300">{kg(r[k])}</td>
                        ))}
                        <td className="num px-4 py-3 text-right font-semibold text-white">{kg(r.total_emissions)}</td>
                        <td className="px-4 py-3 pr-6 text-right">
                          <button onClick={() => setToDelete(r)} className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${r.month}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} loading={deleting} danger confirmLabel="Delete record"
        title={toDelete ? `Delete ${monthLabel(toDelete.month)}?` : ''}
        message="This permanently removes the activity record and its calculated emissions from your local database." />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block min-w-[140px] flex-1 md:flex-none">
      <span className="mb-1 block text-[11px] font-medium text-zinc-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field cursor-pointer appearance-none py-2 pr-8 text-[13px]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
        {options.map(([v, l]) => <option key={v} value={v} className="bg-ink-900">{l}</option>)}
      </select>
    </label>
  )
}

function Summary({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="card-pad">
      <div className="flex items-center justify-between text-[13px] text-zinc-400">{label}<Icon className="h-4 w-4 text-zinc-600" /></div>
      <p className="num mt-3 flex items-center gap-2 text-2xl font-bold text-white">
        {color && <span className="h-3 w-3 rounded" style={{ background: color }} />}{value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-zinc-500">{sub}</p>}
    </Card>
  )
}
