'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Send,
  Paperclip,
  MoreHorizontal,
  Phone,
  MessageCircle,
  Bot,
  User,
  Loader2,
  Filter,
  RefreshCw,
  Clock,
  CheckCheck,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAllSMSChats, getSMSHistory, saveSMSMessage } from '@/lib/sms-firestore'
import { getSMSChannel } from '@/lib/sms-firestore'
import { getAllWidgetChats, getWidgetChatHistory } from '@/lib/firestore'
import { getSMSProvider } from '@/lib/sms'
import type { SMSMessage } from '@/types'

interface ConversationsViewProps {
  companyId: string
}

type ChannelFilter = 'all' | 'sms' | 'widget'

interface Conversation {
  id: string
  name: string
  phone?: string
  channel: 'sms' | 'widget'
  lastMessage: string
  lastMessageAt: Date
  messageCount: number
  status: 'active' | 'resolved' | 'pending'
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status?: 'pending' | 'sent' | 'delivered' | 'failed'
}

export function ConversationsView({ companyId }: ConversationsViewProps) {
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

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
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
      } catch (e) {
        console.log('No SMS chats or error fetching:', e)
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
          })
        })
      } catch (e) {
        console.log('No widget chats or error fetching:', e)
      }

      // Sort by last message time
      convos.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

      setConversations(convos)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversation: Conversation) => {
    if (!conversation.phone) return

    setIsLoadingMessages(true)
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
      } else {
        // Fetch widget chat messages
        const widgetHistory = await getWidgetChatHistory(companyId, conversation.phone)
        msgs = widgetHistory.map((msg, index) => ({
          id: `msg-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }))
      }

      setMessages(msgs)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [companyId])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation, fetchMessages])

  // Send manual message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation?.phone) return

    setIsSending(true)
    try {
      // Get SMS channel config
      const channel = await getSMSChannel(companyId)
      if (!channel) {
        throw new Error('SMS not configured')
      }

      // Get provider
      const provider = getSMSProvider(channel.provider, channel.credentials)

      // Send SMS
      const result = await provider.sendSMS(
        selectedConversation.phone,
        channel.phoneNumber,
        newMessage
      )

      // Save message to Firestore
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

      // Add to local messages
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

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
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
          <div className="flex gap-2">
            {(['all', 'sms', 'widget'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setChannelFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  channelFilter === filter
                    ? 'bg-botsy-lime/10 text-botsy-lime'
                    : 'bg-white/[0.03] text-[#6B7A94] hover:text-white'
                }`}
              >
                {filter === 'all' ? 'Alle' : filter === 'sms' ? 'SMS' : 'Widget'}
              </button>
            ))}
            <button
              onClick={fetchConversations}
              className="ml-auto p-1.5 text-[#6B7A94] hover:text-white transition-colors"
              title="Oppdater"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
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
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-white/[0.05]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-white/[0.1] flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                        <ChannelIcon
                          className="h-5 w-5"
                          style={{ color: channelConfig[conv.channel].color }}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-white font-medium text-sm truncate">
                          {conv.name}
                        </p>
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
                <Button
                  variant={manualMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setManualMode(!manualMode)}
                >
                  {manualMode ? 'Automatisk modus' : 'Ta over manuelt'}
                </Button>
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
            </div>

            {/* Input - Only show in manual mode for SMS */}
            {manualMode && selectedConversation.channel === 'sms' && (
              <div className="p-4 border-t border-white/[0.06]">
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
                    placeholder="Skriv en melding..."
                    className="flex-1 h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                    disabled={isSending}
                  />
                  <Button size="sm" onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[#6B7A94] text-xs mt-2">
                  Du er i manuell modus. Botsy vil ikke svare automatisk på denne samtalen.
                </p>
              </div>
            )}

            {!manualMode && (
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

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`p-3 rounded-2xl ${
            isUser
              ? 'bg-botsy-lime text-botsy-dark rounded-br-md'
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
          {!isUser && <Bot className="h-3 w-3" />}
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
