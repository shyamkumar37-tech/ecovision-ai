// src/lib/api.ts
// Axios instance with JWT Bearer injection and silent refresh on 401

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'

const rawBase = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').trim().replace(/\/+$/, '')
const BASE_URL = rawBase.endsWith('/api/v1') 
  ? rawBase 
  : rawBase.endsWith('/api') 
    ? `${rawBase}/v1` 
    : `${rawBase}/api/v1`

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ── Request interceptor: attach Bearer token ──────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: silent token refresh on 401 ────────────────────────
let isRefreshing = false
let failedQueue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      if (!refreshToken) {
        logout()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        setTokens(data.access_token, data.refresh_token)
        processQueue(null, data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        logout()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// ── Typed API helpers ─────────────────────────────────────────────────────────
export const authApi = {
  login:    (d: { email: string; password: string }) => api.post('/auth/login', d),
  register: (d: unknown) => api.post('/auth/register', d),
  refresh:  (token: string) => api.post('/auth/refresh', { refresh_token: token }),
  me:       () => api.get('/auth/me'),
}

export const dashboardApi = {
  metrics: () => api.get('/dashboard/metrics'),
  trends:  () => api.get('/dashboard/trends'),
}

export const carbonApi = {
  calculate: (d: unknown) => api.post('/carbon/calculate', d),
  history:   () => api.get('/carbon/history'),
}

export const wasteApi = {
  analyze: (d: unknown) => api.post('/waste/analyze', d),
  history: () => api.get('/waste/history'),
}

export const documentsApi = {
  list:   () => api.get('/documents'),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  remove: (id: string) => api.delete(`/documents/${id}`),
}

export const chatApi = {
  history: (sessionId: string) => api.get(`/chat/history?session_id=${sessionId}`),
  stream:  async (message: string, sessionId: string, onToken: (t: string) => void) => {
    const token = useAuthStore.getState().accessToken
    const res = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      full += chunk
      onToken(chunk)
    }
    return full
  },
}

export const reportsApi = {
  generate: (d: unknown) => api.post('/reports/generate', d),
  status:   (id: string) => api.get(`/reports/${id}`),
  download: (id: string) => `${BASE_URL}/reports/${id}/download`,
}
