'use client'

import { useState, useEffect, useRef, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface WidgetConfig {
  businessName: string
  botName: string
  greeting: string
  primaryColor: string
  position: string
  isEnabled: boolean
  logoUrl: string | null
  widgetSize: 'small' | 'medium' | 'large'
  animationStyle: 'scale' | 'slide' | 'fade' | 'bounce' | 'flip'
}

// Animation variants for different styles
const ANIMATION_VARIANTS = {
  scale: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  slide: {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 100 },
    transition: { type: 'spring', damping: 30, stiffness: 400 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  bounce: {
    initial: { opacity: 0, scale: 0.3, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.3, y: 50 },
    transition: { type: 'spring', damping: 12, stiffness: 200 },
  },
  flip: {
    initial: { opacity: 0, rotateX: -90, y: 30 },
    animate: { opacity: 1, rotateX: 0, y: 0 },
    exit: { opacity: 0, rotateX: 90, y: 30 },
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
}

const SIZE_DIMENSIONS = {
  small: { width: '340px', height: '460px' },
  medium: { width: '380px', height: '520px' },
  large: { width: '420px', height: '600px' },
}

// Padding added by iframe container
const IFRAME_PADDING = 20

// Session timeout settings
const INACTIVITY_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds
const AWAY_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds

// Generate a unique session ID
function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// Get or create session ID from localStorage, with expiration check
function getSessionId(companyId: string): string {
  const sessionKey = `botsy_session_${companyId}`
  const activityKey = `botsy_last_activity_${companyId}`
  const leaveKey = `botsy_leave_time_${companyId}`

  if (typeof window !== 'undefined') {
    const existingSessionId = localStorage.getItem(sessionKey)
    const lastActivity = localStorage.getItem(activityKey)
    const leaveTime = localStorage.getItem(leaveKey)

    // Check if session should be cleared due to inactivity (1 hour)
    if (existingSessionId && lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity, 10)
      if (timeSinceActivity > INACTIVITY_TIMEOUT) {
        // Clear old session
        localStorage.removeItem(sessionKey)
        localStorage.removeItem(activityKey)
        localStorage.removeItem(leaveKey)
      }
    }

    // Check if session should be cleared because user was away (15 min)
    if (existingSessionId && leaveTime) {
      const timeAway = Date.now() - parseInt(leaveTime, 10)
      if (timeAway > AWAY_TIMEOUT) {
        // Clear old session
        localStorage.removeItem(sessionKey)
        localStorage.removeItem(activityKey)
        localStorage.removeItem(leaveKey)
      }
    }

    // Clear leave time since user is back
    localStorage.removeItem(leaveKey)

    // Get or create session
    let sessionId = localStorage.getItem(sessionKey)
    if (!sessionId) {
      sessionId = generateSessionId()
      localStorage.setItem(sessionKey, sessionId)
    }

    // Update last activity
    localStorage.setItem(activityKey, Date.now().toString())

    return sessionId
  }
  return generateSessionId()
}

// Update last activity timestamp
function updateActivity(companyId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`botsy_last_activity_${companyId}`, Date.now().toString())
  }
}

