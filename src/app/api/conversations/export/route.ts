/**
 * API endpoint for exporting conversations
 * GET /api/conversations/export?companyId=xxx&format=csv|json&startDate=2024-01-01&endDate=2024-01-31
 *
 * Exports all conversations within a date range with their messages and metadata.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { verifyIdToken } from '@/lib/auth-server'
import { timestampToDate } from '@/lib/excel-export'

interface ConversationExport {
  id: string
  channel: 'sms' | 'widget' | 'messenger' | 'instagram' | 'email'
  customerIdentifier: string
  startedAt: Date
  lastMessageAt: Date
  messageCount: number
  durationMinutes: number
  isManualMode: boolean
  messages: MessageExport[]
}

interface MessageExport {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isManual?: boolean
}

// Convert to CSV format
function conversationsToCSV(conversations: ConversationExport[]): string {
  const lines: string[] = []

  // Header
  lines.push('Conversation ID,Channel,Customer,Started At,Last Message At,Duration (min),Message Count,Manual Mode,Message Role,Message Content,Message Time,Is Manual')

  conversations.forEach(conv => {
    if (conv.messages.length === 0) {
      // Conversation with no messages
      lines.push([
        escapeCSV(conv.id),
        escapeCSV(conv.channel),
        escapeCSV(conv.customerIdentifier),
        formatDateForCSV(conv.startedAt),
        formatDateForCSV(conv.lastMessageAt),
        conv.durationMinutes.toString(),
        conv.messageCount.toString(),
        conv.isManualMode ? 'Ja' : 'Nei',
        '',
        '',
        '',
        '',
      ].join(','))
    } else {
      // One row per message
      conv.messages.forEach((msg, index) => {
        lines.push([
          index === 0 ? escapeCSV(conv.id) : '',
          index === 0 ? escapeCSV(conv.channel) : '',
          index === 0 ? escapeCSV(conv.customerIdentifier) : '',
          index === 0 ? formatDateForCSV(conv.startedAt) : '',
          index === 0 ? formatDateForCSV(conv.lastMessageAt) : '',
          index === 0 ? conv.durationMinutes.toString() : '',
          index === 0 ? conv.messageCount.toString() : '',
          index === 0 ? (conv.isManualMode ? 'Ja' : 'Nei') : '',
          msg.role === 'user' ? 'Kunde' : 'Botsy',
          escapeCSV(msg.content),
          formatDateForCSV(msg.timestamp),
          msg.isManual ? 'Ja' : 'Nei',
        ].join(','))
      })
    }
  })

  return lines.join('\n')
}

function escapeCSV(value: string): string {
  if (!value) return ''
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  const escaped = value.replace(/"/g, '""')
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    return `"${escaped}"`
  }
  return escaped
}

function formatDateForCSV(date: Date): string {
  return date.toLocaleString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Channel display names for Norwegian export
const channelNames: Record<string, string> = {
  sms: 'SMS',
  widget: 'Widget',
  email: 'E-post',
  messenger: 'Messenger',
  instagram: 'Instagram',
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Ugyldig autentisering' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) {
      return NextResponse.json({ error: 'Ugyldig token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const format = searchParams.get('format') || 'json'
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId er påkrevd' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database ikke initialisert' }, { status: 500 })
    }

    // Parse date range
    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    startDate.setHours(0, 0, 0, 0)

    const endDate = endDateStr ? new Date(endDateStr) : new Date()
    endDate.setHours(23, 59, 59, 999)

    const conversations: ConversationExport[] = []

    // Helper to calculate duration in minutes
    const calculateDuration = (messages: MessageExport[]): number => {
      if (messages.length < 2) return 0
      const timestamps = messages.map(m => m.timestamp.getTime())
      const minTime = Math.min(...timestamps)
      const maxTime = Math.max(...timestamps)
      return Math.round((maxTime - minTime) / 60000)
    }

    // Fetch SMS conversations
    try {
      const smsChatsRef = collection(db, 'companies', companyId, 'smsChats')
      const smsSnapshot = await getDocs(smsChatsRef)

      smsSnapshot.forEach(doc => {
        const data = doc.data()
        const messages: MessageExport[] = (data.messages || []).map((msg: { direction: string; body: string; timestamp: unknown }) => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.body || '',
          timestamp: timestampToDate(msg.timestamp),
          isManual: false,
        }))

        const lastMessageAt = timestampToDate(data.lastMessageAt)
        const firstMessageAt = messages.length > 0 ? messages[0].timestamp : lastMessageAt

        if (lastMessageAt >= startDate && firstMessageAt <= endDate) {
          conversations.push({
            id: `sms-${doc.id}`,
            channel: 'sms',
            customerIdentifier: data.customerPhone || doc.id,
            startedAt: firstMessageAt,
            lastMessageAt,
            messageCount: messages.length,
            durationMinutes: calculateDuration(messages),
            isManualMode: false,
            messages,
          })
        }
      })
    } catch (error) {
      console.error('[Export] Error fetching SMS chats:', error)
    }

    // Fetch Widget conversations
    try {
      const widgetChatsRef = collection(db, 'companies', companyId, 'customerChats')
      const widgetSnapshot = await getDocs(widgetChatsRef)

      widgetSnapshot.forEach(doc => {
        const data = doc.data()
        const messages: MessageExport[] = (data.messages || []).map((msg: { role: string; content: string; timestamp?: { toDate?: () => Date }; isManual?: boolean }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content || '',
          timestamp: msg.timestamp?.toDate?.() || new Date(),
          isManual: msg.isManual || false,
        }))

        const lastMessageAt = data.updatedAt?.toDate?.() || new Date()
        const firstMessageAt = data.createdAt?.toDate?.() || (messages.length > 0 ? messages[0].timestamp : lastMessageAt)

        if (lastMessageAt >= startDate && firstMessageAt <= endDate) {
          conversations.push({
            id: `widget-${doc.id}`,
            channel: 'widget',
            customerIdentifier: `Besokende ${doc.id.slice(-6)}`,
            startedAt: firstMessageAt,
            lastMessageAt,
            messageCount: messages.length,
            durationMinutes: calculateDuration(messages),
            isManualMode: data.isManualMode || false,
            messages,
          })
        }
      })
    } catch (error) {
      console.error('[Export] Error fetching widget chats:', error)
    }

    // Fetch Messenger conversations
    try {
      const messengerChatsRef = collection(db, 'companies', companyId, 'messengerChats')
      const messengerSnapshot = await getDocs(messengerChatsRef)

      messengerSnapshot.forEach(doc => {
        const data = doc.data()
        const messages: MessageExport[] = (data.messages || []).map((msg: { direction: string; text: string; timestamp: unknown; isManual?: boolean }) => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.text || '',
          timestamp: timestampToDate(msg.timestamp),
          isManual: msg.isManual || false,
        }))

        const lastMessageAt = timestampToDate(data.lastMessageAt || data.updatedAt)
        const firstMessageAt = data.createdAt ? timestampToDate(data.createdAt) : (messages.length > 0 ? messages[0].timestamp : lastMessageAt)

        if (lastMessageAt >= startDate && firstMessageAt <= endDate) {
          conversations.push({
            id: `messenger-${doc.id}`,
            channel: 'messenger',
            customerIdentifier: `Messenger ${doc.id.slice(-6)}`,
            startedAt: firstMessageAt,
            lastMessageAt,
            messageCount: messages.length,
            durationMinutes: calculateDuration(messages),
            isManualMode: data.isManualMode || false,
            messages,
          })
        }
      })
    } catch (error) {
      console.error('[Export] Error fetching Messenger chats:', error)
    }

    // Fetch Instagram conversations
    try {
      const instagramChatsRef = collection(db, 'companies', companyId, 'instagramChats')
      const instagramSnapshot = await getDocs(instagramChatsRef)

      instagramSnapshot.forEach(doc => {
        const data = doc.data()
        const messages: MessageExport[] = (data.messages || []).map((msg: { direction: string; text: string; timestamp: unknown; isManual?: boolean }) => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.text || '',
          timestamp: timestampToDate(msg.timestamp),
          isManual: msg.isManual || false,
        }))

        const lastMessageAt = timestampToDate(data.lastMessageAt || data.updatedAt)
        const firstMessageAt = data.createdAt ? timestampToDate(data.createdAt) : (messages.length > 0 ? messages[0].timestamp : lastMessageAt)

        if (lastMessageAt >= startDate && firstMessageAt <= endDate) {
          conversations.push({
            id: `instagram-${doc.id}`,
            channel: 'instagram',
            customerIdentifier: `Instagram ${doc.id.slice(-6)}`,
            startedAt: firstMessageAt,
            lastMessageAt,
            messageCount: messages.length,
            durationMinutes: calculateDuration(messages),
            isManualMode: data.isManualMode || false,
            messages,
          })
        }
      })
    } catch (error) {
      console.error('[Export] Error fetching Instagram chats:', error)
    }

    // Fetch Email conversations
    try {
      const emailChatsRef = collection(db, 'companies', companyId, 'emailChats')
      const emailSnapshot = await getDocs(emailChatsRef)

      emailSnapshot.forEach(doc => {
        const data = doc.data()
        const messages: MessageExport[] = (data.messages || []).map((msg: { direction: string; subject?: string; body: string; timestamp?: unknown; receivedAt?: unknown }) => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.subject ? `${msg.subject}: ${msg.body}` : msg.body || '',
          timestamp: timestampToDate(msg.timestamp || msg.receivedAt),
          isManual: false,
        }))

        const lastMessageAt = timestampToDate(data.lastMessageAt)
        const firstMessageAt = messages.length > 0 ? messages[0].timestamp : lastMessageAt

        if (lastMessageAt >= startDate && firstMessageAt <= endDate) {
          conversations.push({
            id: `email-${doc.id}`,
            channel: 'email',
            customerIdentifier: data.customerEmail || doc.id,
            startedAt: firstMessageAt,
            lastMessageAt,
            messageCount: messages.length,
            durationMinutes: calculateDuration(messages),
            isManualMode: false,
            messages,
          })
        }
      })
    } catch (error) {
      console.error('[Export] Error fetching email chats:', error)
    }

    // Sort by last message date (most recent first)
    conversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

    // Format the date range for filename
    const dateRangeStr = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`

    if (format === 'csv') {
      const csv = conversationsToCSV(conversations)
      const filename = `botsy-samtaler-${dateRangeStr}.csv`

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      // JSON format with ISO dates for better compatibility
      const jsonExport = {
        exportedAt: new Date().toISOString(),
        companyId,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        totalConversations: conversations.length,
        totalMessages: conversations.reduce((sum, c) => sum + c.messageCount, 0),
        conversations: conversations.map(conv => ({
          ...conv,
          channelName: channelNames[conv.channel] || conv.channel,
          startedAt: conv.startedAt.toISOString(),
          lastMessageAt: conv.lastMessageAt.toISOString(),
          messages: conv.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString(),
          })),
        })),
      }

      const filename = `botsy-samtaler-${dateRangeStr}.json`

      return new NextResponse(JSON.stringify(jsonExport, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error) {
    console.error('[Export] Error exporting conversations:', error)
    return NextResponse.json({ error: 'Kunne ikke eksportere samtaler' }, { status: 500 })
  }
}
