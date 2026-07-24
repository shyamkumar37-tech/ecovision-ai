// src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  setTokens: (access: string, refresh: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'ecovision-auth', partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
)

// src/stores/themeStore.ts
import { create as createZ } from 'zustand'
import { persist as persistZ } from 'zustand/middleware'

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

export const useThemeStore = createZ<ThemeState>()(
  persistZ(
    (set, get) => ({
      isDark: true,
      toggle: () => {
        const next = !get().isDark
        set({ isDark: next })
        document.documentElement.classList.toggle('dark', next)
      },
    }),
    { name: 'ecovision-theme' }
  )
)

// src/stores/chatStore.ts
import { create as createChat } from 'zustand'
import type { ChatMessage } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface ChatState {
  messages: ChatMessage[]
  sessionId: string
  isStreaming: boolean
  addMessage: (msg: Omit<ChatMessage, 'id' | 'created_at'>) => string
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void
  setStreaming: (v: boolean) => void
  clearSession: () => void
}

export const useChatStore = createChat<ChatState>()((set) => ({
  messages: [],
  sessionId: uuidv4(),
  isStreaming: false,
  addMessage: (msg) => {
    const id = uuidv4()
    const full: ChatMessage = { ...msg, id, created_at: new Date().toISOString() }
    set((s) => ({ messages: [...s.messages, full] }))
    return id
  },
  updateMessage: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearSession: () => set({ messages: [], sessionId: uuidv4() }),
}))
