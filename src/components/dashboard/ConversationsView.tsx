'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
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
  ArrowLeft,
  Download,
  Sparkles,
  PenLine,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAllSMSChats, getSMSHistory, saveSMSMessage } from '@/lib/sms-firestore'
import { getSMSChannel } from '@/lib/sms-firestore'
import { getAllWidgetChats, getWidgetChatHistory } from '@/lib/firestore'
import { getAllEmailChats, getEmailHistory } from '@/lib/email-firestore'
import { getSMSProvider } from '@/lib/sms'
import { Facebook, Mail, Instagram } from 'lucide-react'
import { ExportConversations } from './ExportConversations'
import type { SMSMessage } from '@/types'

// Polling intervals in milliseconds
const CONVERSATIONS_POLL_INTERVAL = 5000
const MESSAGES_POLL_INTERVAL = 3000

interface ConversationsViewProps {
  companyId: string
  initialConversationId?: string | null
  onConversationOpened?: () => void
}

type ChannelFilter = 'all' | 'sms' | 'widget' | 'messenger' | 'instagram' | 'email'

interface Conversation {
  id: string
  name: string
  phone?: string
  email?: string
  channel: 'sms' | 'widget' | 'messenger' | 'instagram' | 'email'
  lastMessage: string
  lastMessageAt: Date
  messageCount: number
  status: 'active' | 'resolved' | 'pending'
  isManualMode?: boolean
  lastMessageRole?: 'user' | 'assistant' // Track who sent the last message
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status?: 'pending' | 'sent' | 'delivered' | 'failed'
  isManual?: boolean
}

