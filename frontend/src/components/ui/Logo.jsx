import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg-eco" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a7f3d0" />
          <stop offset="0.5" stopColor="#34d399" />
          <stop offset="1" stopColor="#bef264" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0e1f17" stroke="rgba(255,255,255,0.08)" />
      <path d="M9 21c0-7 5.5-12 14-12 0 8.5-5 14-12 14l-2 2" fill="none" stroke="url(#lg-eco)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 19.5l5.5-5.5" stroke="#bef264" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight text-white">
        EcoTrack<span className="text-gradient"> AI</span>
      </span>
    </Link>
  )
}
