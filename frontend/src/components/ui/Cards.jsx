import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Bike, Bus, Car, Flame, Lightbulb, Plug, Sun, Zap } from 'lucide-react'
import { AnimatedNumber, Badge, Card, cx } from './Primitives'
import { kg } from '../../lib/format'

export function KpiCard({ icon: Icon, label, value, unit = 'kg CO₂e', change, changeLabel, footnote, accent = 'leaf', delay = 0, digits = 1 }) {
  const accents = {
    leaf: 'from-leaf-400/20 text-mint-300',
    lime: 'from-lime-400/20 text-lime-300',
    sky: 'from-sky-300/20 text-sky-200',
    amber: 'from-amber-300/20 text-amber-200',
  }
  const good = change !== null && change !== undefined && change <= 0
  return (
    <Card hover delay={delay} className="card-pad group relative overflow-hidden">
      <div className={cx('pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-2xl transition-opacity group-hover:opacity-100', accents[accent])} />
      <div className="relative flex items-center justify-between">
        <span className="text-[13px] font-medium text-zinc-400">{label}</span>
        <span className={cx('grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04]', accents[accent].split(' ')[1])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="relative mt-4 flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold leading-none text-white">
          {value === null || value === undefined ? '—' : <AnimatedNumber value={value} digits={digits} />}
        </span>
        <span className="text-xs font-medium text-zinc-500">{unit}</span>
      </div>
      <div className="relative mt-3 flex min-h-[20px] items-center gap-2 text-xs">
        {change !== null && change !== undefined && (
          <span className={cx('inline-flex items-center gap-0.5 font-semibold', good ? 'text-leaf-400' : 'text-amber-300')}>
            {good ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {changeLabel && <span className="text-zinc-500">{changeLabel}</span>}
      </div>
      {footnote && <p className="relative mt-1 text-[11px] text-zinc-500">{footnote}</p>}
    </Card>
  )
}

const REC_ICONS = { transport: Car, electricity: Zap, cooking: Flame }
const TITLE_ICONS = [
  [/bus|metro|public/i, Bus],
  [/two-wheeler|cycle/i, Bike],
  [/renewable|solar/i, Sun],
  [/AC|thermostat/i, Plug],
  [/appliance/i, Lightbulb],
]

export function RecommendationCard({ rec, index = 0, compact }) {
  const Icon = TITLE_ICONS.find(([re]) => re.test(rec.title))?.[1] || REC_ICONS[rec.category] || Lightbulb
  const tone = { high: 'green', medium: 'lime', low: 'default' }[rec.priority]
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className={cx('group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] transition-colors hover:border-leaf-400/25 hover:bg-white/[0.04]', compact ? 'p-4' : 'p-5')}
    >
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-leaf-400/15 bg-leaf-400/10 text-mint-300">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[15px] font-semibold text-white">{rec.title}</h4>
            <Badge tone={tone}>{rec.priority} impact</Badge>
          </div>
          {!compact && <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{rec.recommendation_text}</p>}
          {!compact && rec.assumption && (
            <p className="mt-2.5 rounded-lg bg-ink-900/70 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-zinc-500">{rec.assumption}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-lg font-bold text-leaf-400">−{kg(rec.estimated_savings)}</p>
          <p className="text-[11px] text-zinc-500">kg CO₂e / mo</p>
        </div>
      </div>
    </motion.div>
  )
}
