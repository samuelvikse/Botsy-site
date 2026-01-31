'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Tag, Clock, FileText, Zap } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ChatBubble, ChatContainer } from '@/components/ui/chat-bubble'
import type { OwnerChatMessage, BusinessProfile, Instruction } from '@/types'

interface BotsyChatPanelProps {
  companyId?: string
  businessProfile?: BusinessProfile | null
  instructions?: Instruction[]
  onInstructionCreated?: (instruction: Instruction) => void
}

const quickActions = [
  { label: 'Kampanje', icon: Tag, prompt: 'Vi har en ny kampanje: ' },
  { label: 'Åpningstider', icon: Clock, prompt: 'Endre åpningstidene til ' },
  { label: 'Policy', icon: FileText, prompt: 'Ny policy: ' },
]

export function BotsyChatPanel({
  companyId,
  businessProfile,
  instructions = [],
  onInstructionCreated,
}: BotsyChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<OwnerChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hei! Trenger du hjelp med noe? Gi meg instruksjoner om kampanjer, åpningstider, eller andre ting kundene bør vite.',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [newInstructionId, setNewInstructionId] = useState<string | null>(null)
  const [hasUnread, setHasUnread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim()
    if (!text || isLoading) return

    const userMessage: OwnerChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/owner-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          businessProfile,
          activeInstructions: instructions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke sende melding')
      }

      const assistantMessage: OwnerChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        instructionCreated: data.instructionCreated?.id,
      }
      setMessages(prev => [...prev, assistantMessage])

      if (data.instructionCreated && onInstructionCreated) {
        setNewInstructionId(data.instructionCreated.id)
        onInstructionCreated(data.instructionCreated)
        setTimeout(() => setNewInstructionId(null), 4000)
      }

    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Beklager, noe gikk galt. Prøv igjen.',
          timestamp: new Date(),
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

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-botsy-lime shadow-lg shadow-botsy-lime/30 flex items-center justify-center hover:shadow-botsy-lime/50 transition-all"
          >
            <Image
              src="/brand/botsy-icon-dark.svg"
              alt="Botsy"
              width={28}
              height={28}
            />

            {/* Unread indicator */}
            {hasUnread && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-botsy-dark" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel - Glass Morphism Design */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 lg:bottom-6 lg:right-6 w-full lg:w-[420px] h-[100dvh] lg:h-[620px] lg:max-h-[calc(100vh-3rem)] z-50 flex flex-col overflow-hidden lg:rounded-2xl"
            >
              {/* Panel container */}
              <div className="relative flex-1 flex flex-col bg-botsy-dark-deep border-l lg:border border-white/[0.08] lg:rounded-2xl overflow-hidden">

                {/* Header */}
                <div className="relative flex items-center justify-between p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-botsy-lime/15 border border-botsy-lime/30 flex items-center justify-center">
                        <Image
                          src="/brand/botsy-icon.svg"
                          alt="Botsy"
                          width={22}
                          height={22}
                        />
                      </div>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-400 rounded-full border-2 border-botsy-dark-deep" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Botsy</h3>
                      <p className="text-[#6B7A94] text-xs">Din digitale hjelper</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Messages */}
                <div className="relative flex-1 overflow-y-auto p-4">
                  <ChatContainer>
                    {messages.map((msg) => (
                      <div key={msg.id}>
                        <ChatBubble
                          role={msg.role === 'assistant' ? 'botsy' : 'user'}
                          timestamp={formatTime(msg.timestamp)}
                        >
                          {msg.content}
                        </ChatBubble>

                        {/* Instruction Created Badge */}
                        {msg.instructionCreated && msg.instructionCreated === newInstructionId && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="ml-11 mt-2"
                          >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-botsy-lime/10 border border-botsy-lime/20 rounded-lg">
                              <Zap className="h-3.5 w-3.5 text-botsy-lime" />
                              <span className="text-botsy-lime text-sm">Instruks opprettet</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <ChatBubble role="botsy" isTyping />
                    )}
                  </ChatContainer>
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="relative px-4 pb-2">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => setInputValue(action.prompt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[#A8B4C8] text-xs whitespace-nowrap hover:bg-white/[0.08] hover:text-white transition-colors"
                      >
                        <action.icon className="h-3 w-3" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="relative p-4 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Skriv en melding..."
                        className="w-full h-12 px-4 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:bg-white/[0.05] transition-all duration-300"
                        disabled={isLoading}
                      />
                      {/* Character hint */}
                      {inputValue.length > 0 && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7A94] text-xs">
                          {inputValue.length}/500
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleSend()}
                      disabled={!inputValue.trim() || isLoading}
                      size="icon"
                      className="h-12 w-12 rounded-xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
