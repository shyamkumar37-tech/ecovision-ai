// src/types/index.ts
// Complete TypeScript type definitions matching Pydantic schemas

export type UserRole = 'student' | 'faculty' | 'sustainability_officer' | 'admin'
export type DocumentStatus = 'processing' | 'ready' | 'failed'
export type ChatRole = 'user' | 'assistant'
export type InstitutionType = 'university' | 'college' | 'institute'
export type SDGTag = 'SDG 7' | 'SDG 11' | 'SDG 12' | 'SDG 13'

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  institution_id: string
  created_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  full_name: string
  role: UserRole
  institution_id: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface KPISummary {
  energy_kwh: number
  water_liters: number
  waste_kg: number
  carbon_kg: number
  sustainability_score: number
  trend: 'improved' | 'declined' | 'stable'
  score_delta: number
}

export interface SDGScore {
  sdg_7_energy: number
  sdg_11_urban: number
  sdg_12_consumption: number
  sdg_13_climate: number
}

export interface MonthlyDataPoint {
  month: string
  energy_kwh: number
  water_liters: number
  waste_kg: number
  carbon_kg: number
  sustainability_score: number
}

export interface TrendsResponse {
  data_points: MonthlyDataPoint[]
  sdg_scores: SDGScore
}

// ── Carbon ────────────────────────────────────────────────────────────────────
export interface CarbonCalculatePayload {
  electricity_kwh: number
  water_liters: number
  transport_km: number
  paper_kg: number
}

export interface CarbonBreakdown {
  electricity_co2: number
  water_co2: number
  transport_co2: number
  paper_co2: number
}

export interface CarbonCalculateResponse {
  total_carbon_kg: number
  breakdown: CarbonBreakdown
  recommendations: string[]
  sdg_tags: string[]
  annual_projection_kg: number
  potential_savings_kg: number
}

export interface CarbonReport {
  id: string
  electricity_kwh: number
  water_liters: number
  transport_km: number
  paper_kg: number
  total_carbon_kg: number
  recommendations: string[]
  created_at: string
}

// ── Waste ─────────────────────────────────────────────────────────────────────
export interface WasteAnalyzePayload {
  plastic_kg: number
  paper_kg: number
  food_kg: number
  ewaste_kg: number
}

export interface WasteCategory {
  category: string
  weight_kg: number
  percentage: number
  disposal_method: string
  recycling_potential: 'high' | 'medium' | 'low'
}

export interface WasteAnalyzeResponse {
  total_waste_kg: number
  categories: WasteCategory[]
  ai_recommendations: string[]
  sustainability_impact_score: number
  sdg_tags: string[]
}

// ── Documents ─────────────────────────────────────────────────────────────────
export interface Document {
  id: string
  filename: string
  mime_type: string
  file_size: number
  status: DocumentStatus
  chunk_count: number | null
  created_at: string
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export interface ChatSource {
  filename: string
  page?: number
  chunk_text: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  message: string
  sources_used: ChatSource[]
  sdg_tags: string[]
  created_at: string
  isStreaming?: boolean
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface ReportGeneratePayload {
  title: string
  start_month: number
  start_year: number
  end_month: number
  end_year: number
  include_ai_insights: boolean
  include_sdg_alignment: boolean
}

export interface Report {
  id: string
  status: 'queued' | 'generating' | 'ready' | 'failed'
  title: string
  download_url?: string
  created_at: string
}