export const ConversationsView = memo(function ConversationsView({ companyId, initialConversationId, onConversationOpened }: ConversationsViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [hasOpenedInitial, setHasOpenedInitial] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  // Email reply state
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([])
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0)
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false)
  const [emailReplyMode, setEmailReplyMode] = useState<'suggestion' | 'manual' | null>(null)
  const [emailReplyBody, setEmailReplyBody] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailSummary, setEmailSummary] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryMode, setSummaryMode] = useState<'last' | 'conversation' | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [customerTyping, setCustomerTyping] = useState(false)
  const [lastReadByCustomer, setLastReadByCustomer] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const previousConversationId = useRef<string | null>(null)
  const agentTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const attendedEmailTimes = useRef<Map<string, number>>(new Map())

  // Check if user is near bottom of messages
  const checkIfNearBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true
    const threshold = 100 // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  // Handle scroll events to track if user scrolled up
  const handleMessagesScroll = useCallback(() => {
    setShouldAutoScroll(checkIfNearBottom())
  }, [checkIfNearBottom])

  // Instantly snap scroll to bottom (no animation, no flash)
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [])

  // Scroll to bottom only when opening a new conversation or when near bottom
  useEffect(() => {
    const isNewConversation = selectedConversation?.id !== previousConversationId.current

    if (isNewConversation) {
      previousConversationId.current = selectedConversation?.id || null
      setShouldAutoScroll(true)
      // Use requestAnimationFrame to ensure DOM has rendered before scrolling
      requestAnimationFrame(scrollToBottom)
    } else if (shouldAutoScroll && messages.length > 0) {
      requestAnimationFrame(scrollToBottom)
    }
  }, [messages, selectedConversation?.id, shouldAutoScroll, scrollToBottom])

  // Handle selecting a conversation - also resolves escalation if needed
  const handleSelectConversation = useCallback(async (conv: Conversation) => {
    setSelectedConversation(conv)

    // Send read receipt for widget conversations
    if (conv.channel === 'widget' && conv.phone) {
      fetch('/api/chat/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, sessionId: conv.phone, who: 'agent' }),
      }).catch(() => {})
    }

    // Mark email conversations as read in Firestore
    if (conv.channel === 'email' && conv.email) {
      const normalizedEmail = conv.email.toLowerCase().trim().replace(/[.#$[\]]/g, '_')
      attendedEmailTimes.current.set(conv.id, Date.now())
      fetch('/api/chat/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, sessionId: normalizedEmail, who: 'agent', channel: 'email' }),
      }).catch(() => {})
    }

    // If the conversation is escalated, resolve the escalation when employee opens it
    if (conv.isManualMode) {
      // Update local state immediately to remove the red indicator
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, isManualMode: false } : c)
      )
      setSelectedConversation(prev =>
        prev ? { ...prev, isManualMode: false } : null
      )

      // Resolve escalation in backend (fire-and-forget)
      fetch('/api/escalations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolveByConversation',
          companyId,
          conversationId: conv.id,
        }),
      }).catch(() => {})
    }
  }, [companyId])

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
            lastMessageRole: lastMsg?.role as 'user' | 'assistant' | undefined,
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
              customerName?: string
              customerProfilePic?: string
              lastMessage: { text: string; direction?: 'inbound' | 'outbound' } | null
              lastMessageAt: string
              messageCount: number
              isManualMode?: boolean
            }) => {
              convos.push({
                id: `messenger-${chat.senderId}`,
                name: chat.customerName || `Facebook ${chat.senderId.slice(-6)}`,
                phone: chat.senderId,
                channel: 'messenger' as const,
                lastMessage: chat.lastMessage?.text || 'Ingen meldinger',
                lastMessageAt: new Date(chat.lastMessageAt),
                messageCount: chat.messageCount,
                status: 'active' as const,
                isManualMode: chat.isManualMode || false,
                lastMessageRole: chat.lastMessage?.direction === 'inbound' ? 'user' : 'assistant',
              })
            })
          }
        }
      } catch {
        // Error fetching Messenger chats
      }

      // Fetch Instagram chats via API
      try {
        const instagramResponse = await fetch(`/api/instagram/chats?companyId=${companyId}`)
        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json()
          if (instagramData.success && instagramData.chats) {
            instagramData.chats.forEach((chat: {
              senderId: string
              customerUsername?: string
              customerName?: string
              lastMessage: { text: string; direction?: 'inbound' | 'outbound' } | null
              lastMessageAt: string
              messageCount: number
              isManualMode?: boolean
            }) => {
              // Prefer username (e.g. @johndoe) for Instagram, fallback to name, then ID
              const displayName = chat.customerUsername 
                ? `@${chat.customerUsername}` 
                : chat.customerName || `Instagram ${chat.senderId.slice(-6)}`
              convos.push({
                id: `instagram-${chat.senderId}`,
                name: displayName,
                phone: chat.senderId,
                channel: 'instagram' as const,
                lastMessage: chat.lastMessage?.text || 'Ingen meldinger',
                lastMessageAt: new Date(chat.lastMessageAt),
                messageCount: chat.messageCount,
                status: 'active' as const,
                isManualMode: chat.isManualMode || false,
                lastMessageRole: chat.lastMessage?.direction === 'inbound' ? 'user' : 'assistant',
              })
            })
          }
        }
      } catch {
        // Error fetching Instagram chats
      }

      // Fetch Email chats
      try {
        const emailChats = await getAllEmailChats(companyId)
        emailChats.forEach((chat) => {
          const emailConvId = `email-${chat.customerEmail.replace(/[.@]/g, '_')}`
          const isInbound = chat.lastMessage?.direction === 'inbound'
          const memoryAttendedAt = attendedEmailTimes.current.get(emailConvId)
          const firestoreReadAt = chat.lastReadByAgent?.getTime() || 0
          const attendedAt = Math.max(memoryAttendedAt || 0, firestoreReadAt)
          const isAttended = attendedAt ? chat.lastMessageAt.getTime() <= attendedAt : false
          convos.push({
            id: emailConvId,
            name: chat.customerEmail,
            email: chat.customerEmail,
            channel: 'email' as const,
            lastMessage: chat.lastMessage?.body?.slice(0, 100) || chat.lastSubject || 'Ingen meldinger',
            lastMessageAt: chat.lastMessageAt,
            messageCount: chat.messageCount,
            status: 'active' as const,
            isManualMode: isInbound && !isAttended,
            lastMessageRole: isInbound ? 'user' : 'assistant',
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

  // Reset hasOpenedInitial when initialConversationId changes (user clicked a different notification)
  useEffect(() => {
    if (initialConversationId) {
      setHasOpenedInitial(false)
    }
  }, [initialConversationId])

  // Open initial conversation if provided
  useEffect(() => {
    if (initialConversationId && conversations.length > 0 && !hasOpenedInitial) {
      const conv = conversations.find(c => c.id === initialConversationId)
      if (conv) {
        handleSelectConversation(conv)
        setHasOpenedInitial(true)
        onConversationOpened?.()
      }
    }
  }, [initialConversationId, conversations, hasOpenedInitial, onConversationOpened, handleSelectConversation])

  // Auto-refresh conversations
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true) // Silent refresh
    }, CONVERSATIONS_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchConversations])

  // Fetch messages for selected conversation (with optional silent mode)
  const fetchMessages = useCallback(async (conversation: Conversation, silent = false) => {
    if (!conversation.phone && !conversation.email) return

    if (!silent) {
      setIsLoadingMessages(true)
      setManualMode(conversation.isManualMode || false)
    }

    try {
      let msgs: ChatMessage[] = []

      if (conversation.channel === 'sms' && conversation.phone) {
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
          content: `**${msg.subject}**\n\n${cleanEmailBody(msg.body)}`,
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
      } else if (conversation.channel === 'instagram') {
        // Fetch Instagram messages via API
        const instagramResponse = await fetch(
          `/api/instagram/chats?companyId=${companyId}&senderId=${conversation.phone}`
        )
        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json()
          if (instagramData.success && instagramData.messages) {
            msgs = instagramData.messages.map((msg: {
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
      } else if (conversation.phone) {
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

      // Check typing status and read receipts for widget conversations
      if (selectedConversation.channel === 'widget' && selectedConversation.phone) {
        fetch(`/api/chat/history?companyId=${companyId}&sessionId=${selectedConversation.phone}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              if (data.customerTypingAt) {
                const typingAge = Date.now() - new Date(data.customerTypingAt).getTime()
                setCustomerTyping(typingAge < 5000)
              } else {
                setCustomerTyping(false)
              }
              if (data.lastReadByCustomer) {
                setLastReadByCustomer(data.lastReadByCustomer)
              }
            }
          })
          .catch(() => {})
      }
    }, MESSAGES_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [selectedConversation, fetchMessages, companyId])

  // Send agent typing status (debounced)
  const sendAgentTyping = useCallback(() => {
    if (!selectedConversation?.phone || selectedConversation.channel !== 'widget') return
    if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current)
    agentTypingTimeoutRef.current = setTimeout(() => {
      fetch('/api/chat/typing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sessionId: selectedConversation.phone,
          who: 'agent',
        }),
      }).catch(() => {})
    }, 300)
  }, [companyId, selectedConversation?.phone, selectedConversation?.channel])

  // Reset typing/read state when conversation changes
  useEffect(() => {
    setCustomerTyping(false)
    setLastReadByCustomer(null)
  }, [selectedConversation?.id])

  // Toggle manual mode via API
  const handleToggleManualMode = async () => {
    if (!selectedConversation?.phone) return

    const newMode = !manualMode
    try {
      // Use different API endpoint based on channel
      let apiUrl = '/api/chat/manual'
      if (selectedConversation.channel === 'messenger') {
        apiUrl = '/api/messenger/manual'
      } else if (selectedConversation.channel === 'instagram') {
        apiUrl = '/api/instagram/manual'
      }

      const bodyData = (selectedConversation.channel === 'messenger' || selectedConversation.channel === 'instagram')
        ? { companyId, senderId: selectedConversation.phone, isManual: newMode }
        : { companyId, sessionId: selectedConversation.phone, isManual: newMode }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
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
        // Update conversation to show we've replied
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? { ...c, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const }
              : c
          )
        )
        setSelectedConversation((prev) =>
          prev ? { ...prev, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const } : null
        )
      } else if (selectedConversation.channel === 'messenger') {
        // Messenger - send via API
        const response = await fetch('/api/messenger/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            senderId: selectedConversation.phone,
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
          // Update conversation to show we've replied
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? { ...c, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const }
                : c
            )
          )
          setSelectedConversation((prev) =>
            prev ? { ...prev, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const } : null
          )
        } else {
          throw new Error(data.error)
        }
      } else if (selectedConversation.channel === 'instagram') {
        // Instagram - send via API
        const response = await fetch('/api/instagram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            senderId: selectedConversation.phone,
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
          // Update conversation to show we've replied
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? { ...c, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const }
                : c
            )
          )
          setSelectedConversation((prev) =>
            prev ? { ...prev, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const } : null
          )
        } else {
          throw new Error(data.error)
        }
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
          // Update conversation to show we've replied
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? { ...c, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const }
                : c
            )
          )
          setSelectedConversation((prev) =>
            prev ? { ...prev, lastMessage: newMessage, lastMessageAt: new Date(), lastMessageRole: 'assistant' as const } : null
          )
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

  // Reset email reply state when switching conversations
  useEffect(() => {
    setEmailReplyMode(null)
    setEmailSuggestions([])
    setActiveSuggestionIdx(0)
    setEmailReplyBody('')
    setEmailSummary('')
    setShowMoreMenu(false)
  }, [selectedConversation?.id])

  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMoreMenu])

  // Get AI suggestion for email reply
  const handleGetEmailSuggestion = async (isNew = false) => {
    if (!selectedConversation?.email) return

    setIsGeneratingSuggestion(true)
    if (!isNew) setEmailReplyMode('suggestion')

    try {
      const response = await fetch('/api/email/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerEmail: selectedConversation.email,
          previousSuggestions: isNew ? emailSuggestions : undefined,
        }),
      })

      const data = await response.json()
      if (data.success && data.suggestion) {
        const newSuggestions = [...emailSuggestions, data.suggestion]
        setEmailSuggestions(newSuggestions)
        setActiveSuggestionIdx(newSuggestions.length - 1)
        setEmailReplyBody(data.suggestion)
      }
    } catch {
      // Error getting suggestion
    } finally {
      setIsGeneratingSuggestion(false)
    }
  }

  // Send email reply
  const handleSendEmailReply = async () => {
    if (!selectedConversation?.email || !emailReplyBody.trim()) return

    setIsSendingEmail(true)
    try {
      // Find last subject from messages
      const lastMsg = [...messages].reverse().find(m => m.content.startsWith('**'))
      const subjectMatch = lastMsg?.content.match(/^\*\*(.+?)\*\*/)
      const subject = subjectMatch?.[1] || 'Henvendelse'

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerEmail: selectedConversation.email,
          subject,
          body: emailReplyBody,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Add outbound message to local state
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `**Re: ${subject}**\n\n${emailReplyBody}`,
            timestamp: new Date(),
            isManual: true,
          },
        ])
        // Update conversation list
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id
              ? { ...c, lastMessage: emailReplyBody.slice(0, 100), lastMessageAt: new Date() }
              : c
          )
        )
        // Reset email reply state
        setEmailReplyMode(null)
        setEmailSuggestions([])
        setActiveSuggestionIdx(0)
        setEmailReplyBody('')
      }
    } catch {
      // Error sending email
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Summarize email conversation (full conversation)
  const handleSummarizeEmail = async () => {
    if (!selectedConversation?.email) return

    setIsGeneratingSummary(true)
    setSummaryMode('conversation')
    setEmailSummary('')

    try {
      const response = await fetch('/api/email/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerEmail: selectedConversation.email,
          mode: 'conversation',
        }),
      })

      const data = await response.json()
      if (data.success && data.summary) {
        setEmailSummary(data.summary)
      }
    } catch {
      // Error summarizing
    } finally {
      setIsGeneratingSummary(false)
      setSummaryMode(null)
    }
  }

  // Summarize last inbound email only
  const handleSummarizeLastEmail = async () => {
    if (!selectedConversation?.email) return

    setIsGeneratingSummary(true)
    setSummaryMode('last')
    setEmailSummary('')

    try {
      const response = await fetch('/api/email/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerEmail: selectedConversation.email,
          mode: 'last',
        }),
      })

      const data = await response.json()
      if (data.success && data.summary) {
        setEmailSummary(data.summary)
      }
    } catch {
      // Error summarizing
    } finally {
      setIsGeneratingSummary(false)
      setSummaryMode(null)
    }
  }

  // Download conversation as .txt file
  const handleDownloadConversation = () => {
    if (!selectedConversation || messages.length === 0) return

    const channelLabel = channelConfig[selectedConversation.channel].label
    const lines = [
      `Samtale - ${channelLabel}`,
      `Kontakt: ${selectedConversation.name}`,
      `Eksportert: ${new Date().toLocaleString('nb-NO')}`,
      `Antall meldinger: ${messages.length}`,
      '─'.repeat(50),
      '',
    ]

    for (const msg of messages) {
      const sender = msg.role === 'user' ? 'Kunde' : (msg.isManual ? 'Ansatt' : 'Botsy')
      const time = msg.timestamp.toLocaleString('nb-NO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      lines.push(`[${time}] ${sender}:`)
      lines.push(msg.content)
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `samtale-${selectedConversation.name.replace(/[^a-zA-Z0-9æøåÆØÅ@._-]/g, '_')}-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowMoreMenu(false)
  }

  // Navigate between email suggestions
  const handlePrevSuggestion = () => {
    if (activeSuggestionIdx > 0) {
      const newIdx = activeSuggestionIdx - 1
      setActiveSuggestionIdx(newIdx)
      setEmailReplyBody(emailSuggestions[newIdx])
    }
  }

  const handleNextSuggestion = () => {
    if (activeSuggestionIdx < emailSuggestions.length - 1) {
      const newIdx = activeSuggestionIdx + 1
      setActiveSuggestionIdx(newIdx)
      setEmailReplyBody(emailSuggestions[newIdx])
    }
  }

  // Check if last message in email conversation is inbound
  const isEmailAwaitingReply = selectedConversation?.channel === 'email' &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'user'

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (channelFilter !== 'all' && conv.channel !== channelFilter) return false
    if (showUnreadOnly) {
      const isUnread = conv.isManualMode && conv.lastMessageRole === 'user'
      if (!isUnread) return false
    }
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

  const unreadCount = conversations.filter(c => c.isManualMode && c.lastMessageRole === 'user').length

  const channelConfig = {
    sms: { icon: Phone, color: '#CDFF4D', label: 'SMS' },
    widget: { icon: MessageCircle, color: '#3B82F6', label: 'Widget' },
    messenger: { icon: Facebook, color: '#1877F2', label: 'Messenger' },
    instagram: { icon: Instagram, color: '#E4405F', label: 'Instagram' },
    email: { icon: Mail, color: '#EA4335', label: 'E-post' },
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-4">
      {/* Conversation List */}
      <Card className={`w-full lg:w-80 flex-shrink-0 flex flex-col overflow-hidden ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
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
            {(['all', 'sms', 'widget', 'messenger', 'instagram', 'email'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setChannelFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  channelFilter === filter
                    ? 'bg-botsy-lime/10 text-botsy-lime'
                    : 'bg-white/[0.03] text-[#6B7A94] hover:text-white'
                }`}
              >
                {filter === 'all' ? 'Alle' : filter === 'sms' ? 'SMS' : filter === 'widget' ? 'Widget' : filter === 'messenger' ? 'Messenger' : filter === 'instagram' ? 'Instagram' : 'E-post'}
              </button>
            ))}
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showUnreadOnly
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-white/[0.03] text-[#6B7A94] hover:text-white'
              }`}
            >
              Uleste{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-[#6B7A94]">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
              <button
                onClick={() => setShowExportModal(true)}
                className="p-1.5 text-[#6B7A94] hover:text-botsy-lime transition-colors"
                title="Eksporter samtaler"
              >
                <Download className="h-4 w-4" />
              </button>
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
              // Only show "waiting" state if in manual mode AND customer sent last message
              const isAwaitingReply = conv.isManualMode && conv.lastMessageRole === 'user'

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-4 text-left border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-white/[0.05]' : ''
                  } ${isAwaitingReply ? 'bg-red-500/[0.08] border-l-2 border-l-red-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 ${
                        isAwaitingReply ? 'bg-red-500/20' : 'bg-white/[0.1]'
                      }`}>
                        <ChannelIcon
                          className="h-5 w-5"
                          style={{ color: isAwaitingReply ? '#ef4444' : channelConfig[conv.channel].color }}
                        />
                      </div>
                      {isAwaitingReply && (
                        <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-[#0d1829] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm truncate ${isAwaitingReply ? 'text-red-400' : 'text-white'}`}>
                            {conv.name}
                          </p>
                          {isAwaitingReply && (
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
      <Card className={`flex-1 flex flex-col overflow-hidden ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden p-2 -ml-2 text-[#A8B4C8] hover:text-white hover:bg-white/[0.05] rounded-lg"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
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
                  ) : selectedConversation.channel === 'instagram' ? (
                    <Instagram
                      className="h-5 w-5"
                      style={{ color: channelConfig.instagram.color }}
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
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{selectedConversation.name}</p>
                  <p className="text-[#6B7A94] text-sm flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs flex-shrink-0"
                      style={{
                        borderColor: channelConfig[selectedConversation.channel].color,
                        color: channelConfig[selectedConversation.channel].color,
                      }}
                    >
                      {channelConfig[selectedConversation.channel].label}
                    </Badge>
                    <span className="hidden sm:inline">{selectedConversation.messageCount} meldinger</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedConversation.channel !== 'email' && (
                  <Button
                    variant={manualMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleManualMode}
                    className={manualMode ? 'bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90' : ''}
                  >
                    {manualMode ? (
                      <>
                        <User className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Manuell modus</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Ta over manuelt</span>
                      </>
                    )}
                  </Button>
                )}
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a2236] border border-white/[0.1] rounded-xl shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={handleDownloadConversation}
                        disabled={messages.length === 0}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download className="h-4 w-4" />
                        Last ned samtale
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-auto p-4 space-y-4"
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 text-botsy-lime animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-[#6B7A94] text-sm py-8">
                  Ingen meldinger i denne samtalen
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    showReadReceipt={
                      selectedConversation.channel === 'widget' &&
                      msg.role === 'assistant' &&
                      !!lastReadByCustomer &&
                      idx === messages.length - 1
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Email Reply Panel */}
            {selectedConversation.channel === 'email' && (
              <div className="border-t border-white/[0.06]">
                {/* Summary display */}
                {emailSummary && (
                  <div className="px-4 pt-3 pb-2">
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 text-xs font-medium">Oppsummering</span>
                        <button
                          onClick={() => setEmailSummary('')}
                          className="ml-auto text-[#6B7A94] hover:text-white text-xs"
                        >
                          Lukk
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {emailSummary.split('\n').filter(l => l.trim()).map((line, i) => {
                          const isCustomer = line.trim().startsWith('KUNDE:')
                          const isBusiness = line.trim().startsWith('BEDRIFT:')
                          const text = line.replace(/^(KUNDE:|BEDRIFT:)\s*/, '')
                          if (isCustomer) {
                            return (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-blue-400 font-medium text-xs mt-0.5 shrink-0">Kunde</span>
                                <span className="text-blue-300/90">{text}</span>
                              </div>
                            )
                          }
                          if (isBusiness) {
                            return (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-emerald-400 font-medium text-xs mt-0.5 shrink-0">Bedrift</span>
                                <span className="text-emerald-300/90">{text}</span>
                              </div>
                            )
                          }
                          return <p key={i} className="text-white/70 text-sm">{line}</p>
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* No reply mode selected yet - show action buttons */}
                {!emailReplyMode && isEmailAwaitingReply && (
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleGetEmailSuggestion(false)}
                        disabled={isGeneratingSuggestion}
                        className="bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90"
                      >
                        {isGeneratingSuggestion ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        AI-forslag
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEmailReplyMode('manual')
                          setEmailReplyBody('')
                        }}
                      >
                        <PenLine className="h-4 w-4 mr-1" />
                        Svar manuelt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSummarizeLastEmail}
                        disabled={isGeneratingSummary}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        {isGeneratingSummary && summaryMode === 'last' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <FileText className="h-4 w-4 mr-1" />
                        )}
                        Siste mail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSummarizeEmail}
                        disabled={isGeneratingSummary}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        {isGeneratingSummary && summaryMode === 'conversation' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <FileText className="h-4 w-4 mr-1" />
                        )}
                        Samtalen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reply mode active - show textarea */}
                {emailReplyMode && (
                  <div className="p-4 space-y-3">
                    {/* Suggestion navigation */}
                    {emailReplyMode === 'suggestion' && emailSuggestions.length > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B7A94]">
                            Forslag {activeSuggestionIdx + 1} av {emailSuggestions.length}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={handlePrevSuggestion}
                              disabled={activeSuggestionIdx === 0}
                              className="p-1 rounded text-[#6B7A94] hover:text-white disabled:opacity-30"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleNextSuggestion}
                              disabled={activeSuggestionIdx === emailSuggestions.length - 1}
                              className="p-1 rounded text-[#6B7A94] hover:text-white disabled:opacity-30"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGetEmailSuggestion(true)}
                            disabled={isGeneratingSuggestion}
                            className="text-xs h-7"
                          >
                            {isGeneratingSuggestion ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="h-3 w-3 mr-1" />
                            )}
                            Nytt forslag
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSummarizeLastEmail}
                            disabled={isGeneratingSummary}
                            className="text-xs h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          >
                            {isGeneratingSummary && summaryMode === 'last' ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <FileText className="h-3 w-3 mr-1" />
                            )}
                            Siste mail
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSummarizeEmail}
                            disabled={isGeneratingSummary}
                            className="text-xs h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          >
                            {isGeneratingSummary && summaryMode === 'conversation' ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <FileText className="h-3 w-3 mr-1" />
                            )}
                            Samtalen
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Manual mode header */}
                    {emailReplyMode === 'manual' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-500 flex items-center gap-1">
                          <PenLine className="h-3 w-3" />
                          Manuelt svar
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSummarizeLastEmail}
                            disabled={isGeneratingSummary}
                            className="text-xs h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          >
                            {isGeneratingSummary && summaryMode === 'last' ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <FileText className="h-3 w-3 mr-1" />
                            )}
                            Siste mail
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSummarizeEmail}
                            disabled={isGeneratingSummary}
                            className="text-xs h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          >
                            {isGeneratingSummary && summaryMode === 'conversation' ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <FileText className="h-3 w-3 mr-1" />
                            )}
                            Samtalen
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Loading state for first suggestion */}
                    {isGeneratingSuggestion && emailSuggestions.length === 0 ? (
                      <div className="flex items-center justify-center py-6 text-[#6B7A94]">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span className="text-sm">Genererer AI-forslag...</span>
                      </div>
                    ) : (
                      <textarea
                        value={emailReplyBody}
                        onChange={(e) => setEmailReplyBody(e.target.value)}
                        placeholder="Skriv ditt svar her..."
                        rows={5}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
                        disabled={isSendingEmail}
                      />
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEmailReplyMode(null)
                          setEmailReplyBody('')
                        }}
                        className="text-xs"
                      >
                        Avbryt
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendEmailReply}
                        disabled={isSendingEmail || !emailReplyBody.trim()}
                        className="bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90"
                      >
                        {isSendingEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Send className="h-4 w-4 mr-1" />
                        )}
                        Send svar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already replied / waiting state */}
                {!emailReplyMode && !isEmailAwaitingReply && (
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      <p className="text-[#6B7A94] text-sm w-full text-center mb-2">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Siste e-post er besvart
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSummarizeLastEmail}
                        disabled={isGeneratingSummary}
                        className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        {isGeneratingSummary && summaryMode === 'last' ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <FileText className="h-3 w-3 mr-1" />
                        )}
                        Siste mail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSummarizeEmail}
                        disabled={isGeneratingSummary}
                        className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        {isGeneratingSummary && summaryMode === 'conversation' ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <FileText className="h-3 w-3 mr-1" />
                        )}
                        Samtalen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer typing indicator */}
            {customerTyping && selectedConversation.channel === 'widget' && (
              <div className="px-4 py-2 border-t border-white/[0.06] bg-blue-500/5">
                <div className="flex items-center gap-2 text-blue-400 text-xs">
                  <span>Kunden skriver</span>
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input - Show in manual mode (non-email channels) */}
            {selectedConversation.channel !== 'email' && manualMode && (
              <div className="p-4 border-t border-white/[0.06] bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); sendAgentTyping(); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Skriv et svar..."
                    className="flex-1 h-10 px-4 bg-white/[0.03] border border-amber-500/30 rounded-xl text-white placeholder:text-[#6B7A94] text-base focus:outline-none focus:border-amber-500/50"
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

            {selectedConversation.channel !== 'email' && !manualMode && (
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

      {/* Export Modal */}
      <ExportConversations
        companyId={companyId}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  )
})

// Message Bubble Component
function MessageBubble({ message, showReadReceipt }: { message: ChatMessage; showReadReceipt?: boolean }) {
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
          {showReadReceipt && (
            <span className="ml-1 flex items-center gap-0.5 text-blue-400">
              <CheckCheck className="h-3 w-3" />
              <span>Lest</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Clean up email body for display - remove image placeholders and clean URLs
function cleanEmailBody(body: string): string {
  return body
    // Remove [image: xxx] placeholders
    .replace(/\[image:\s*[^\]]*\]\s*/g, '')
    // Clean <URL> format to just URL
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    // Clean <email> format
    .replace(/<([^>@]+@[^>]+)>/g, '$1')
    // Clean <+phone> format
    .replace(/<(\+?[\d\s]+)>/g, '$1')
    // Remove excessive blank lines (3+ in a row → 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
