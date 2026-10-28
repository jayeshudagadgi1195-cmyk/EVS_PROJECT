import { useEffect, useRef } from 'react'
import { animate, motion, useInView } from 'framer-motion'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

const cx = (...c) => c.filter(Boolean).join(' ')
export { cx }

export function Card({ className, children, hover = false, delay = 0, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cx('card', hover && 'transition-colors duration-300 hover:border-white/[0.14]', className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

const BUTTON_VARIANTS = {
  primary:
    'bg-gradient-to-b from-leaf-400 to-leaf-500 text-ink-950 shadow-glow hover:from-mint-400 hover:to-leaf-400',
  secondary: 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/20',
  ghost: 'text-zinc-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'border border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/20',
}

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, ...rest }) {
  const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2' }
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size], BUTTON_VARIANTS[variant], className,
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </motion.button>
  )
}

export function Badge({ tone = 'default', children, className }) {
  const tones = {
    default: 'border-white/10 bg-white/[0.05] text-zinc-300',
    green: 'border-leaf-400/25 bg-leaf-400/10 text-mint-300',
    lime: 'border-lime-400/25 bg-lime-400/10 text-lime-300',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    red: 'border-red-400/25 bg-red-400/10 text-red-300',
    sky: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-[28px] sm:leading-tight">{title}</h1>
        {description && <p className="muted mt-2 text-[15px] leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  )
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton rounded-xl', className)} />
}

export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}

export function ErrorState({ error, onRetry, compact }) {
  return (
    <Card className={cx('card-pad flex flex-col items-center text-center', compact ? 'py-8' : 'py-16')}>
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
        <AlertTriangle className="h-5 w-5 text-amber-300" />
      </div>
      <h3 className="text-lg">Something went wrong</h3>
      <p className="muted mt-1.5 max-w-md text-sm leading-relaxed">{error?.message || String(error)}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" icon={RefreshCw} onClick={() => onRetry()}>
          Try again
        </Button>
      )}
    </Card>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <Card className="card-pad relative flex flex-col items-center overflow-hidden py-16 text-center">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-leaf-400/20 bg-leaf-400/10">
        {Icon && <Icon className="h-6 w-6 text-mint-300" />}
      </div>
      <h3 className="relative text-lg">{title}</h3>
      <p className="muted relative mt-1.5 max-w-md text-sm leading-relaxed">{text}</p>
      {action && <div className="relative mt-6">{action}</div>}
    </Card>
  )
}

export function AnimatedNumber({ value, digits = 1, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const prev = useRef(0)
  useEffect(() => {
    if (!inView || value === null || value === undefined) return
    const controls = animate(prev.current, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current)
          ref.current.textContent = v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
      },
    })
    prev.current = value
    return () => controls.stop()
  }, [value, inView, digits])
  return <span ref={ref} className={cx('num', className)}>{value === null || value === undefined ? '—' : '0'}</span>
}

export function Field({ label, hint, error, suffix, children, as: Tag = 'label' }) {
  return (
    <Tag className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-zinc-300">
        {label}
        {hint && <span className="text-[11px] font-normal text-zinc-500">{hint}</span>}
      </span>
      <span className="relative block">
        {children}
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{suffix}</span>}
      </span>
      {error && <span className="mt-1 block text-xs text-red-300">{error}</span>}
    </Tag>
  )
}

export function NumberInput({ value, onChange, ...rest }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      className="field pr-16"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('relative flex rounded-xl border border-white/10 bg-ink-900/80 p-1', className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx('relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
              active ? 'text-ink-950' : 'text-zinc-400 hover:text-white')}
          >
            {active && (
              <motion.span layoutId={`seg-${options.map((x) => x.value).join('')}`} className="absolute inset-0 -z-10 rounded-lg bg-mint-300"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            {Icon && <Icon className="h-4 w-4" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Slider({ label, value, onChange, max = 100, step = 1, suffix = '%', icon: Icon, helper }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
          {Icon && <Icon className="h-4 w-4 text-zinc-500" />}
          {label}
        </span>
        <span className="num rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-white">{value}{suffix}</span>
      </div>
      <input
        type="range"
        className="eco-range"
        min="0"
        max={max}
        step={step}
        value={value}
        style={{ '--val': `${(value / max) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      {helper && <p className="mt-1.5 text-[11px] text-zinc-500">{helper}</p>}
    </div>
  )
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-4 w-4 animate-spin text-leaf-400', className)} />
}
