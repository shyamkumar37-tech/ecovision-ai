// src/pages/Dashboard.tsx
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useDashboardMetrics, useDashboardTrends } from '@/hooks'
import { StatCard, SkeletonCard, PageHeader, ScoreRing, SDGBadge } from '@/components/ui'
import { TrendingDown, TrendingUp, Minus, Zap, Droplets, Trash2, Wind } from 'lucide-react'

const MOCK_TRENDS = [
  { month: 'Jan', energy_kwh: 68000, water_liters: 4100000, waste_kg: 18500, carbon_kg: 32000, sustainability_score: 61 },
  { month: 'Feb', energy_kwh: 62000, water_liters: 3900000, waste_kg: 17200, carbon_kg: 29000, sustainability_score: 65 },
  { month: 'Mar', energy_kwh: 58000, water_liters: 3700000, waste_kg: 16800, carbon_kg: 27000, sustainability_score: 68 },
  { month: 'Apr', energy_kwh: 54000, water_liters: 3500000, waste_kg: 15600, carbon_kg: 25000, sustainability_score: 70 },
  { month: 'May', energy_kwh: 52000, water_liters: 3400000, waste_kg: 14200, carbon_kg: 23500, sustainability_score: 72 },
  { month: 'Jun', energy_kwh: 48230, water_liters: 3200000, waste_kg: 12400, carbon_kg: 22100, sustainability_score: 74 },
]

const SDG_DATA = [
  { subject: 'Energy', score: 78,  sdg: 'SDG 7',  color: '#f59e0b' },
  { subject: 'Urban',  score: 71,  sdg: 'SDG 11', color: '#fb923c' },
  { subject: 'Waste',  score: 68,  sdg: 'SDG 12', color: '#22c55e' },
  { subject: 'Carbon', score: 80,  sdg: 'SDG 13', color: '#14b8a6' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-eco-elevated border border-eco-border rounded-xl p-3 text-xs shadow-2xl">
      <p className="font-semibold text-eco-text mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-eco-muted">{p.name}:</span>
          <span className="text-eco-text font-medium">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data: metrics, isLoading: mLoading } = useDashboardMetrics()
  const { data: trends, isLoading: tLoading } = useDashboardTrends()

  const trendData = trends?.data_points?.map((d: any) => ({
    ...d,
    month: d.month.slice(5), // "2025-06" → "06"
  })) ?? MOCK_TRENDS

  const score = metrics?.sustainability_score ?? 74

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Sustainability Dashboard"
        subtitle="Green Valley University · Real-time campus overview"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-eco-green/10 border border-eco-green/20">
            <span className="w-2 h-2 rounded-full bg-eco-400 animate-pulse" />
            <span className="text-xs text-eco-400 font-medium">Live</span>
          </div>
        }
      />

      {/* Hero score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="card mb-6 relative overflow-hidden bg-grid"
        style={{ background: 'linear-gradient(135deg, rgba(17,31,17,0.95), rgba(11,26,11,0.9))' }}
      >
        <div className="absolute inset-0 bg-glow-green opacity-50 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-8 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="relative">
              <ScoreRing score={score} size={140} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-bold gradient-text">{score}</span>
                <span className="text-[10px] text-eco-muted tracking-wider">/ 100</span>
              </div>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-eco-text">Sustainability Score</h2>
              <div className="flex items-center gap-2 mt-1">
                {metrics?.trend === 'improved' ? (
                  <><TrendingDown size={14} className="text-eco-400" /><span className="text-eco-400 text-sm">+{metrics?.score_delta ?? 6} pts improved</span></>
                ) : metrics?.trend === 'declined' ? (
                  <><TrendingUp size={14} className="text-red-400" /><span className="text-red-400 text-sm">Declined this month</span></>
                ) : (
                  <><Minus size={14} className="text-eco-muted" /><span className="text-eco-muted text-sm">Stable</span></>
                )}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {['SDG 7', 'SDG 11', 'SDG 12', 'SDG 13'].map(t => <SDGBadge key={t} tag={t} showLabel />)}
              </div>
            </div>
          </div>

          {/* SDG mini scores */}
          <div className="flex-1 grid grid-cols-2 gap-3 min-w-[240px]">
            {SDG_DATA.map(({ sdg, subject, score: s, color }) => (
              <div key={sdg} className="flex items-center gap-3 p-3 rounded-xl bg-eco-surface/50 border border-eco-border/30">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${color}20`, color }}>
                  {s}
                </div>
                <div>
                  <div className="text-[10px] text-eco-muted">{sdg}</div>
                  <div className="text-xs text-eco-text font-medium">{subject}</div>
                  <div className="h-1 w-16 bg-eco-border rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s}%`, background: color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {mLoading ? (
          Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (<>
          <StatCard label="Energy Usage"       value={metrics ? (metrics.energy_kwh / 1000).toFixed(1) : '48.2'} unit="MWh"   icon="⚡" color="amber"  delta={-12} delay={0} />
          <StatCard label="Water Consumption"  value={metrics ? (metrics.water_liters / 1_000_000).toFixed(1) : '3.2'}    unit="ML"    icon="💧" color="blue"   delta={-8}  delay={0.08} />
          <StatCard label="Waste Generated"    value={metrics ? (metrics.waste_kg / 1000).toFixed(1) : '12.4'}    unit="t"     icon="♻️" color="purple" delta={3}   delay={0.16} />
          <StatCard label="Carbon Footprint"   value={metrics ? (metrics.carbon_kg / 1000).toFixed(1) : '22.1'}   unit="tCO₂"  icon="🌿" color="teal"   delta={-15} delay={0.24} />
        </>)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold text-eco-text">Energy & Carbon Trend</h3>
            <p className="text-xs text-eco-muted mt-0.5">6-month monthly performance</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_TRENDS} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="gEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCarbon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="energy_kwh" name="Energy kWh" stroke="#f59e0b" fill="url(#gEnergy)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="carbon_kg"  name="Carbon kg"  stroke="#14b8a6" fill="url(#gCarbon)"  strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="card"
        >
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold text-eco-text">SDG Alignment Scores</h3>
            <p className="text-xs text-eco-muted mt-0.5">Goals 7 · 11 · 12 · 13</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={SDG_DATA}>
              <PolarGrid stroke="rgba(34,197,94,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--eco-muted)' }} />
              <Radar name="Score" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Score bars + waste trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card"
        >
          <h3 className="font-display text-base font-semibold text-eco-text mb-4">Score Weights</h3>
          {[
            { label: 'Energy (30%)',  v: 78, color: '#f59e0b' },
            { label: 'Water (20%)',   v: 72, color: '#3b82f6' },
            { label: 'Waste (25%)',   v: 68, color: '#a855f7' },
            { label: 'Carbon (25%)', v: 80, color: '#22c55e' },
          ].map(({ label, v, color }, i) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-eco-muted">{label}</span>
                <span className="text-xs font-semibold text-eco-text">{v}</span>
              </div>
              <div className="h-2 bg-eco-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${v}%` }}
                  transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                  style={{ background: color }}
                />
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
          className="card col-span-1 lg:col-span-2"
        >
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold text-eco-text">Waste & Water Monthly</h3>
            <p className="text-xs text-eco-muted mt-0.5">Consumption reduction progress</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={MOCK_TRENDS} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="waste_kg"  name="Waste kg"   fill="#a855f7" fillOpacity={0.8} radius={[4,4,0,0]} />
              <Bar dataKey="water_liters" name="Water L" fill="#3b82f6" fillOpacity={0.6} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
