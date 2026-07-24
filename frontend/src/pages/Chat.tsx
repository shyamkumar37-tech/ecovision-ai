// src/pages/Chat.tsx
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2, Zap, Recycle, Wind, Droplets, Bot, User } from 'lucide-react'
import { chatApi } from '@/lib/api'
import { useChatStore } from '@/stores'
import { useAuthStore } from '@/stores'
import { SDGBadge, PageHeader, EmptyState } from '@/components/ui'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  { icon: Zap,     label: 'Energy Tips',    q: 'How can our campus reduce electricity consumption by 20% this semester?' },
  { icon: Recycle, label: 'Waste Strategy', q: 'What are the best waste recycling strategies for a university with 8000 students?' },
  { icon: Wind,    label: 'Carbon Plan',    q: 'Create a 3-step carbon reduction roadmap for our institution aligned with SDG 13.' },
  { icon: Droplets,label: 'Water Savings',  q: 'What water conservation techniques work best for university campuses?' },
]

function detectSDGTags(text: string): string[] {
  const tags: string[] = []
  if (/SDG.?7|energy|electricity|solar|renewable/i.test(text))   tags.push('SDG 7')
  if (/SDG.?11|campus|urban|building|transport/i.test(text))     tags.push('SDG 11')
  if (/SDG.?12|waste|recycl|consumption|packaging/i.test(text))  tags.push('SDG 12')
  if (/SDG.?13|carbon|climate|emission|CO2|footprint/i.test(text)) tags.push('SDG 13')
  return tags
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-eco-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
    </div>
  )
}

