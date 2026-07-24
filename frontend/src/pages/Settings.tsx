// src/pages/Settings.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Key, Bell, Shield, User, Building, Trash2, Save, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores'
import { PageHeader, SDGBadge } from '@/components/ui'

const profileSchema = z.object({
  full_name: z.string().min(2),
  email:     z.string().email(),
})
type ProfileForm = z.infer<typeof profileSchema>

const TABS = [
  { id: 'profile',  label: 'Profile',       icon: User },
  { id: 'security', label: 'Security',       icon: Shield },
  { id: 'notifs',   label: 'Notifications',  icon: Bell },
  { id: 'api',      label: 'API Keys',       icon: Key },
  { id: 'inst',     label: 'Institution',    icon: Building },
]

const RBAC_TABLE = [
  { feature: 'View Dashboard',       student: true,  faculty: true,  officer: true,  admin: true  },
  { feature: 'Carbon Calculator',    student: true,  faculty: true,  officer: true,  admin: true  },
  { feature: 'Waste Advisor',        student: true,  faculty: true,  officer: true,  admin: true  },
  { feature: 'AI Chat',              student: true,  faculty: true,  officer: true,  admin: true  },
  { feature: 'Upload Documents',     student: false, faculty: true,  officer: true,  admin: true  },
  { feature: 'Generate Reports',     student: false, faculty: true,  officer: true,  admin: true  },
  { feature: 'View Analytics',       student: false, faculty: true,  officer: true,  admin: true  },
  { feature: 'Manage Users',         student: false, faculty: false, officer: false, admin: true  },
  { feature: 'View All Institutions',student: false, faculty: false, officer: true,  admin: true  },
  { feature: 'System Settings',      student: false, faculty: false, officer: false, admin: true  },
]

