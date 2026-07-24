// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(n: number, decimals = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(decimals)}K`
  return n.toFixed(decimals)
}

export function fmtCO2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} tCO₂e`
  return `${kg.toFixed(1)} kg CO₂e`
}

export function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export const SDG_META: Record<string, { color: string; bg: string; label: string }> = {
  'SDG 7':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Clean Energy' },
  'SDG 11': { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  label: 'Sustainable Cities' },
  'SDG 12': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Responsible Consumption' },
  'SDG 13': { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',  label: 'Climate Action' },
}
