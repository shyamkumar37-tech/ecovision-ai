// src/components/ui/index.tsx
// Reusable primitives used across all pages

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SDGTag } from '@/types'

// ── cn utility ────────────────────────────────────────────────────────────────
// (also exported from lib/utils.ts)
export { cn }

// ── SDG Badge ─────────────────────────────────────────────────────────────────
const SDG_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  'SDG 7':  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/25',  label: 'Clean Energy' },
  'SDG 11': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25', label: 'Sust. Cities' },
  'SDG 12': { bg: 'bg-eco-500/10',    text: 'text-eco-400',    border: 'border-eco-500/25',    label: 'Consumption' },
  'SDG 13': { bg: 'bg-teal-500/10',   text: 'text-teal-400',   border: 'border-teal-500/25',   label: 'Climate' },
}

export const SDGBadge = ({ tag, showLabel = false }: { tag: string; showLabel?: boolean }) => {
  const s = SDG_STYLES[tag] ?? SDG_STYLES['SDG 13']
  return (
    <span className={cn('sdg-pill border', s.bg, s.text, s.border)}>
      <span className="font-mono text-[9px] opacity-70">{tag}</span>
      {showLabel && <span className="hidden sm:inline">{s.label}</span>}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('shimmer-bg rounded-lg', className)} />
)

export const SkeletonCard = () => (
  <div className="card space-y-4">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-3 w-1/2" />
  </div>
)

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  delta?: number
  icon: string
  color: 'green' | 'blue' | 'amber' | 'purple' | 'teal'
  delay?: number
}

const COLOR_MAP = {
  green:  { accent: 'text-eco-400',    glow: 'shadow-glow-sm',       ring: 'ring-eco-500/20',    icon: 'bg-eco-500/10' },
  blue:   { accent: 'text-blue-400',   glow: 'shadow-blue-500/20',   ring: 'ring-blue-500/20',   icon: 'bg-blue-500/10' },
  amber:  { accent: 'text-amber-400',  glow: 'shadow-amber-500/20',  ring: 'ring-amber-500/20',  icon: 'bg-amber-500/10' },
  purple: { accent: 'text-purple-400', glow: 'shadow-purple-500/20', ring: 'ring-purple-500/20', icon: 'bg-purple-500/10' },
  teal:   { accent: 'text-teal-400',   glow: 'shadow-teal-500/20',   ring: 'ring-teal-500/20',   icon: 'bg-teal-500/10' },
}

export const StatCard = ({ label, value, unit, delta, icon, color, delay = 0 }: StatCardProps) => {
  const c = COLOR_MAP[color]
  const isDown = delta !== undefined && delta < 0
  const isUp   = delta !== undefined && delta > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card glass-hover relative overflow-hidden group"
    >
      {/* Ambient glow */}
      <div className={cn('absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500', c.icon)} />

      <div className={cn('inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 text-xl', c.icon)}>
        {icon}
      </div>

      <p className="label">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={cn('font-display text-3xl font-bold', c.accent)}>{value}</span>
        {unit && <span className="text-sm text-eco-muted">{unit}</span>}
      </div>

      {delta !== undefined && (
        <p className={cn('text-xs mt-2 flex items-center gap-1', isDown ? 'text-eco-400' : isUp ? 'text-red-400' : 'text-eco-muted')}>
          <span>{isDown ? '↓' : isUp ? '↑' : '—'}</span>
          <span>{Math.abs(delta).toFixed(1)}% vs last month</span>
        </p>
      )}
    </motion.div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export const PageHeader = ({
  title, subtitle, action
}: { title: string; subtitle: string; action?: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start justify-between mb-8"
  >
    <div>
      <h1 className="font-display text-2xl font-bold text-eco-text">{title}</h1>
      <p className="text-eco-muted text-sm mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
)

// ── Score Ring ────────────────────────────────────────────────────────────────
export const ScoreRing = ({ score, size = 120 }: { score: number; size?: number }) => {
  const r = (size / 2) - 10
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(34,197,94,0.1)" strokeWidth="8" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#scoreGrad)" strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Tip Item ──────────────────────────────────────────────────────────────────
export const TipItem = ({ text, index = 0 }: { text: string; index?: number }) => (
  <motion.li
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.08 }}
    className="flex gap-3 p-3 rounded-xl bg-eco-green/5 border border-eco-green/10 text-sm text-eco-text"
  >
    <span className="text-eco-400 mt-0.5 flex-shrink-0">✦</span>
    <span>{text.replace(/ \[SDG \d+\]$/, '')}</span>
  </motion.li>
)

// ── Status Badge ──────────────────────────────────────────────────────────────
export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    ready:      'bg-eco-500/10 text-eco-400 border-eco-500/20',
    processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed:     'bg-red-500/10 text-red-400 border-red-500/20',
    queued:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    generating: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider border', map[status] ?? map.queued)}>
      {status === 'processing' || status === 'generating' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {status.toUpperCase()}
    </span>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4 animate-float">{icon}</div>
    <h3 className="font-display text-lg font-semibold text-eco-text mb-2">{title}</h3>
    <p className="text-sm text-eco-muted max-w-xs">{description}</p>
  </div>
)