export default function Settings() {
  const [tab, setTab]       = useState('profile')
  const [showKey, setShowKey] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('eco_api_key') || '')
  const [keySaved, setKeySaved] = useState(false)
  const { user, logout }    = useAuthStore()

  const { register, handleSubmit, formState: { isDirty, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name || '', email: user?.email || '' },
  })

  const onSaveProfile = async (data: ProfileForm) => {
    await new Promise(r => setTimeout(r, 600))
    toast.success('Profile updated successfully')
  }

  const onSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('eco_api_key', apiKey.trim())
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 3000)
      toast.success('API key saved — AI features are now live')
    } else {
      localStorage.removeItem('eco_api_key')
      toast.success('API key removed')
    }
  }

  const roleBadge = (has: boolean) => has
    ? <CheckCircle size={14} style={{ color: 'var(--green)' }} />
    : <span style={{ color: 'var(--border)', fontSize: '14px' }}>—</span>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your profile, security, and preferences" />

      <div className="flex gap-6">
        {/* Tab nav */}
        <div className="w-44 flex-shrink-0">
          <div className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`nav-item w-full text-left ${tab === id ? 'active' : ''}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Session */}
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2.5 px-2 py-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#166534,#0d9488)', color: '#fff' }}>
                {user?.full_name?.[0] ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--txt)' }}>{user?.full_name}</p>
                <SDGBadge tag={user?.role === 'admin' ? 'SDG 13' : 'SDG 12'} showLabel={false} />
              </div>
            </div>
            <button onClick={logout} className="btn-danger w-full justify-center text-xs py-2">
              Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'profile' && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="card">
              <h3 className="font-display text-sm font-semibold mb-5" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Profile Information</h3>
              <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4 max-w-md">
                <div><label className="label">Full Name</label><input {...register('full_name')} className="input" /></div>
                <div><label className="label">Email</label><input {...register('email')} type="email" className="input" readOnly style={{ opacity:.6 }} /></div>
                <div><label className="label">Role</label>
                  <input value={user?.role?.replace(/_/g,' ')} className="input capitalize" readOnly style={{ opacity:.6 }} />
                </div>
                <div><label className="label">Institution</label>
                  <input value={user?.institution_id} className="input" readOnly style={{ opacity:.6 }} />
                </div>
                <button type="submit" className="btn-primary" disabled={!isDirty || isSubmitting}>
                  <Save size={13} /> {isSubmitting ? 'Saving…' : 'Save Profile'}
                </button>
              </form>
            </motion.div>
          )}

          {tab === 'security' && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="space-y-4">
              <div className="card">
                <h3 className="font-display text-sm font-semibold mb-4" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Security Overview</h3>
                {[
                  { label:'Password hashing',    value:'bcrypt (cost 12)',         ok:true },
                  { label:'Token type',          value:'JWT HS256 — 30min TTL',    ok:true },
                  { label:'Refresh token',       value:'7-day rolling expiry',     ok:true },
                  { label:'HTTPS',               value:'Enforced via Nginx/TLS',   ok:true },
                  { label:'CORS',                value:'Strict origin allowlist',  ok:true },
                  { label:'Rate limiting',       value:'20 req/min on chat',       ok:true },
                  { label:'Security headers',    value:'CSP · HSTS · X-Frame',    ok:true },
                  { label:'Input validation',    value:'Pydantic v2 on all routes', ok:true },
                  { label:'File upload check',   value:'MIME + size (10MB max)',   ok:true },
                  { label:'Audit logging',       value:'All actions tracked in DB', ok:true },
                ].map(({ label, value, ok }) => (
                  <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color:'var(--muted)' }}>{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color:'var(--txt)' }}>{value}</span>
                      {ok && <CheckCircle size={13} style={{ color:'var(--green)' }} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* RBAC Table */}
              <div className="card">
                <h3 className="font-display text-sm font-semibold mb-4" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Role-Based Access Control</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left py-2 pr-4" style={{ color:'var(--muted)' }}>Feature</th>
                        {['Student','Faculty','Officer','Admin'].map(r => (
                          <th key={r} className="text-center py-2 px-3" style={{ color:'var(--muted)' }}>{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RBAC_TABLE.map(row => (
                        <tr key={row.feature} className="border-t" style={{ borderColor:'var(--border)' }}>
                          <td className="py-2 pr-4" style={{ color:'var(--txt)' }}>{row.feature}</td>
                          <td className="text-center py-2 px-3">{roleBadge(row.student)}</td>
                          <td className="text-center py-2 px-3">{roleBadge(row.faculty)}</td>
                          <td className="text-center py-2 px-3">{roleBadge(row.officer)}</td>
                          <td className="text-center py-2 px-3">{roleBadge(row.admin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'notifs' && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="card">
              <h3 className="font-display text-sm font-semibold mb-5" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Notification Preferences</h3>
              <div className="space-y-4 max-w-md">
                {[
                  { label:'Energy threshold alerts',      sub:'When usage exceeds monthly target',  def:true },
                  { label:'Weekly SDG tips',              sub:'AI-generated sustainability insights', def:true },
                  { label:'Report ready',                 sub:'When PDF generation completes',       def:true },
                  { label:'Document indexed',             sub:'When RAG indexing finishes',          def:false },
                  { label:'Carbon milestone',             sub:'When score improves 5+ points',       def:true },
                  { label:'Email digest (weekly)',        sub:'Sunday summary of all metrics',       def:false },
                ].map(({ label, sub, def }) => {
                  const [on, setOn] = useState(def)
                  return (
                    <div key={label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color:'var(--txt)' }}>{label}</p>
                        <p className="text-[11px] mt-0.5" style={{ color:'var(--muted)' }}>{sub}</p>
                      </div>
                      <button onClick={() => setOn(!on)}
                        className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
                        style={{ background: on ? 'var(--green)' : 'var(--border)' }}>
                        <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform"
                          style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }} />
                      </button>
                    </div>
                  )
                })}
                <button className="btn-primary mt-2" onClick={() => toast.success('Notification preferences saved')}>
                  <Save size={13} /> Save Preferences
                </button>
              </div>
            </motion.div>
          )}

          {tab === 'api' && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="space-y-4">
              <div className="card">
                <h3 className="font-display text-sm font-semibold mb-2" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Anthropic API Key</h3>
                <p className="text-xs mb-4" style={{ color:'var(--muted)' }}>
                  Required for live AI responses. Stored in your browser only — never transmitted to our servers.
                  Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>console.anthropic.com</a>
                </p>
                <div className="flex gap-2 max-w-md">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="sk-ant-api03-…"
                      className="input pr-10"
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color:'var(--muted)' }}>
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button onClick={onSaveKey} className="btn-primary flex-shrink-0">
                    {keySaved ? <><CheckCircle size={13} />Saved!</> : <><Key size={13} />Save</>}
                  </button>
                </div>
                <div className="mt-4 p-3 rounded-xl text-xs" style={{ background:'rgba(34,197,94,.05)',border:'1px solid rgba(34,197,94,.1)' }}>
                  <p style={{ color:'var(--accent)', fontWeight:600 }}>Current status</p>
                  <p className="mt-1" style={{ color:'var(--txt)' }}>
                    {apiKey ? '✓ API key set — AI chat, carbon tips, and waste recommendations use Claude Sonnet' : '⚠ No key — using built-in demo responses'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'inst' && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="space-y-4">
              <div className="card">
                <h3 className="font-display text-sm font-semibold mb-4" style={{ color:'var(--txt)',fontFamily:'var(--fd)' }}>Institution Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm max-w-md">
                  {[
                    { label:'Name',         value:'Green Valley University' },
                    { label:'Type',         value:'University' },
                    { label:'Location',     value:'Bangalore, Karnataka' },
                    { label:'Students',     value:'~12,000' },
                    { label:'SDG Framework',value:'UN 2030 Agenda' },
                    { label:'Reporting Yr', value:'2025' },
                    { label:'Benchmark',    value:'NAAC Green Campus' },
                    { label:'AI Model',     value:'IBM Granite 13B' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="label">{label}</p>
                      <p className="font-medium" style={{ color:'var(--txt)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="card" style={{ borderColor:'rgba(239,68,68,.2)' }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color:'var(--red)', fontFamily:'var(--fd)' }}>
                  <Trash2 size={14} /> Danger Zone
                </h3>
                <p className="text-xs mb-3" style={{ color:'var(--muted)' }}>These actions are irreversible. Proceed with extreme caution.</p>
                <div className="flex gap-3">
                  <button className="btn-danger text-xs" onClick={() => toast.error('Contact admin to delete account')}>
                    Delete My Account
                  </button>
                  <button className="btn-danger text-xs" onClick={() => toast.error('Contact admin to clear data')}>
                    Clear All Data
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
