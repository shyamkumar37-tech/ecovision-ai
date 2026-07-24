// src/App.tsx — Production router with all pages, auth guard, full layout
import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores'

// ── Lazy pages ─────────────────────────────────────────────────────
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Chat      = lazy(() => import('@/pages/Chat'))
const Carbon    = lazy(() => import('@/pages/Carbon'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const Login     = lazy(() => import('@/pages/Auth').then(m => ({ default: m.Login })))
const Register  = lazy(() => import('@/pages/Auth').then(m => ({ default: m.Register })))
const Waste     = lazy(() => import('@/pages/WasteDocsReports').then(m => ({ default: m.default })))
const Docs      = lazy(() => import('@/pages/WasteDocsReports').then(m => ({ default: m.Documents })))
const Reports   = lazy(() => import('@/pages/WasteDocsReports').then(m => ({ default: m.Reports })))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

const PageSkeleton = () => (
  <div className="p-6 space-y-5 max-w-7xl mx-auto">
    <div className="h-7 w-56 shimmer rounded-xl" />
    <div className="h-4 w-40 shimmer rounded-lg" />
    <div className="grid grid-cols-4 gap-4 mt-4">
      {Array(4).fill(0).map((_, i) => <div key={i} className="h-32 shimmer rounded-2xl" style={{ animationDelay:`${i*.1}s` }} />)}
    </div>
    <div className="grid grid-cols-2 gap-4">
      {Array(2).fill(0).map((_, i) => <div key={i} className="h-52 shimmer rounded-2xl" />)}
    </div>
  </div>
)

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }} transition={{ duration:.2,ease:'easeInOut' }}>
    {children}
  </motion.div>
)

function RequireAuth() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

// Lazy-load layout components to avoid circular deps
const SidebarLazy = lazy(() => import('@/components/layout/Sidebar').then(m => ({ default: m.Sidebar })))
const TopbarLazy  = lazy(() => import('@/components/layout/Topbar').then(m => ({ default: m.Topbar })))

function AppShell() {
  const location = useLocation()
  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'var(--bg)' }}>
      <Suspense fallback={<div style={{ width:210, background:'var(--surf)' }} />}>
        <SidebarLazy score={74} />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<div style={{ height:56, background:'var(--surf)', borderBottom:'1px solid var(--border)' }} />}>
          <TopbarLazy />
        </Suspense>
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function ThemeInit() {
  useEffect(() => { document.documentElement.classList.add('dark') }, [])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInit />
        <Routes>
          <Route path="/login"    element={<Suspense fallback={null}><Login /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={null}><Register /></Suspense>} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/chat"      element={<Chat />} />
              <Route path="/carbon"    element={<Carbon />} />
              <Route path="/waste"     element={<Waste />} />
              <Route path="/documents" element={<Docs />} />
              <Route path="/reports"   element={<Reports />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings"  element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { background:'var(--elev)', color:'var(--txt)', border:'1px solid var(--border)', borderRadius:'12px', fontSize:'13px', fontFamily:'var(--fb)', boxShadow:'0 8px 32px rgba(0,0,0,.5)' },
        success: { iconTheme: { primary:'#22c55e', secondary:'var(--bg)' } },
        error:   { iconTheme: { primary:'#ef4444', secondary:'var(--bg)' } },
      }} />

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
