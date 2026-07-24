// src/hooks/index.ts
// All TanStack Query hooks for data fetching

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { carbonApi, dashboardApi, documentsApi, reportsApi, wasteApi } from '@/lib/api'
import type {
  CarbonCalculatePayload, ReportGeneratePayload, WasteAnalyzePayload,
} from '@/types'

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const useDashboardMetrics = () =>
  useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => dashboardApi.metrics().then(r => r.data),
    staleTime: 60_000,
    retry: 2,
  })

export const useDashboardTrends = () =>
  useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => dashboardApi.trends().then(r => r.data),
    staleTime: 60_000,
  })

// ── Carbon ────────────────────────────────────────────────────────────────────
export const useCarbonCalculate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: CarbonCalculatePayload) => carbonApi.calculate(d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carbon', 'history'] })
      toast.success('Carbon footprint calculated!')
    },
    onError: () => toast.error('Calculation failed. Please try again.'),
  })
}

export const useCarbonHistory = () =>
  useQuery({
    queryKey: ['carbon', 'history'],
    queryFn: () => carbonApi.history().then(r => r.data),
    staleTime: 30_000,
  })

// ── Waste ─────────────────────────────────────────────────────────────────────
export const useWasteAnalyze = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: WasteAnalyzePayload) => wasteApi.analyze(d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste', 'history'] })
      toast.success('Waste analysis complete!')
    },
    onError: () => toast.error('Analysis failed. Please try again.'),
  })
}

export const useWasteHistory = () =>
  useQuery({
    queryKey: ['waste', 'history'],
    queryFn: () => wasteApi.history().then(r => r.data),
    staleTime: 30_000,
  })

// ── Documents ─────────────────────────────────────────────────────────────────
export const useDocuments = () =>
  useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then(r => r.data),
    refetchInterval: (query) => {
      const docs = query.state.data as any[] | undefined
      const hasProcessing = docs?.some(d => d.status === 'processing')
      return hasProcessing ? 3000 : false
    },
  })

export const useUploadDocument = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => documentsApi.upload(file).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded — indexing in progress...')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Upload failed'),
  })
}

export const useDeleteDocument = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document removed')
    },
  })
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const useGenerateReport = () =>
  useMutation({
    mutationFn: (d: ReportGeneratePayload) => reportsApi.generate(d).then(r => r.data),
    onSuccess: () => toast.success('Report queued — generating in background...'),
    onError: () => toast.error('Failed to queue report'),
  })

export const useReportStatus = (id: string | null) =>
  useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.status(id!).then(r => r.data),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data as any
      return d?.status === 'ready' || d?.status === 'failed' ? false : 2000
    },
  })
