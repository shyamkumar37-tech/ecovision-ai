// src/pages/WasteDocsReports.tsx
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useDropzone } from 'react-dropzone'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FileText, Trash2, Upload, CheckCircle, AlertCircle, Clock, BarChart3, Download, Loader2 } from 'lucide-react'
import { useWasteAnalyze, useDocuments, useUploadDocument, useDeleteDocument, useGenerateReport, useReportStatus } from '@/hooks'
import { SDGBadge, TipItem, PageHeader, StatusBadge, EmptyState, Skeleton } from '@/components/ui'
import { reportsApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import type { WasteAnalyzeResponse } from '@/types'

const schema = z.object({
  plastic_kg: z.coerce.number().min(0),
  paper_kg:   z.coerce.number().min(0),
  food_kg:    z.coerce.number().min(0),
  ewaste_kg:  z.coerce.number().min(0),
})
type FormData = z.infer<typeof schema>

const WASTE_COLORS: Record<string, string> = {
  plastic: '#3b82f6', paper: '#f59e0b', food: '#22c55e', ewaste: '#ef4444',
}
const POTENTIAL_COLORS: Record<string, string> = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' }

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return percent > 0.08 ? (
    <text x={x} y={y} fill="#e2f0e2" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null
}

export default function Waste() {
  const [result, setResult] = useState<WasteAnalyzeResponse | null>(null)
  const { mutate, isPending } = useWasteAnalyze()

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plastic_kg: 120, paper_kg: 85, food_kg: 210, ewaste_kg: 15 },
  })

  const onSubmit = (data: FormData) => mutate(data, { onSuccess: setResult })

  const chartData = result?.categories.map(c => ({ name: c.category, value: c.weight_kg })) ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="Waste Management Advisor" subtitle="AI-powered classification & disposal guidance — SDG 12 aligned" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
            <h3 className="font-display text-sm font-semibold text-eco-text">Weekly Waste Input</h3>
            {[
              { key: 'plastic_kg', label: 'Plastic', icon: '♻️', color: '#3b82f6' },
              { key: 'paper_kg',   label: 'Paper',   icon: '📄', color: '#f59e0b' },
              { key: 'food_kg',    label: 'Food Waste', icon: '🍎', color: '#22c55e' },
              { key: 'ewaste_kg',  label: 'E-Waste', icon: '💻', color: '#ef4444' },
            ].map(({ key, label, icon, color }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">{icon}</span>
                  <input {...register(key as any)} type="number" className="input-field pl-10 pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-eco-muted font-mono">kg</span>
                </div>
              </div>
            ))}
            <button type="submit" className="btn-primary w-full justify-center" disabled={isPending}>
              {isPending ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Analyzing…</> : '🔍 Analyze Waste'}
            </button>
          </form>
        </motion.div>

        {/* Results */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="card h-full flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4 animate-float">🗑️</div>
                <h3 className="font-display text-lg font-semibold text-eco-text mb-2">Ready to Analyze</h3>
                <p className="text-sm text-eco-muted max-w-xs">Enter weekly waste generation by category to get AI-powered disposal recommendations.</p>
              </motion.div>
            ) : (
              <motion.div key="r" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                {/* Hero */}
                <div className="card flex items-center gap-6 flex-wrap">
                  <div>
                    <p className="label">Total Waste</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl font-bold gradient-text">{result.total_waste_kg.toFixed(0)}</span>
                      <span className="text-eco-muted">kg / week</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-eco-muted">Impact Score:</span>
                      <span className="font-semibold text-eco-400">{result.sustainability_impact_score.toFixed(0)}/100</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {result.sdg_tags.map(t => <SDGBadge key={t} tag={t} showLabel />)}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} dataKey="value" labelLine={false} label={CustomLabel}>
                          {chartData.map((d, i) => <Cell key={i} fill={WASTE_COLORS[d.name] ?? '#999'} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)} kg`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories */}
                <div className="card">
                  <h3 className="font-display text-sm font-semibold text-eco-text mb-3">Category Analysis</h3>
                  <div className="space-y-2">
                    {result.categories.map(c => (
                      <div key={c.category} className="flex items-center gap-3 p-3 rounded-xl bg-eco-elevated/50 border border-eco-border/30">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: WASTE_COLORS[c.category] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-eco-text capitalize">{c.category}</span>
                            <span className="text-[10px] text-eco-muted">{c.weight_kg}kg ({c.percentage}%)</span>
                          </div>
                          <p className="text-[10px] text-eco-muted mt-0.5 line-clamp-1">{c.disposal_method}</p>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: POTENTIAL_COLORS[c.recycling_potential], background: `${POTENTIAL_COLORS[c.recycling_potential]}18` }}>
                          {c.recycling_potential.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="card">
                  <h3 className="font-display text-sm font-semibold text-eco-text mb-3">AI Recommendations</h3>
                  <ul className="space-y-2">
                    {result.ai_recommendations.map((tip, i) => <TipItem key={i} text={tip} index={i} />)}
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


// ════════════════════════════════════════════════════════════════════════════
// src/pages/Documents.tsx
// ════════════════════════════════════════════════════════════════════════════

export function Documents() {
  const { data: docs, isLoading } = useDocuments()
  const { mutate: upload, isPending: uploading } = useUploadDocument()
  const { mutate: remove } = useDeleteDocument()

  const onDrop = useCallback((files: File[]) => {
    files.forEach(f => upload(f))
  }, [upload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxSize: 10 * 1024 * 1024,
  })

  const docStatusIcon = (status: string) => {
    if (status === 'ready')      return <CheckCircle size={14} className="text-eco-400" />
    if (status === 'failed')     return <AlertCircle size={14} className="text-red-400" />
    return <Clock size={14} className="text-amber-400" />
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Document Intelligence" subtitle="Upload PDFs & DOCX for RAG-powered Q&A · ChromaDB vector store" />

      {/* Drop zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div
          {...getRootProps()}
          className={`card mb-6 flex flex-col items-center justify-center py-12 cursor-pointer transition-all duration-200 text-center border-2 border-dashed
            ${isDragActive ? 'border-eco-500 bg-eco-green/5 shadow-glow' : 'border-eco-border hover:border-eco-500/50 hover:bg-eco-elevated/30'}`}
        >
          <input {...getInputProps()} />
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-2xl transition-transform duration-200 ${isDragActive ? 'scale-110 shadow-glow' : ''}`}
          style={{ background: isDragActive ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)' }}>
          {uploading ? <span className="w-6 h-6 border-2 border-eco-500/30 border-t-eco-500 rounded-full animate-spin" /> : <Upload size={24} className="text-eco-400" />}
        </div>
        <h3 className="font-display text-base font-semibold text-eco-text mb-1">
          {isDragActive ? 'Drop to upload' : 'Drag & drop files here'}
        </h3>
        <p className="text-sm text-eco-muted">PDF, DOCX, TXT · Max 10MB per file</p>
        <p className="text-xs text-eco-muted/60 mt-2">Files are chunked (512 tokens) and indexed into ChromaDB for RAG retrieval</p>
        </div>
      </motion.div>

      {/* Pipeline status */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="card mb-6">
        <h3 className="font-display text-sm font-semibold text-eco-text mb-3">RAG Pipeline Health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'SentenceTransformer', status: 'OK',  color: '#22c55e' },
            { label: 'ChromaDB',             status: 'OK',  color: '#22c55e' },
            { label: 'OpenRouter LLM',       status: 'OK',  color: '#22c55e' },
            { label: 'Redis Cache',           status: '95%', color: '#f59e0b' },
          ].map(({ label, status, color }) => (
            <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl bg-eco-elevated/50 border border-eco-border/30">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <div>
                <div className="text-[10px] text-eco-muted">{label}</div>
                <div className="text-xs font-semibold" style={{ color }}>{status}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Document list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <h3 className="font-display text-sm font-semibold text-eco-text mb-4">
          Indexed Documents
          {docs?.length > 0 && <span className="ml-2 text-xs text-eco-muted font-normal">({docs.length} files)</span>}
        </h3>

        {isLoading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !docs?.length ? (
          <EmptyState icon="📄" title="No documents yet" description="Upload sustainability reports, audits, or policy docs to enable RAG-powered Q&A in the AI chat." />
        ) : (
          <div className="space-y-2">
            {docs.map((doc: any, i: number) => (
              <motion.div key={doc.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-eco-elevated/40 border border-eco-border/30 group hover:border-eco-border transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-eco-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-eco-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {docStatusIcon(doc.status)}
                    <span className="text-sm font-medium text-eco-text truncate">{doc.filename}</span>
                  </div>
                  <div className="text-[11px] text-eco-muted">
                    {doc.status === 'ready' ? `${doc.chunk_count} chunks indexed · ` : ''}
                    {(doc.file_size / 1024).toFixed(0)} KB · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </div>
                </div>
                <StatusBadge status={doc.status} />
                <button onClick={() => remove(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-eco-muted hover:text-red-400 transition-all"
                  aria-label="Delete document">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}


// ════════════════════════════════════════════════════════════════════════════
// src/pages/Reports.tsx
// ════════════════════════════════════════════════════════════════════════════

const rSchema = z.object({
  title:           z.string().min(1),
  start_month:     z.coerce.number().min(1).max(12),
  start_year:      z.coerce.number().min(2020),
  end_month:       z.coerce.number().min(1).max(12),
  end_year:        z.coerce.number().min(2020),
  include_ai_insights:   z.boolean(),
  include_sdg_alignment: z.boolean(),
})
type ReportForm = z.infer<typeof rSchema>

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function Reports() {
  const [reportId, setReportId] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const { mutate: generate, isPending } = useGenerateReport()
  const { data: status } = useReportStatus(reportId)

  const { register, handleSubmit } = useForm<ReportForm>({
    resolver: zodResolver(rSchema),
    defaultValues: {
      title: 'Campus Sustainability Report',
      start_month: 1, start_year: 2025,
      end_month: 6,   end_year: 2025,
      include_ai_insights: true, include_sdg_alignment: true,
    },
  })

  const onSubmit = (data: ReportForm) => {
    generate(data, {
      onSuccess: (r) => {
        setReportId(r.id)
        setHistory(h => [r, ...h])
      }
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Sustainability Reports" subtitle="AI-generated PDFs with SDG alignment · Celery background tasks" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Generator form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-eco-500/10 flex items-center justify-center">
                <BarChart3 size={15} className="text-eco-400" />
              </div>
              <h3 className="font-display text-sm font-semibold text-eco-text">Generate Report</h3>
            </div>

            <div>
              <label className="label">Report Title</label>
              <input {...register('title')} className="input-field" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Month</label>
                <select {...register('start_month')} className="input-field">
                  {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Start Year</label>
                <select {...register('start_year')} className="input-field">
                  {[2023,2024,2025].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="label">End Month</label>
                <select {...register('end_month')} className="input-field">
                  {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">End Year</label>
                <select {...register('end_year')} className="input-field">
                  {[2023,2024,2025].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {[
                { key: 'include_ai_insights',   label: '🤖 AI-generated insights' },
                { key: 'include_sdg_alignment', label: '🌍 SDG alignment section' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                  <input {...register(key as any)} type="checkbox" className="w-4 h-4 rounded accent-eco-500" />
                  <span className="text-sm text-eco-muted group-hover:text-eco-text transition-colors">{label}</span>
                </label>
              ))}
            </div>

            <button type="submit" className="btn-primary w-full justify-center" disabled={isPending}>
              {isPending ? <><Loader2 size={14} className="animate-spin" />Queuing task…</> : <><BarChart3 size={14} />Generate PDF Report</>}
            </button>

            {status && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-eco-elevated border border-eco-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-eco-muted">Task status</span>
                  <StatusBadge status={status.status} />
                </div>
                {status.status === 'ready' && status.download_url && (
                  <a href={reportsApi.download(reportId!)} download
                    className="btn-primary w-full justify-center text-xs py-2">
                    <Download size={13} />Download PDF
                  </a>
                )}
              </motion.div>
            )}
          </form>
        </motion.div>

        {/* History */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3">
          <div className="card">
            <h3 className="font-display text-sm font-semibold text-eco-text mb-4">Report History</h3>
            {history.length === 0 ? (
              <EmptyState icon="📊" title="No reports yet" description="Generate your first sustainability report to see it here." />
            ) : (
              <div className="space-y-2">
                {history.map((r: any) => (
                  <motion.div key={r.id}
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-eco-elevated/40 border border-eco-border/30"
                  >
                    <div className="w-9 h-9 rounded-xl bg-eco-500/10 flex items-center justify-center flex-shrink-0">
                      {r.status === 'ready' ? <FileText size={16} className="text-eco-400" /> : <Loader2 size={16} className="text-amber-400 animate-spin" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-eco-text truncate">{r.title}</div>
                      <div className="text-[11px] text-eco-muted">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <StatusBadge status={r.status} />
                    {r.download_url && (
                      <a href={reportsApi.download(r.id)} download className="p-1.5 rounded-lg hover:bg-eco-500/10 text-eco-muted hover:text-eco-400 transition-colors">
                        <Download size={14} />
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
