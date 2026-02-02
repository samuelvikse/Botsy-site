'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Send,
  MoreHorizontal,
  Phone,
  MessageCircle,
  Bot,
  User,
  Loader2,
  RefreshCw,
  CheckCheck,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAllSMSChats, getSMSHistory, saveSMSMessage } from '@/lib/sms-firestore'
import { getSMSChannel } from '@/lib/sms-firestore'
import { getAllWidgetChats, getWidgetChatHistory } from '@/lib/firestore'
import { getAllEmailChats, getEmailHistory } from '@/lib/email-firestore'
import { getSMSProvider } from '@/lib/sms'
import { Facebook, Mail } from 'lucide-react'
import type { SMSMessage } from '@/types'

// Polling intervals in milliseconds
const CONVERSATIONS_POLL_INTERVAL = 5000
const MESSAGES_POLL_INTERVAL = 3000

interface ConversationsViewProps {
  companyId: string
  initialConversationId?: string | null
  onConversationOpened?: () => void
}

type ChannelFilter = 'all' | 'sms' | 'widget' | 'messenger' | 'email'

interface Conversation {
  id: string
  name: string
  phone?: string
  email?: string
  channel: 'sms' | 'widget' | 'messenger' | 'email'
  lastMessage: string
  lastMessageAt: Date
  messageCount: number
  status: 'active' | 'resolved' | 'pending'
  isManualMode?: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status?: 'pending' | 'sent' | 'delivered' | 'failed'
  isManual?: boolean
}

