export const CATEGORY_META = {
  electricity: { label: 'Electricity', color: '#bef264' },
  car: { label: 'Car travel', color: '#34d399' },
  two_wheeler: { label: 'Two-wheeler', color: '#2dd4bf' },
  public_transport: { label: 'Public transport', color: '#7dd3fc' },
  cooking: { label: 'Cooking (LPG)', color: '#fbbf24' },
}

export const kg = (v, digits = 1) =>
  v === null || v === undefined || Number.isNaN(v)
    ? '—'
    : Number(v).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const tonnes = (kgValue) => (kgValue / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export const pct = (v, digits = 1) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(digits)}%`)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const monthLabel = (ym, withYear = true) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return withYear ? `${MONTHS[Number(m) - 1]} ${y}` : MONTHS[Number(m) - 1]
}

export const shortMonth = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${MONTHS[Number(m) - 1]} ’${y.slice(2)}`
}

export const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const timeAgo = (ts) => {
  if (!ts) return ''
  const d = new Date(ts.replace(' ', 'T') + (ts.includes('Z') || ts.includes('+') ? '' : 'Z'))
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}
