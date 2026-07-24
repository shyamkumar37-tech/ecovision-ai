// src/components/layout/Topbar.tsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, Sun, Moon, ChevronDown, Settings, LogOut, User, X, Command } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useThemeStore } from '@/stores'
import { cn } from '@/lib/utils'

const MOCK_NOTIFS = [
  { id: '1', type: 'alert',   title: 'Energy threshold exceeded',    body: 'July kWh is 18% above target.',     time: '2m ago',   read: false },
  { id: '2', type: 'ready',   title: 'Report ready to download',     body: 'Q2 2025 Sustainability PDF done.',   time: '14m ago',  read: false },
  { id: '3', type: 'indexed', title: 'Document indexed',             body: 'Energy_Audit.pdf — 67 chunks ready.', time: '1h ago', read: true },
  { id: '4', type: 'tip',     title: 'Weekly SDG Tip 🌱',            body: 'Composting food waste can cut emissions by 2.1 tCO₂/year.', time: '1d ago', read: true },
]

const QUICK_ACTIONS = [
  { label: 'Go to Dashboard',         path: '/',          icon: '🏠' },
  { label: 'Open AI Assistant',        path: '/chat',      icon: '🤖' },
  { label: 'Calculate Carbon',         path: '/carbon',    icon: '🌍' },
  { label: 'Analyze Waste',            path: '/waste',     icon: '♻️' },
  { label: 'Upload Document',          path: '/documents', icon: '📄' },
  { label: 'Generate Report',          path: '/reports',   icon: '📊' },
]

export const Topbar = () => {
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser,   setShowUser]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery]           = useState('')
  const [notifs, setNotifs]         = useState(MOCK_NOTIFS)
  const searchRef = useRef<HTMLInputElement>(null)

  const { user, logout }    = useAuthStore()
  const { isDark, toggle }  = useThemeStore()
  const navigate            = useNavigate()

  const unread = notifs.filter(n => !n.read).length

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setShowSearch(s => !s)
      }
      if (e.key === 'Escape') { setShowSearch(false); setShowNotifs(false); setShowUser(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showSearch])

  const filtered = QUICK_ACTIONS.filter(a =>
    query === '' || a.label.toLowerCase().includes(query.toLowerCase())
  )

  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })))

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <header
        className="h-14 flex items-center justify-between px-5 border-b sticky top-0 z-50"
        style={{ background: 'rgba(6,12,6,.92)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}
      >
        {/* Search trigger */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-eco-muted transition-all hover:bg-eco-elev hover:text-eco-txt"
          style={{ background: 'var(--elev)', border: '1px solid var(--border)' }}
        >
          <Search size={13} />
          <span>Quick search…</span>
          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--border)', color: 'var(--muted)' }}>⌘K</span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button onClick={toggle} className="btn-secondary !px-2.5 !py-2" aria-label="Toggle theme">
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(s => !s); setShowUser(false) }}
              className="btn-secondary !px-2.5 !py-2 relative"
              aria-label="Notifications"
            >
              <Bell size={14} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--red)', color: '#fff', border: '1.5px solid var(--bg)' }}>
                  {unread}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: .96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: .96 }}
                  transition={{ duration: .18 }}
                  className="card absolute right-0 top-12 w-80 shadow-2xl z-50"
                  style={{ maxHeight: '420px', overflowY: 'auto' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--txt)', fontFamily: 'var(--fd)' }}>Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>Mark all read</button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {notifs.map(n => (
                      <div key={n.id} className={cn(
                        'flex gap-3 p-3 rounded-xl cursor-pointer transition-colors',
                        n.read ? 'opacity-60' : ''
                      )} style={{ background: n.read ? 'transparent' : 'rgba(34,197,94,.04)', border: `1px solid ${n.read ? 'transparent' : 'rgba(34,197,94,.1)'}` }}>
                        <span className="text-base flex-shrink-0">
                          {n.type === 'alert' ? '⚠️' : n.type === 'ready' ? '📊' : n.type === 'indexed' ? '📄' : '🌱'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--txt)' }}>{n.title}</p>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                          </div>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{n.body}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--muted)', opacity: .7 }}>{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => { setShowUser(s => !s); setShowNotifs(false) }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
              style={{ background: 'var(--elev)', border: '1px solid var(--border)' }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#166534,#0d9488)', color: '#fff' }}>
                {user?.full_name?.[0] ?? 'U'}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: 'var(--txt)' }}>
                {user?.full_name?.split(' ')[0] ?? 'User'}
              </span>
              <ChevronDown size={12} style={{ color: 'var(--muted)' }} />
            </button>

            <AnimatePresence>
              {showUser && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: .96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: .96 }}
                  className="card absolute right-0 top-12 w-52 shadow-2xl z-50"
                >
                  <div className="pb-2 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--txt)' }}>{user?.full_name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{user?.email}</p>
                    <span className="badge badge-sdg12 mt-1.5 capitalize">{user?.role?.replace('_', ' ')}</span>
                  </div>
                  <div className="space-y-0.5">
                    <button onClick={() => { navigate('/settings'); setShowUser(false) }}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs transition-colors hover:bg-eco-elev"
                      style={{ color: 'var(--muted)' }}>
                      <Settings size={13} /> Settings
                    </button>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs transition-colors"
                      style={{ color: 'var(--red)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-start justify-center pt-28 px-4"
            style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ scale: .94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .94, opacity: 0 }}
              transition={{ duration: .15 }}
              className="card w-full max-w-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search pages or actions…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--txt)', fontFamily: 'var(--fb)' }}
                />
                <button onClick={() => setShowSearch(false)}>
                  <X size={14} style={{ color: 'var(--muted)' }} />
                </button>
              </div>
              <div className="space-y-1">
                {filtered.map(a => (
                  <button key={a.path}
                    onClick={() => { navigate(a.path); setShowSearch(false); setQuery('') }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                    style={{ color: 'var(--txt-2)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--elev)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-2)' }}
                  >
                    <span className="text-base">{a.icon}</span>
                    <span>{a.label}</span>
                    <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--muted)' }}>↵</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
