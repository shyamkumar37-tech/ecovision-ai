// src/pages/Analytics.tsx
// Production analytics with advanced Recharts — trends, benchmarks, forecasting
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { TrendingDown, TrendingUp, Award, Target } from 'lucide-react'
import { useDashboardTrends } from '@/hooks'
import { PageHeader, SDGBadge, SkeletonCard } from '@/components/ui'

const MONTHLY = [
  { month:'Jan', energy:68000, water:4100000, waste:18500, carbon:32000, score:61, target:70 },
  { month:'Feb', energy:62000, water:3900000, waste:17200, carbon:29000, score:65, target:70 },
  { month:'Mar', energy:58000, water:3700000, waste:16800, carbon:27000, score:68, target:72 },
  { month:'Apr', energy:54000, water:3500000, waste:15600, carbon:25000, score:70, target:72 },
  { month:'May', energy:52000, water:3400000, waste:14200, carbon:23500, score:72, target:74 },
  { month:'Jun', energy:48230, water:3200000, waste:12400, carbon:22100, score:74, target:74 },
  { month:'Jul', energy:46000, water:3100000, waste:11800, carbon:21000, score:76, target:76 },
]

const PEER_BENCH = [
  { category:'Energy',  ours:78, peer_avg:62, top_10:85 },
  { category:'Water',   ours:72, peer_avg:58, top_10:80 },
  { category:'Waste',   ours:68, peer_avg:55, top_10:78 },
  { category:'Carbon',  ours:80, peer_avg:64, top_10:88 },
]

const FORECAST = [
  { month:'Aug', actual:null, forecast:46, lower:43, upper:49 },
  { month:'Sep', actual:null, forecast:44, lower:41, upper:47 },
  { month:'Oct', actual:null, forecast:42, lower:39, upper:45 },
  { month:'Nov', actual:null, forecast:40, lower:37, upper:43 },
  { month:'Dec', actual:null, forecast:38, lower:35, upper:41 },
]

const COMBINED = [
  ...MONTHLY.map(m => ({ month: m.month, actual: (m.energy/1000).toFixed(1), forecast: null, score: m.score, target: m.target })),
  ...FORECAST.map(f => ({ ...f, actual: null })),
]

const TT = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="card-sm text-xs shadow-2xl">
      <p className="font-semibold mb-1.5" style={{ color: 'var(--txt)', fontFamily: 'var(--fd)' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--muted)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--txt)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  ) : null

const insightCards = [
  { icon: TrendingDown, title: 'Best improvement',  value: 'Carbon −15%',  sub: 'vs last month', color: '#22c55e' },
  { icon: Award,        title: 'Top SDG score',     value: 'SDG 13: 80',   sub: 'Climate Action', color: '#14b8a6' },
  { icon: Target,       title: 'Monthly target',    value: 'On track ✓',   sub: 'Score 74 ≥ 74', color: '#f59e0b' },
  { icon: TrendingUp,   title: 'Forecast score',    value: '82 by Dec',    sub: 'At current pace', color: '#a855f7' },
]

export default function Analytics() {
  const { isLoading } = useDashboardTrends()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Sustainability Analytics"
        subtitle="Trends · Benchmarking · Forecasting · SDG progress"
        action={<div className="flex gap-2">{['SDG 7','SDG 11','SDG 12','SDG 13'].map(t => <SDGBadge key={t} tag={t} />)}</div>}
      />

      {/* Insight KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        {insightCards.map(({ icon: Icon, title, value, sub, color }) => (
          <motion.div key={title} className="card glass-hover">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="label">{title}</p>
            <p className="font-display text-2xl font-bold mt-1" style={{ color, fontFamily: 'var(--fd)' }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Score trend vs target */}
      <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:.1 }} className="card mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-sm font-semibold" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Sustainability Score vs Target</h3>
            <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>Actual performance + 5-month AI forecast</p>
          </div>
          <div className="flex gap-3 text-[11px]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{background:'#22c55e'}}/>Actual</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded border-dashed border" style={{borderColor:'#f59e0b'}}/>Target</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{background:'rgba(168,85,247,.6)'}}/>Forecast</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={COMBINED} margin={{ top:5,right:5,bottom:0,left:-10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize:10 }} />
            <YAxis domain={[55,95]} tick={{ fontSize:10 }} />
            <Tooltip content={<TT />} />
            <ReferenceLine y={74} stroke="rgba(255,255,255,.1)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="score"    name="Score"    stroke="#22c55e" fill="rgba(34,197,94,.1)"  strokeWidth={2.5} dot={{ r:3, fill:'#22c55e' }} />
            <Line  type="monotone" dataKey="target"  name="Target"   stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            <Line  type="monotone" dataKey="forecast" name="Forecast" stroke="rgba(168,85,247,.7)" strokeWidth={2} strokeDasharray="3 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Energy forecast */}
        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:.18 }} className="card">
          <h3 className="font-display text-sm font-semibold mb-1" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Energy Consumption Forecast</h3>
          <p className="text-xs mb-4" style={{ color:'var(--muted)' }}>MWh · actual + 5-month prediction</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={COMBINED} margin={{ top:5,right:5,bottom:0,left:-15 }}>
              <defs>
                <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFcast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize:9 }} />
              <YAxis tick={{ fontSize:9 }} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="actual"   name="Actual MWh"   stroke="#f59e0b" fill="url(#gActual)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="forecast" name="Forecast MWh"  stroke="#a855f7" fill="url(#gFcast)"  strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Peer benchmarking */}
        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:.24 }} className="card">
          <h3 className="font-display text-sm font-semibold mb-1" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Peer Benchmarking</h3>
          <p className="text-xs mb-4" style={{ color:'var(--muted)' }}>vs 47 similar institutions · India</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={PEER_BENCH} margin={{ top:5,right:5,bottom:0,left:-15 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize:9 }} />
              <YAxis domain={[0,100]} tick={{ fontSize:9 }} />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ fontSize:'10px' }} />
              <Bar dataKey="top_10"   name="Top 10%"    fill="rgba(34,197,94,.35)"  radius={[4,4,0,0]} />
              <Bar dataKey="ours"     name="Our Score"  fill="#22c55e"              radius={[4,4,0,0]} />
              <Bar dataKey="peer_avg" name="Peer Avg"   fill="rgba(168,85,247,.4)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* SDG Progress bars */}
      <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:.3 }} className="card">
        <h3 className="font-display text-sm font-semibold mb-4" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>SDG Goal Progress (2025 Targets)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { sdg:'SDG 7',  label:'Clean Energy',          score:78, target:85, color:'#f59e0b', detail:'15% renewable mix achieved' },
            { sdg:'SDG 11', label:'Sustainable Cities',    score:71, target:80, color:'#fb923c', detail:'Green building audit in progress' },
            { sdg:'SDG 12', label:'Responsible Consumption',score:68,target:80, color:'#22c55e', detail:'Recycling rate 42% → target 60%' },
            { sdg:'SDG 13', label:'Climate Action',        score:80, target:90, color:'#14b8a6', detail:'SBT submitted — awaiting validation' },
          ].map(({ sdg, label, score, target, color, detail }) => (
            <div key={sdg}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <SDGBadge tag={sdg} />
                  <span className="text-xs" style={{ color:'var(--muted)' }}>{label}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color }}>{score} / {target}</span>
              </div>
              <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background:'var(--border)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1.2, delay: .4, ease: 'easeOut' }}
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ background: color }}
                />
                <div className="absolute top-0 h-full w-px opacity-60" style={{ left:`${target}%`, background:'rgba(255,255,255,.5)' }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color:'var(--muted)' }}>{detail}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
