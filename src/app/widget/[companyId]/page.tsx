'use client'

import { useState, useEffect, useRef, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X } from 'lucide-react'
import Image from 'next/image'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface WidgetConfig {
  businessName: string
  greeting: string
  primaryColor: string
  position: string
  isEnabled: boolean
  logoUrl: string | null
}

// Generate a unique session ID
function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// Get or create session ID from localStorage
function getSessionId(companyId: string): string {
  const key = `botsy_session_${companyId}`
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem(key)
    if (!sessionId) {
      sessionId = generateSessionId()
      localStorage.setItem(key, sessionId)
    }
    return sessionId
  }
  return generateSessionId()
}

export default function WidgetPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = use(params)
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session ID
  useEffect(() => {
    setSessionId(getSessionId(companyId))
  }, [companyId])

  // Fetch widget config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(`/api/chat/${companyId}`)
        const data = await response.json()
        if (data.success) {
          setConfig(data.config)
          // Add greeting as first message
          if (data.config.greeting) {
            setMessages([
              {
                id: 'greeting',
                role: 'assistant',
                content: data.config.greeting,
              },
            ])
          }
        } else {
          setError(data.error || 'Kunne ikke laste chat')
        }
      } catch {
        setError('Kunne ikke koble til chat-tjenesten')
      }
    }

    fetchConfig()
  }, [companyId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Listen for parent window messages (open/close)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data.type === 'botsy-toggle') {
        setIsOpen(event.data.isOpen)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Notify parent of state changes
  useEffect(() => {
    window.parent.postMessage({ type: 'botsy-state', isOpen }, '*')
  }, [isOpen])

  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || isLoading || !sessionId) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch(`/api/chat/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.reply,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Beklager, noe gikk galt. Prøv igjen.',
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Kunne ikke sende meldingen. Sjekk internettforbindelsen.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center p-4 text-center" style={{ background: 'transparent' }}>
        <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
      </div>
    )
  }

  if (!config.isEnabled) {
    return null
  }

  const primaryColor = config.primaryColor || '#CCFF00'

  return (
    <div className="h-screen w-screen font-sans" style={{ background: 'transparent' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: transparent !important;
          min-height: auto !important;
        }

        .bg-botsy-dark {
          background: transparent !important;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>

      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-colors overflow-hidden"
            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
          >
            {config.logoUrl ? (
              <Image
                src={config.logoUrl}
                alt={config.businessName}
                width={32}
                height={32}
                className="object-contain"
              />
            ) : (
              <Image
                src="/brand/botsy-icon-dark.svg"
                alt="Chat"
                width={28}
                height={28}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-2 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[380px] sm:h-[520px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-900/20 flex items-center justify-center overflow-hidden">
                  {config.logoUrl ? (
                    <Image
                      src={config.logoUrl}
                      alt={config.businessName}
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  ) : (
                    <Image
                      src="/brand/botsy-icon-dark.svg"
                      alt="Botsy"
                      width={22}
                      height={22}
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {config.businessName}
                  </h3>
                  <p className="text-xs text-gray-900/70">
                    Drevet av Botsy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-gray-900/70 hover:text-gray-900 hover:bg-gray-900/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-md text-gray-900'
                        : 'rounded-bl-md bg-white/10 text-white'
                    }`}
                    style={
                      msg.role === 'user'
                        ? { backgroundColor: primaryColor }
                        : {}
                    }
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-2 w-2 rounded-full bg-white/50"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Skriv en melding..."
                  className="flex-1 h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/30 transition-colors"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="h-11 w-11 rounded-xl flex items-center justify-center text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <a
                href="https://botsy.no"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-white/30 text-xs mt-3 hover:text-white/50 transition-colors"
              >
                <span>Drevet av</span>
                <Image
                  src="/brand/botsy-wordmark.svg"
                  alt="Botsy"
                  width={40}
                  height={12}
                  className="opacity-50"
                />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
