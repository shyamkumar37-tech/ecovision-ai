// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, MessageSquareText, Flame, Recycle,
  FileUp, BarChart3, LogOut, Settings, Leaf
} from 'lucide-react'
import { useAuthStore } from '@/stores'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/',          icon: LayoutDashboard,   label: 'Dashboard',    section: 'core' },
  { to: '/chat',      icon: MessageSquareText, label: 'AI Assistant', section: 'core' },
  { to: '/carbon',    icon: Flame,             label: 'Carbon Calc',  section: 'tools' },
  { to: '/waste',     icon: Recycle,           label: 'Waste Advisor',section: 'tools' },
  { to: '/documents', icon: FileUp,            label: 'Documents',    section: 'intelligence' },
  { to: '/reports',   icon: BarChart3,         label: 'Reports',      section: 'intelligence' },
]

const SECTIONS = ['core', 'tools', 'intelligence'] as const

export const Sidebar = ({ score }: { score?: number }) => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.aside
      initial={{ x: -240 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[220px] min-w-[220px] flex flex-col bg-surface border-r border-eco-border/50 h-screen sticky top-0"
      style={{ background: 'var(--eco-surface)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 border-b border-eco-border/30">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-eco-500 to-teal-500 flex items-center justify-center shadow-glow-sm flex-shrink-0">
          <Leaf size={16} className="text-black" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-display text-sm font-bold text-eco-accent leading-tight">EcoVision AI</div>
          <div className="text-[10px] text-eco-muted tracking-wider">SMART CAMPUS</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {SECTIONS.map(section => {
          const items = NAV.filter(n => n.section === section)
          return (
            <div key={section} className="mb-3">
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-eco-muted/60 px-2 py-1.5">
                {section}
              </p>
              {items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn('nav-link', isActive && 'active')
                  }
                >
                  <Icon size={15} strokeWidth={1.8} />
                  <span className="text-[13px]">{label}</span>
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Score widget */}
      {score !== undefined && (
        <div className="mx-3 mb-3 p-4 rounded-xl border border-eco-border/40 bg-eco-green/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-eco-muted">Score</span>
            <span className="text-[10px] text-eco-400">↑ Improving</span>
          </div>
          <div className="font-display text-3xl font-bold gradient-text leading-none mb-2">{score}</div>
          <div className="h-1.5 bg-eco-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-eco-500 to-teal-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-eco-muted">0</span>
            <span className="text-[9px] text-eco-muted">100</span>
          </div>
        </div>
      )}

      {/* User */}
      <div className="border-t border-eco-border/30 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-eco-600 to-teal-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.full_name?.[0] ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-eco-text truncate">{user?.full_name ?? 'User'}</div>
            <div className="text-[10px] text-eco-muted capitalize truncate">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="nav-link w-full mt-1 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut size={14} />
          <span className="text-[12px]">Sign out</span>
        </button>
      </div>
    </motion.aside>
  )
}