function ChatBubble({ msg }: { msg: any }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm',
        isUser ? 'bg-eco-600/20 text-eco-400' : 'bg-teal-500/15 text-teal-400'
      )}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[72%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-eco-600/15 border border-eco-500/20 text-eco-text rounded-tr-md'
            : 'bg-eco-elevated border border-eco-border/60 text-eco-text rounded-tl-md'
        )}>
          {msg.isStreaming && !msg.message ? (
            <TypingDots />
          ) : (
            <div className="whitespace-pre-wrap">
              {msg.message}
              {msg.isStreaming && <span className="cursor-blink ml-0.5 inline-block w-2 h-4 bg-eco-400" />}
            </div>
          )}
        </div>

        {/* SDG tags */}
        {!msg.isStreaming && msg.sdg_tags?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-1.5"
          >
            {msg.sdg_tags.map((t: string) => <SDGBadge key={t} tag={t} showLabel />)}
          </motion.div>
        )}

        {/* Sources */}
        {!msg.isStreaming && msg.sources_used?.length > 0 && (
          <div className="text-[10px] text-eco-muted flex items-center gap-1">
            <span>📎</span>
            <span>{msg.sources_used.length} source{msg.sources_used.length > 1 ? 's' : ''} cited</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Chat() {
  const [input, setInput] = useState('')
  const { messages, sessionId, isStreaming, addMessage, updateMessage, setStreaming, clearSession } = useChatStore()
  const { user } = useAuthStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (q?: string) => {
    const msg = q ?? input.trim()
    if (!msg || isStreaming) return

    setInput('')
    textareaRef.current!.style.height = 'auto'

    // Add user message
    addMessage({ role: 'user', message: msg, sources_used: [], sdg_tags: [], isStreaming: false })

    // Add placeholder for bot
    const botId = addMessage({ role: 'assistant', message: '', sources_used: [], sdg_tags: [], isStreaming: true })
    setStreaming(true)

    let full = ''
    let sources: any[] = []
    let sdgTags: string[] = []

    try {
      await chatApi.stream(msg, sessionId, (chunk) => {
        if (chunk.includes('__SOURCES__:')) {
          try { sources = JSON.parse(chunk.split('__SOURCES__:')[1]) } catch {}
        } else if (chunk.includes('__SDGS__:')) {
          try { sdgTags = JSON.parse(chunk.split('__SDGS__:')[1]) } catch {}
        } else {
          full += chunk
          updateMessage(botId, { message: full, isStreaming: true })
        }
      })

      if (!sdgTags.length) sdgTags = detectSDGTags(full)
      updateMessage(botId, { message: full, sources_used: sources, sdg_tags: sdgTags, isStreaming: false })
    } catch {
      // Fallback: simulate a response when backend unavailable
      const fallback = `Thank you for your question about "${msg}". 

As your EcoVision AI assistant, here are key sustainability insights for your campus:

• **Energy (SDG 7)**: Implement smart building management systems with occupancy sensors to reduce baseline consumption by 25–30%.
• **Transport (SDG 11)**: Launch a green commute initiative — subsidised public transport passes and EV charging stations reduce scope 3 emissions.
• **Waste (SDG 12)**: Source-segregated recycling with QR-code bins increases recyclable capture rates from 30% to 75%.
• **Carbon (SDG 13)**: Set a Science-Based Target aligned with 1.5°C — commit to 50% absolute emission reduction by 2030.

Connect your IBM Granite backend to get RAG-powered answers from your uploaded sustainability documents.`

      let i = 0
      const words = fallback.split(' ')
      const interval = setInterval(() => {
        if (i >= words.length) {
          clearInterval(interval)
          const tags = detectSDGTags(fallback)
          updateMessage(botId, { message: fallback, sources_used: [], sdg_tags: tags, isStreaming: false })
          setStreaming(false)
          return
        }
        full = words.slice(0, i + 1).join(' ')
        updateMessage(botId, { message: full, isStreaming: true })
        i++
      }, 30)
      return
    }
    setStreaming(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex flex-col h-screen p-6 max-w-4xl mx-auto">
      <PageHeader
        title="AI Sustainability Assistant"
        subtitle="IBM Granite · RAG-enhanced · SDG-aligned"
        action={
          messages.length > 0 && (
            <button onClick={clearSession} className="btn-ghost text-eco-muted hover:text-red-400">
              <Trash2 size={14} />
              <span className="text-xs">Clear</span>
            </button>
          )
        }
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-6"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-eco-500 to-teal-500 flex items-center justify-center animate-float shadow-glow">
                <Bot size={28} className="text-black" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-eco-400 rounded-full animate-pulse-ring" />
            </div>
            <div className="text-center">
              <h3 className="font-display text-xl font-bold text-eco-text mb-1">EcoVision AI Ready</h3>
              <p className="text-sm text-eco-muted max-w-sm">Ask anything about campus sustainability — powered by IBM Granite with RAG from your uploaded documents.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {QUICK_PROMPTS.map(({ icon: Icon, label, q }) => (
                <button
                  key={label}
                  onClick={() => handleSend(q)}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-eco-card border border-eco-border/50 text-left group hover:border-eco-500/30 hover:bg-eco-elevated transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-eco-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-eco-500/20 transition-colors">
                    <Icon size={13} className="text-eco-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-eco-text">{label}</div>
                    <div className="text-[10px] text-eco-muted mt-0.5 line-clamp-2">{q.slice(0, 60)}…</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.map((m: any) => <ChatBubble key={m.id} msg={m} />)}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-3"
      >
        <div className="flex gap-3 items-end p-3 rounded-2xl bg-eco-card border border-eco-border/60 focus-within:border-eco-500/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Ask about energy savings, waste reduction, SDG alignment…"
            className="flex-1 bg-transparent text-sm text-eco-text placeholder-eco-muted resize-none outline-none leading-relaxed py-1 min-h-[28px] font-body"
            style={{ maxHeight: '120px' }}
            disabled={isStreaming}
          />
          <button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className="btn-primary flex-shrink-0 h-9 w-9 !p-0 justify-center rounded-xl"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-eco-muted mt-2 text-center">
          Responses cite uploaded documents • SDG tags auto-detected • Press Enter to send
        </p>
      </motion.div>
    </div>
  )
}
