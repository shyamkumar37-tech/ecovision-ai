// src/pages/Carbon.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, PieChart, Pie } from 'recharts'
import { Zap, Droplets, Car, FileText, Calculator, TrendingDown } from 'lucide-react'
import { useCarbonCalculate } from '@/hooks'
import { SDGBadge, TipItem, PageHeader, ScoreRing } from '@/components/ui'
import type { CarbonCalculateResponse } from '@/types'

const schema = z.object({
  electricity_kwh: z.coerce.number().min(0).max(9_999_999),
  water_liters:    z.coerce.number().min(0).max(99_999_999),
  transport_km:    z.coerce.number().min(0).max(9_999_999),
  paper_kg:        z.coerce.number().min(0).max(999_999),
})
type FormData = z.infer<typeof schema>

const FIELDS = [
  { key: 'electricity_kwh', label: 'Electricity', unit: 'kWh', icon: Zap,       color: '#f59e0b', placeholder: '48230' },
  { key: 'water_liters',    label: 'Water',       unit: 'L',   icon: Droplets,  color: '#3b82f6', placeholder: '3200000' },
  { key: 'transport_km',    label: 'Transport',   unit: 'km',  icon: Car,       color: '#a855f7', placeholder: '45000' },
  { key: 'paper_kg',        label: 'Paper',       unit: 'kg',  icon: FileText,  color: '#22c55e', placeholder: '250' },
] as const

const COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#22c55e']

const CustomTooltip = ({ active, payload }: any) =>
  active && payload?.length ? (
    <div className="bg-eco-elevated border border-eco-border rounded-xl p-3 text-xs shadow-xl">
      <p className="font-semibold text-eco-text">{payload[0].name}</p>
      <p className="text-eco-accent mt-1">{payload[0].value.toFixed(1)} kg CO₂e</p>
    </div>
  ) : null

export default function Carbon() {
  const [result, setResult] = useState<CarbonCalculateResponse | null>(null)
  const { mutate, isPending } = useCarbonCalculate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { electricity_kwh: 48230, water_liters: 3200000, transport_km: 45000, paper_kg: 250 },
  })

  const onSubmit = (data: FormData) => {
    mutate(data, { onSuccess: setResult })
  }

  const breakdownData = result ? [
    { name: 'Electricity', value: result.breakdown.electricity_co2 },
    { name: 'Water',       value: result.breakdown.water_co2 },
    { name: 'Transport',   value: result.breakdown.transport_co2 },
    { name: 'Paper',       value: result.breakdown.paper_co2 },
  ] : []

  const savingsScore = result ? Math.min(100, Math.round((result.potential_savings_kg / result.total_carbon_kg) * 100)) : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Carbon Footprint Calculator"
        subtitle="Calculate CO₂ emissions using IEA / IPCC factors — SDG 13 aligned"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-eco-500/10 flex items-center justify-center">
                <Calculator size={15} className="text-eco-400" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-eco-text">Monthly Inputs</h3>
                <p className="text-[11px] text-eco-muted">Enter institution-level data</p>
              </div>
            </div>

            {FIELDS.map(({ key, label, unit, icon: Icon, color, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon size={12} style={{ color }} />
                  </div>
                  <input
                    {...register(key)}
                    type="number"
                    placeholder={placeholder}
                    className="input-field pl-11 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-eco-muted font-mono">{unit}</span>
                </div>
                {errors[key] && <p className="text-[11px] text-red-400 mt-1">{errors[key]?.message}</p>}
              </div>
            ))}

            <button type="submit" className="btn-primary w-full justify-center" disabled={isPending}>
              {isPending ? (
                <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Calculating…</>
              ) : (
                <><Calculator size={15} />Calculate Carbon Footprint</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Results */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card h-full flex flex-col items-center justify-center text-center py-16"
              >
                <div className="text-5xl mb-4 animate-float">🌍</div>
                <h3 className="font-display text-lg font-semibold text-eco-text mb-2">Ready to Calculate</h3>
                <p className="text-sm text-eco-muted max-w-xs">Enter your monthly consumption data and hit calculate to see your CO₂ footprint breakdown.</p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Hero metric */}
                <div className="card relative overflow-hidden">
                  <div className="absolute inset-0 bg-glow-green opacity-40 pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-6 flex-wrap">
                    <div>
                      <p className="label">Total Monthly CO₂</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-5xl font-bold gradient-text">{result.total_carbon_kg.toLocaleString()}</span>
                        <span className="text-eco-muted">kg CO₂e</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-eco-muted">Annual projection:</span>
                        <span className="text-sm font-semibold text-eco-400">{result.annual_projection_kg.toLocaleString()} kg</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {result.sdg_tags.map(t => <SDGBadge key={t} tag={t} showLabel />)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                      <div className="text-center">
                        <div className="relative inline-block">
                          <ScoreRing score={savingsScore} size={90} />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-display text-xl font-bold gradient-text">{savingsScore}%</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-eco-muted mt-1">Savings potential</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-eco-400">
                          <TrendingDown size={16} />
                          <span className="font-display text-lg font-bold">{result.potential_savings_kg.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-eco-muted">kg saved / mo</p>
                        <p className="text-[9px] text-eco-muted">if tips followed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakdown chart */}
                <div className="card">
                  <h3 className="font-display text-sm font-semibold text-eco-text mb-4">Emissions Breakdown</h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={160}>
                      <BarChart data={breakdownData} margin={{ left: -20 }}>
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="CO₂e" radius={[6,6,0,0]}>
                          {breakdownData.map((_, i) => <Cell key={i} fill={COLORS[i]} fillOpacity={0.85} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {breakdownData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                          <span className="text-eco-muted w-20">{d.name}</span>
                          <span className="font-semibold text-eco-text">{d.value.toFixed(0)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="card">
                  <h3 className="font-display text-sm font-semibold text-eco-text mb-3">AI Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.slice(0, 4).map((tip, i) => (
                      <TipItem key={i} text={tip} index={i} />
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
