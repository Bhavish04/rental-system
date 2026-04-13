// src/components/chat/ChatWidget.jsx
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react'
import { aiAPI } from '@/lib/api'
import { Link } from 'react-router-dom'

const SESSION_KEY = 'chat_session_id'

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function PropertyMiniCard({ p }) {
  return (
    <Link to={p.deep_link || `/property/${p.id}`}
      className="block bg-bg3 border border-border rounded-xl p-3 mt-2 hover:border-border2 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-text1 text-xs font-semibold truncate">{p.title}</p>
          <p className="text-text3 text-xs">{p.neighbourhood}, {p.city}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-accent text-xs font-bold font-mono">
            ₹{Number(p.price_per_month).toLocaleString('en-IN')}/mo
          </p>
          {p.avg_rating > 0 && <p className="text-text3 text-xs">⭐ {p.avg_rating}</p>}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-text3 text-xs">{p.bedrooms} BHK · {p.property_type}</span>
        {p.fair_price_badge && (
          <span className="text-teal text-xs">✓ Fair Price</span>
        )}
      </div>
    </Link>
  )
}

function ChatBubble({ msg }) {
  const isBot = msg.role === 'bot'
  return (
    <div className={`flex gap-2.5 ${isBot ? '' : 'flex-row-reverse'} animate-fade-in`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
        ${isBot ? 'bg-accent/10 text-accent' : 'bg-blue/10 text-blue'}`}>
        {isBot ? <Bot size={14} /> : <User size={14} />}
      </div>

      <div className={`max-w-[82%] ${isBot ? '' : 'items-end'} flex flex-col gap-1`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap
          ${isBot
            ? 'bg-card border border-border text-text1 rounded-tl-sm'
            : 'bg-accent text-bg font-medium rounded-tr-sm'
          }`}>
          {msg.text}
        </div>

        {/* Property cards from bot */}
        {isBot && msg.properties?.length > 0 && (
          <div className="w-full space-y-1">
            {msg.properties.slice(0, 3).map(p => (
              <PropertyMiniCard key={p.id} p={p} />
            ))}
            {msg.properties.length > 3 && (
              <p className="text-text3 text-xs pl-1">
                +{msg.properties.length - 3} more results
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  '2BHK near Indiranagar under ₹25k',
  'Studio in Koramangala',
  'What are rents in Bandra West?',
  'Villa in Whitefield below ₹60k',
]

export default function ChatWidget() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'bot',
      text: "Hi! I'm RentBot 🏠\n\nTell me what you're looking for — I'll find matching properties instantly!\n\nTry: \"2BHK near MG Road under 25k\"",
      properties: [],
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    // Add user message
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: msg }])
    setLoading(true)

    try {
      const { data } = await aiAPI.chat({ session_id: getSessionId(), message: msg })
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: data.response,
        properties: data.properties || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: "Sorry, I'm having trouble right now. Please try again!",
        properties: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent shadow-2xl
                   flex items-center justify-center text-bg transition-all hover:bg-accent2
                   hover:scale-110 active:scale-95"
        aria-label="Open AI chatbot"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[580px] flex flex-col
                        bg-bg2 border border-border2 rounded-2xl shadow-2xl overflow-hidden
                        animate-slide-up">

          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-accent/10 to-teal/5
                          border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-text1 font-semibold text-sm">RentBot</p>
              <p className="text-text3 text-xs">Powered by Gemini AI · Pinecone RAG</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-green text-xs">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                  <Bot size={14} className="text-accent" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text3 block" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text3 block" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text3 block" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips (only shown at start) */}
          {messages.length === 1 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full bg-card border border-border text-text2 text-xs
                             hover:border-accent/30 hover:text-accent transition-all">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2 bg-bg3 border border-border2 rounded-xl px-4 py-2
                            focus-within:border-accent/40 transition-all">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask me anything…"
                className="flex-1 bg-transparent outline-none text-text1 text-sm placeholder:text-text3"
                disabled={loading}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="p-1.5 rounded-full bg-accent text-bg disabled:opacity-40 transition-all
                           hover:bg-accent2 active:scale-95">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