export function ConversationsView({ companyId, initialConversationId, onConversationOpened }: ConversationsViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [hasOpenedInitial, setHasOpenedInitial] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle selecting a conversation - also resolves escalation if needed
  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)

    // If the conversation is escalated, resolve the escalation when employee opens it
    if (conv.isManualMode) {
      try {
        await fetch('/api/escalations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'resolveByConversation',
            companyId,
            conversationId: conv.id,
          }),
        })

        // Update local state to remove the red indicator
        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, isManualMode: false } : c)
        )
        // Also update the selected conversation
        setSelectedConversation(prev =>
          prev ? { ...prev, isManualMode: false } : null
        )
      } catch (error) {
        console.error('Failed to resolve escalation:', error)
      }
    }
  }

  // Fetch conversations (with optional silent mode for polling)
  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const convos: Conversation[] = []

      // Fetch SMS chats
      try {
        const smsChats = await getAllSMSChats(companyId)
        smsChats.forEach((chat) => {
          convos.push({
            id: `sms-${chat.customerPhone}`,
            name: formatPhoneForDisplay(chat.customerPhone),
            phone: chat.customerPhone,
            channel: 'sms' as const,
            lastMessage: chat.lastMessage?.body || 'Ingen meldinger',
            lastMessageAt: chat.lastMessageAt,
            messageCount: chat.messageCount,
            status: 'active' as const,
          })
        })
      } catch {
        // No SMS chats or error - continue
      }

      // Fetch Widget chats
      try {
        const widgetChats = await getAllWidgetChats(companyId)
        widgetChats.forEach((chat) => {
          const lastMsg = chat.messages[chat.messages.length - 1]
          convos.push({
            id: `widget-${chat.sessionId}`,
            name: `Besøkende ${chat.sessionId.slice(-6)}`,
            phone: chat.sessionId,
            channel: 'widget' as const,
            lastMessage: lastMsg?.content || 'Ingen meldinger',
            lastMessageAt: chat.lastMessageAt,
            messageCount: chat.messageCount,
            status: 'active' as const,
            isManualMode: chat.isManualMode || false,
          })
        })
      } catch {
        // No widget chats or error - continue
      }

      // Fetch Messenger chats via API
      try {
        const messengerResponse = await fetch(`/api/messenger/chats?companyId=${companyId}`)
        if (messengerResponse.ok) {
          const messengerData = await messengerResponse.json()
          if (messengerData.success && messengerData.chats) {
            messengerData.chats.forEach((chat: {
              senderId: string
              lastMessage: { text: string } | null
              lastMessageAt: string
              messageCount: number
              isManualMode?: boolean
            }) => {
              convos.push({
                id: `messenger-${chat.senderId}`,
                name: `Facebook ${chat.senderId.slice(-6)}`,
                phone: chat.senderId,
                channel: 'messenger' as const,
                lastMessage: chat.lastMessage?.text || 'Ingen meldinger',
                lastMessageAt: new Date(chat.lastMessageAt),
                messageCount: chat.messageCount,
                status: 'active' as const,
                isManualMode: chat.isManualMode || false,
              })
            })
          }
        }
      } catch {
        // Error fetching Messenger chats
      }

      // Fetch Email chats
      try {
        const emailChats = await getAllEmailChats(companyId)
        emailChats.forEach((chat) => {
          convos.push({
            id: `email-${chat.customerEmail.replace(/[.@]/g, '_')}`,
            name: chat.customerEmail,
            email: chat.customerEmail,
            channel: 'email' as const,
            lastMessage: chat.lastMessage?.body?.slice(0, 100) || chat.lastSubject || 'Ingen meldinger',
            lastMessageAt: chat.lastMessageAt,
            messageCount: chat.messageCount,
            status: 'active' as const,
          })
        })
      } catch {
        // No email chats or error - continue
      }

      // Sort by last message time
      convos.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

      setConversations(convos)
    } catch {
      // Error fetching conversations - silently fail
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [companyId])

  // Initial fetch with cleanup to prevent state updates after unmount
  useEffect(() => {
    let isMounted = true

    const doFetch = async () => {
      if (isMounted) {
        await fetchConversations()
      }
    }
    doFetch()

    return () => {
      isMounted = false
    }
  }, [fetchConversations])

  // Open initial conversation if provided
  useEffect(() => {
    if (initialConversationId && conversations.length > 0 && !hasOpenedInitial) {
      const conv = conversations.find(c => c.id === initialConversationId)
      if (conv) {
        setSelectedConversation(conv)
        setHasOpenedInitial(true)
        onConversationOpened?.()
      }
    }
  }, [initialConversationId, conversations, hasOpenedInitial, onConversationOpened])

  // Auto-refresh conversations
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true) // Silent refresh
    }, CONVERSATIONS_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchConversations])

  // Fetch messages for selected conversation (with optional silent mode)
  const fetchMessages = useCallback(async (conversation: Conversation, silent = false) => {
    if (!conversation.phone) return

    if (!silent) {
      setIsLoadingMessages(true)
      setManualMode(conversation.isManualMode || false)
    }

    try {
      let msgs: ChatMessage[] = []

      if (conversation.channel === 'sms') {
        // Fetch SMS messages
        const smsHistory = await getSMSHistory(companyId, conversation.phone, 100)
        msgs = smsHistory.map((msg) => ({
          id: msg.id,
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.body,
          timestamp: msg.timestamp,
          status: msg.status,
        }))
      } else if (conversation.channel === 'email' && conversation.email) {
        // Fetch Email messages
        const emailHistory = await getEmailHistory(companyId, conversation.email, 100)
        msgs = emailHistory.map((msg) => ({
          id: msg.id,
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: `**${msg.subject}**\n\n${msg.body}`,
          timestamp: msg.timestamp,
        }))
      } else if (conversation.channel === 'messenger') {
        // Fetch Messenger messages via API
        const messengerResponse = await fetch(
          `/api/messenger/chats?companyId=${companyId}&senderId=${conversation.phone}`
        )
        if (messengerResponse.ok) {
          const messengerData = await messengerResponse.json()
          if (messengerData.success && messengerData.messages) {
            msgs = messengerData.messages.map((msg: {
              id: string
              direction: 'inbound' | 'outbound'
              text: string
              timestamp: string
            }) => ({
              id: msg.id,
              role: msg.direction === 'inbound' ? 'user' : 'assistant',
              content: msg.text,
              timestamp: new Date(msg.timestamp),
            }))
          }
        }
      } else {
        // Fetch widget chat messages
        const widgetHistory = await getWidgetChatHistory(companyId, conversation.phone)
        msgs = widgetHistory.map((msg, index) => ({
          id: `msg-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          isManual: msg.isManual,
        }))
      }

      setMessages(msgs)
    } catch {
      // Error fetching messages - silently fail
    } finally {
      if (!silent) setIsLoadingMessages(false)
    }
  }, [companyId])

  // Initial fetch when conversation selected with cleanup
  useEffect(() => {
    if (!selectedConversation) return

    let isMounted = true

    const doFetch = async () => {
      if (isMounted) {
        await fetchMessages(selectedConversation)
      }
    }
    doFetch()

    return () => {
      isMounted = false
    }
  }, [selectedConversation, fetchMessages])

  // Auto-refresh messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return

    const interval = setInterval(() => {
      fetchMessages(selectedConversation, true) // Silent refresh
    }, MESSAGES_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [selectedConversation, fetchMessages])

  // Toggle manual mode via API
  const handleToggleManualMode = async () => {
    if (!selectedConversation?.phone) return

    const newMode = !manualMode
    try {
      const response = await fetch('/api/chat/manual', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sessionId: selectedConversation.phone,
          isManual: newMode,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setManualMode(newMode)
        // Update conversation in list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, isManualMode: newMode } : c
          )
        )
        setSelectedConversation((prev) =>
          prev ? { ...prev, isManualMode: newMode } : null
        )
      }
    } catch {
      // Error toggling manual mode - silently fail
    }
  }

  // Send manual message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation?.phone) return

    setIsSending(true)
    try {
      if (selectedConversation.channel === 'sms') {
        // SMS sending logic
        const channel = await getSMSChannel(companyId)
        if (!channel) {
          throw new Error('SMS not configured')
        }

        const provider = getSMSProvider(channel.provider, channel.credentials)
        const result = await provider.sendSMS(
          selectedConversation.phone,
          channel.phoneNumber,
          newMessage
        )

        const outboundMessage: Omit<SMSMessage, 'id'> = {
          direction: 'outbound',
          from: channel.phoneNumber,
          to: selectedConversation.phone,
          body: newMessage,
          status: result.status === 'sent' ? 'sent' : 'failed',
          providerMessageId: result.messageId,
          timestamp: new Date(),
        }

        await saveSMSMessage(companyId, selectedConversation.phone, outboundMessage)

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: newMessage,
            timestamp: new Date(),
            status: result.status,
          },
        ])
      } else {
        // Widget chat - send via API
        const response = await fetch('/api/chat/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            sessionId: selectedConversation.phone,
            message: newMessage,
          }),
        })

        const data = await response.json()
        if (data.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: newMessage,
              timestamp: new Date(),
              isManual: true,
            },
          ])
        } else {
          throw new Error(data.error)
        }
      }

      setNewMessage('')
    } catch {
      // Error sending message - silently fail
    } finally {
      setIsSending(false)
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (channelFilter !== 'all' && conv.channel !== channelFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        conv.name.toLowerCase().includes(query) ||
        conv.phone?.includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
      )
    }
    return true
  })

  const channelConfig = {
    sms: { icon: Phone, color: '#CDFF4D', label: 'SMS' },
    widget: { icon: MessageCircle, color: '#3B82F6', label: 'Widget' },
    messenger: { icon: Facebook, color: '#1877F2', label: 'Messenger' },
    email: { icon: Mail, color: '#EA4335', label: 'E-post' },
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4">
      {/* Conversation List */}
      <Card className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
        {/* Search and Filter */}
        <div className="p-4 border-b border-white/[0.06] space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk i samtaler..."
              className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
            />
          </div>

          {/* Channel Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'sms', 'widget', 'messenger', 'email'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setChannelFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  channelFilter === filter
                    ? 'bg-botsy-lime/10 text-botsy-lime'
                    : 'bg-white/[0.03] text-[#6B7A94] hover:text-white'
                }`}
              >
                {filter === 'all' ? 'Alle' : filter === 'sms' ? 'SMS' : filter === 'widget' ? 'Widget' : filter === 'messenger' ? 'Messenger' : 'E-post'}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-[#6B7A94]">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
              <button
                onClick={() => fetchConversations()}
                className="p-1.5 text-[#6B7A94] hover:text-white transition-colors"
                title="Oppdater nå"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 text-botsy-lime animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-[#6B7A94] text-sm">
              {conversations.length === 0
                ? 'Ingen samtaler ennå'
                : 'Ingen samtaler matcher søket'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const ChannelIcon = channelConfig[conv.channel].icon

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-4 text-left border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-white/[0.05]' : ''
                  } ${conv.isManualMode ? 'bg-red-500/[0.08] border-l-2 border-l-red-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 ${
                        conv.isManualMode ? 'bg-red-500/20' : 'bg-white/[0.1]'
                      }`}>
                        <ChannelIcon
                          className="h-5 w-5"
                          style={{ color: conv.isManualMode ? '#ef4444' : channelConfig[conv.channel].color }}
                        />
                      </div>
                      {conv.isManualMode && (
                        <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-[#0d1829] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm truncate ${conv.isManualMode ? 'text-red-400' : 'text-white'}`}>
                            {conv.name}
                          </p>
                          {conv.isManualMode && (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-medium rounded">
                              Venter
                            </span>
                          )}
                        </div>
                        <span className="text-[#6B7A94] text-xs flex-shrink-0">
                          {formatTimeAgo(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-[#6B7A94] text-sm truncate">{conv.lastMessage}</p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </Card>

      {/* Chat View */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${channelConfig[selectedConversation.channel].color}20`,
                  }}
                >
                  {selectedConversation.channel === 'sms' ? (
                    <Phone
                      className="h-5 w-5"
                      style={{ color: channelConfig.sms.color }}
                    />
                  ) : selectedConversation.channel === 'messenger' ? (
                    <Facebook
                      className="h-5 w-5"
                      style={{ color: channelConfig.messenger.color }}
                    />
                  ) : selectedConversation.channel === 'email' ? (
                    <Mail
                      className="h-5 w-5"
                      style={{ color: channelConfig.email.color }}
                    />
                  ) : (
                    <MessageCircle
                      className="h-5 w-5"
                      style={{ color: channelConfig.widget.color }}
                    />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{selectedConversation.name}</p>
                  <p className="text-[#6B7A94] text-sm flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: channelConfig[selectedConversation.channel].color,
                        color: channelConfig[selectedConversation.channel].color,
                      }}
                    >
                      {channelConfig[selectedConversation.channel].label}
                    </Badge>
                    <span>{selectedConversation.messageCount} meldinger</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.channel !== 'messenger' && (
                  <Button
                    variant={manualMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleManualMode}
                    className={manualMode ? 'bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90' : ''}
                  >
                    {manualMode ? (
                      <>
                        <User className="h-4 w-4 mr-1" />
                        Manuell modus
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-1" />
                        Ta over manuelt
                      </>
                    )}
                  </Button>
                )}
                <button className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 text-botsy-lime animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-[#6B7A94] text-sm py-8">
                  Ingen meldinger i denne samtalen
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Show in manual mode */}
            {manualMode && (
              <div className="p-4 border-t border-white/[0.06] bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Skriv et svar..."
                    className="flex-1 h-10 px-4 bg-white/[0.03] border border-amber-500/30 rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-amber-500/50"
                    disabled={isSending}
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-amber-500/70 text-xs mt-2 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Du svarer manuelt. Klikk &quot;Manuell modus&quot; for å la Botsy ta over igjen.
                </p>
              </div>
            )}

            {!manualMode && selectedConversation.channel === 'messenger' && (
              <div className="p-4 border-t border-white/[0.06] bg-[#1877F2]/5">
                <p className="text-[#A8B4C8] text-sm text-center">
                  <Facebook className="h-4 w-4 inline mr-1 text-[#1877F2]" />
                  Messenger-samtaler håndteres automatisk gjennom Facebook
                </p>
              </div>
            )}

            {!manualMode && selectedConversation.channel !== 'messenger' && (
              <div className="p-4 border-t border-white/[0.06] bg-botsy-lime/5">
                <p className="text-[#A8B4C8] text-sm text-center">
                  <Bot className="h-4 w-4 inline mr-1" />
                  Botsy svarer automatisk på meldinger i denne samtalen
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#6B7A94]">
            <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium text-white mb-1">Velg en samtale</p>
            <p className="text-sm">Klikk på en samtale til venstre for å se meldingene</p>
          </div>
        )}
      </Card>
    </div>
  )
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const isManual = message.isManual

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`p-3 rounded-2xl ${
            isUser
              ? 'bg-[#1E3A5F] text-white rounded-br-md'
              : isManual
              ? 'bg-amber-500/20 text-white rounded-bl-md border border-amber-500/30'
              : 'bg-white/[0.05] text-white rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div
          className={`flex items-center gap-1 mt-1 text-xs text-[#6B7A94] ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          {!isUser && (
            isManual ? (
              <User className="h-3 w-3 text-amber-500" />
            ) : (
              <Bot className="h-3 w-3" />
            )
          )}
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && message.status && (
            <span className="ml-1">
              {message.status === 'sent' && <CheckCheck className="h-3 w-3 text-[#6B7A94]" />}
              {message.status === 'delivered' && <CheckCheck className="h-3 w-3 text-botsy-lime" />}
              {message.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-400" />}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Utility functions
function formatPhoneForDisplay(phone: string): string {
  if (phone.startsWith('+47')) {
    const number = phone.slice(3)
    return `+47 ${number.slice(0, 3)} ${number.slice(3, 5)} ${number.slice(5)}`
  }
  return phone
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Nå'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}t`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
}