// Record when user leaves the page
function recordLeaveTime(companyId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`botsy_leave_time_${companyId}`, Date.now().toString())
  }
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
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session ID and mount state
  useEffect(() => {
    setSessionId(getSessionId(companyId))
    setIsMounted(true)
  }, [companyId])

  // Track page visibility and record leave time
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordLeaveTime(companyId)
      } else {
        // User came back - check if session should be cleared
        const newSessionId = getSessionId(companyId)
        if (newSessionId !== sessionId) {
          // Session was cleared, reset state
          setSessionId(newSessionId)
          setMessages([])
          lastServerMessageCount.current = 0
          // Re-fetch config to get greeting
          if (config?.greeting) {
            setMessages([{
              id: 'greeting',
              role: 'assistant',
              content: config.greeting,
            }])
          }
        }
      }
    }

    const handleBeforeUnload = () => {
      recordLeaveTime(companyId)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [companyId, sessionId, config?.greeting])

  // Check for inactivity timeout periodically
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const activityKey = `botsy_last_activity_${companyId}`
      const lastActivity = localStorage.getItem(activityKey)

      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity, 10)
        if (timeSinceActivity > INACTIVITY_TIMEOUT) {
          // Clear session due to inactivity
          const sessionKey = `botsy_session_${companyId}`
          localStorage.removeItem(sessionKey)
          localStorage.removeItem(activityKey)

          // Reset state
          const newSessionId = generateSessionId()
          localStorage.setItem(sessionKey, newSessionId)
          localStorage.setItem(activityKey, Date.now().toString())

          setSessionId(newSessionId)
          setMessages([])
          lastServerMessageCount.current = 0

          if (config?.greeting) {
            setMessages([{
              id: 'greeting',
              role: 'assistant',
              content: config.greeting,
            }])
          }
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(checkInactivity)
  }, [companyId, config?.greeting])

  // Fetch widget config (initial load)
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(`/api/widget-config/${companyId}?t=${Date.now()}`)
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

  // Poll for config updates (every 30 seconds) - allows real-time visual updates
  useEffect(() => {
    if (!config) return // Don't poll until initial config is loaded

    const pollConfig = setInterval(async () => {
      try {
        const response = await fetch(`/api/widget-config/${companyId}?t=${Date.now()}`)
        const data = await response.json()
        if (data.success) {
          // Update config but DON'T reset messages or greeting
          setConfig(prev => {
            if (!prev) return data.config
            // Reset logo error if logoUrl changed
            if (prev.logoUrl !== data.config.logoUrl) {
              setLogoError(false)
            }
            // Only update visual settings, not greeting (to avoid disrupting conversation)
            return {
              ...prev,
              primaryColor: data.config.primaryColor,
              position: data.config.position,
              botName: data.config.botName,
              businessName: data.config.businessName,
              logoUrl: data.config.logoUrl,
              widgetSize: data.config.widgetSize,
              animationStyle: data.config.animationStyle,
              isEnabled: data.config.isEnabled,
            }
          })
        }
      } catch {
        // Silent fail - polling will retry
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(pollConfig)
  }, [companyId, config])

  // Close chat if widget gets disabled
  useEffect(() => {
    if (config && !config.isEnabled && isOpen) {
      setIsOpen(false)
    }
  }, [config?.isEnabled, isOpen])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Track the last known server message count to avoid duplicates
  const lastServerMessageCount = useRef(0)

  // Poll for new messages (to receive manual responses from admin)
  useEffect(() => {
    if (!isOpen || !sessionId || !companyId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/chat/history?companyId=${companyId}&sessionId=${sessionId}`)
        const data = await response.json()

        if (data.success && data.messages.length > lastServerMessageCount.current) {
          // Get only new messages from the server
          const serverMessages = data.messages as Array<{ role: 'user' | 'assistant'; content: string; isManual?: boolean }>
          const newServerMessages = serverMessages.slice(lastServerMessageCount.current)

          // Only add manual assistant messages (marked with isManual flag)
          const manualMessages = newServerMessages.filter(msg => msg.role === 'assistant' && msg.isManual === true)

          if (manualMessages.length > 0) {
            setMessages((prev) => {
              // Check if any of these messages already exist (by content)
              const existingContents = new Set(prev.map(m => m.content))
              const trulyNewMessages = manualMessages.filter(msg => !existingContents.has(msg.content))

              if (trulyNewMessages.length === 0) return prev

              return [
                ...prev,
                ...trulyNewMessages.map((msg, index) => ({
                  id: `polled-${Date.now()}-${index}`,
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                })),
              ]
            })
          }

          lastServerMessageCount.current = data.messages.length
        }
      } catch {
        // Silent fail - polling will retry
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [isOpen, sessionId, companyId])

  // Focus input and scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen) {
      updateActivity(companyId)
      setTimeout(() => {
        inputRef.current?.focus()
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
      }, 100)
    }
  }, [isOpen, companyId])

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

  // Notify parent of position
  useEffect(() => {
    if (config?.position) {
      window.parent.postMessage({ type: 'botsy-position', position: config.position }, '*')
    }
  }, [config?.position])

  // Notify parent of size
  useEffect(() => {
    if (config?.widgetSize) {
      window.parent.postMessage({ type: 'botsy-size', size: config.widgetSize }, '*')
    }
  }, [config?.widgetSize])

  // Ref to prevent double submissions
  const isSubmitting = useRef(false)

  const handleSend = async () => {
    const text = inputValue.trim()

    if (!text || isLoading || !sessionId || isSubmitting.current) return

    // Prevent double submission
    isSubmitting.current = true

    // Update activity timestamp
    updateActivity(companyId)

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
        // Check if chat is in manual mode
        // If escalated is true, this is the first escalation response - show it
        // If isManualMode is true but escalated is false, user is already in manual mode - skip
        if (data.isManualMode && !data.escalated) {
          // Don't add the automated "waiting" message - just skip
          // The customer will see the human's response when they send it
        } else {
          const { cleanContent, showEmailPrompt } = processMessage(data.reply)

          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: cleanContent,
            },
          ])

          // Show email input if Botsy offered email summary
          if (showEmailPrompt && !emailSent) {
            setShowEmailInput(true)
          }
        }
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
      isSubmitting.current = false
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Process message content to detect email request markers
  const processMessage = (content: string): { cleanContent: string; showEmailPrompt: boolean } => {
    let cleanContent = content
    let showEmailPrompt = false

    if (content.includes('[EMAIL_REQUEST]')) {
      cleanContent = content.replace('[EMAIL_REQUEST]', '')
      showEmailPrompt = true
    }

    if (content.includes('[OFFER_EMAIL]')) {
      cleanContent = content.replace('[OFFER_EMAIL]', '')
      showEmailPrompt = true
    }

    return { cleanContent: cleanContent.trim(), showEmailPrompt }
  }

  // Handle sending email summary
  const handleSendEmail = async () => {
    if (!emailAddress || isSendingEmail) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailAddress)) {
      alert('Vennligst skriv inn en gyldig e-postadresse')
      return
    }

    setIsSendingEmail(true)

    try {
      const response = await fetch('/api/chat/send-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sessionId,
          customerEmail: emailAddress,
          messages: messages.filter(m => m.id !== 'greeting'),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEmailSent(true)
        setShowEmailInput(false)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Flott! Jeg har sendt en oppsummering av samtalen vår til ${emailAddress}. Ha en fin dag!`,
          },
        ])
      } else {
        alert(data.error || 'Kunne ikke sende e-post. Prøv igjen.')
      }
    } catch {
      alert('Kunne ikke sende e-post. Sjekk internettforbindelsen.')
    } finally {
      setIsSendingEmail(false)
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

        html, body, body.bg-botsy-dark, .bg-botsy-dark, #__next, main {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: transparent !important;
          background-color: transparent !important;
          min-height: auto !important;
        }

        body {
          background: none !important;
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
            className={`absolute bottom-2 ${config.position === 'bottom-left' ? 'left-2' : 'right-2'} h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-colors overflow-hidden`}
            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
          >
            {config.logoUrl && !logoError ? (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <Image
                  src={config.logoUrl}
                  alt={config.businessName}
                  fill
                  className="object-cover rounded-full"
                  onError={() => setLogoError(true)}
                  unoptimized
                />
              </div>
            ) : (
              <Image
                src="/brand/botsy-icon-dark.svg"
                alt="Chat"
                width={28}
                height={28}
                unoptimized
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={ANIMATION_VARIANTS[config.animationStyle || 'scale'].initial}
            animate={ANIMATION_VARIANTS[config.animationStyle || 'scale'].animate}
            exit={ANIMATION_VARIANTS[config.animationStyle || 'scale'].exit}
            transition={ANIMATION_VARIANTS[config.animationStyle || 'scale'].transition}
            className={`fixed inset-2 sm:inset-auto sm:bottom-4 ${config.position === 'bottom-left' ? 'sm:left-4' : 'sm:right-4'} flex flex-col rounded-2xl shadow-2xl overflow-hidden`}
            style={{
              backgroundColor: '#1a1a2e',
              perspective: config.animationStyle === 'flip' ? 1000 : undefined,
              ...(isMounted && window.innerWidth >= 640 ? {
                width: SIZE_DIMENSIONS[config.widgetSize || 'medium'].width,
                height: SIZE_DIMENSIONS[config.widgetSize || 'medium'].height,
              } : {}),
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-900/20 flex items-center justify-center overflow-hidden relative">
                  {config.logoUrl && !logoError ? (
                    <Image
                      src={config.logoUrl}
                      alt={config.businessName}
                      fill
                      className="object-cover rounded-full"
                      onError={() => setLogoError(true)}
                      unoptimized
                    />
                  ) : (
                    <Image
                      src="/brand/botsy-icon-dark.svg"
                      alt="Botsy"
                      width={22}
                      height={22}
                      unoptimized
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {config.botName || 'Botsy'}
                  </h3>
                  <p className="text-xs text-gray-900/70">
                    {config.businessName}
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
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
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

            {/* Email Input */}
            {showEmailInput && !emailSent && (
              <div className="p-4 border-t border-white/10 bg-white/5">
                <p className="text-white/80 text-sm mb-3">
                  Skriv inn e-postadressen din for å motta oppsummeringen:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSendEmail()
                      }
                    }}
                    placeholder="din@epost.no"
                    className="flex-1 h-11 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/40 transition-colors"
                    disabled={isSendingEmail}
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={!emailAddress || isSendingEmail}
                    className="h-11 px-4 rounded-xl flex items-center justify-center text-gray-900 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setShowEmailInput(false)}
                  className="text-white/50 text-xs mt-2 hover:text-white/70 transition-colors"
                >
                  Nei takk, jeg trenger ikke oppsummering
                </button>
              </div>
            )}

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
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
                  unoptimized
                />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
