// src/pages/Auth.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores'

// ── Login ──────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})
type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const [showPw, setShowPw] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const { data: tokens } = await authApi.login(data)
      setTokens(tokens.access_token, tokens.refresh_token)
      const { data: me } = await authApi.me()
      setUser(me)
      toast.success(`Welcome back, ${me.full_name.split(' ')[0]}!`)
      navigate('/')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid" style={{ background: 'var(--eco-bg)' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-eco-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-eco-500 to-teal-500 flex items-center justify-center shadow-glow">
            <Leaf size={22} className="text-black" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-xl font-bold gradient-text">EcoVision AI</div>
            <div className="text-[11px] text-eco-muted tracking-widest">SMART CAMPUS PLATFORM</div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-2xl font-bold text-eco-text mb-1">Welcome back</h2>
          <p className="text-sm text-eco-muted mb-6">Sign in to your sustainability dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input {...register('email')} type="email" className="input-field" placeholder="officer@greenvalley.edu" autoComplete="email" />
              {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} className="input-field pr-11" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-eco-muted hover:text-eco-text transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 text-base mt-2" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 size={16} className="animate-spin" />Signing in…</>
                : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-eco-border/40 text-center">
            <p className="text-xs text-eco-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-eco-400 hover:text-eco-300 font-semibold transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-3 rounded-xl bg-eco-green/5 border border-eco-green/15 text-center">
          <p className="text-[11px] text-eco-muted">Demo: <span className="text-eco-400 font-mono">demo@campus.edu</span> / <span className="text-eco-400 font-mono">Demo@1234</span></p>
        </div>
      </motion.div>
    </div>
  )
}


// ── Register ────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  full_name:      z.string().min(2, 'Name must be at least 2 characters'),
  email:          z.string().email(),
  password:       z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/\d/, 'Must contain number'),
  role:           z.enum(['student', 'faculty', 'sustainability_officer', 'admin']),
  institution_id: z.string().min(1, 'Select an institution'),
})
type RegisterForm = z.infer<typeof registerSchema>

export function Register() {
  const [showPw, setShowPw] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' },
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authApi.register(data)
      const { data: tokens } = await authApi.login({ email: data.email, password: data.password })
      setTokens(tokens.access_token, tokens.refresh_token)
      const { data: me } = await authApi.me()
      setUser(me)
      toast.success('Account created! Welcome to EcoVision AI.')
      navigate('/')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--eco-bg)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-eco-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-eco-500 to-teal-500 flex items-center justify-center shadow-glow">
            <Leaf size={22} className="text-black" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-xl font-bold gradient-text">EcoVision AI</div>
            <div className="text-[11px] text-eco-muted tracking-widest">CREATE ACCOUNT</div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-2xl font-bold text-eco-text mb-1">Join the platform</h2>
          <p className="text-sm text-eco-muted mb-6">Start tracking your campus sustainability journey</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input {...register('full_name')} className="input-field" placeholder="Dr. Priya Sharma" />
              {errors.full_name && <p className="text-[11px] text-red-400 mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="you@institution.edu" />
              {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} className="input-field pr-11" placeholder="Min 8 chars, 1 uppercase, 1 number" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-eco-muted hover:text-eco-text">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-400 mt-1">{errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select {...register('role')} className="input-field">
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="sustainability_officer">Sustainability Officer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Institution ID</label>
                <input {...register('institution_id')} className="input-field" placeholder="inst-uuid" />
                {errors.institution_id && <p className="text-[11px] text-red-400 mt-1">{errors.institution_id.message}</p>}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Creating account…</> : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-eco-border/40 text-center">
            <p className="text-xs text-eco-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-eco-400 hover:text-eco-300 font-semibold transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
