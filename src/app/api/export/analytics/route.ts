import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateAnalyticsExcel, timestampToDate } from '@/lib/excel-export'

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  const period = request.nextUrl.searchParams.get('period') || '30' // days

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
  }

  try {
    const periodDays = parseInt(period, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)
    startDate.setHours(0, 0, 0, 0)

    // Initialize counters
    let smsCount = 0
    let widgetCount = 0
    let emailCount = 0
    let messengerCount = 0
    let totalMessages = 0

    // Daily stats map
    const dailyStatsMap: Map<string, { conversations: number; messages: number }> = new Map()

    // Initialize daily stats for the period
    for (let i = 0; i <= periodDays; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dailyStatsMap.set(dateStr, { conversations: 0, messages: 0 })
    }

    // Helper to add to daily stats
    const addToDailyStats = (date: Date, messages: number) => {
      const dateStr = date.toISOString().split('T')[0]
      const existing = dailyStatsMap.get(dateStr)
      if (existing) {
        existing.conversations++
        existing.messages += messages
      }
    }

    // Get SMS stats
    const smsChatsRef = collection(db, 'companies', companyId, 'smsChats')
    const smsChatsSnap = await getDocs(smsChatsRef)

    smsChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []
      const lastMessageAt = timestampToDate(data.lastMessageAt)

      if (lastMessageAt >= startDate) {
        smsCount++
        totalMessages += messages.length
        addToDailyStats(lastMessageAt, messages.length)
      }
    })

    // Get Widget stats
    const widgetChatsRef = collection(db, 'companies', companyId, 'customerChats')
    const widgetChatsSnap = await getDocs(widgetChatsRef)

    widgetChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []
      const updatedAt = timestampToDate(data.updatedAt)

      if (updatedAt >= startDate) {
        widgetCount++
        totalMessages += messages.length
        addToDailyStats(updatedAt, messages.length)
      }
    })

    // Get Email stats
    const emailChatsRef = collection(db, 'companies', companyId, 'emailChats')
    const emailChatsSnap = await getDocs(emailChatsRef)

    emailChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []
      const lastMessageAt = timestampToDate(data.lastMessageAt)

      if (lastMessageAt >= startDate) {
        emailCount++
        totalMessages += messages.length
        addToDailyStats(lastMessageAt, messages.length)
      }
    })

    // Get Messenger stats
    const messengerChatsRef = collection(db, 'companies', companyId, 'messengerChats')
    const messengerChatsSnap = await getDocs(messengerChatsRef)

    messengerChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []
      const lastMessageAt = timestampToDate(data.lastMessageAt || data.updatedAt)

      if (lastMessageAt >= startDate) {
        messengerCount++
        totalMessages += messages.length
        addToDailyStats(lastMessageAt, messages.length)
      }
    })

    const totalConversations = smsCount + widgetCount + emailCount + messengerCount
    const avgMessagesPerConversation = totalConversations > 0
      ? totalMessages / totalConversations
      : 0

    // Prepare analytics data
    const analytics = {
      period: `Siste ${periodDays} dager`,
      totalConversations,
      totalMessages,
      smsCount,
      widgetCount,
      emailCount,
      messengerCount,
      avgMessagesPerConversation,
    }

    // Convert daily stats map to array
    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('nb-NO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        conversations: stats.conversations,
        messages: stats.messages,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Channel breakdown
    const channelBreakdown = [
      {
        channel: 'SMS',
        count: smsCount,
        percentage: totalConversations > 0 ? Math.round((smsCount / totalConversations) * 100) : 0,
      },
      {
        channel: 'Widget',
        count: widgetCount,
        percentage: totalConversations > 0 ? Math.round((widgetCount / totalConversations) * 100) : 0,
      },
      {
        channel: 'E-post',
        count: emailCount,
        percentage: totalConversations > 0 ? Math.round((emailCount / totalConversations) * 100) : 0,
      },
      {
        channel: 'Messenger',
        count: messengerCount,
        percentage: totalConversations > 0 ? Math.round((messengerCount / totalConversations) * 100) : 0,
      },
    ]

    // Generate Excel file
    const excelBuffer = await generateAnalyticsExcel(analytics, dailyStats, channelBreakdown)

    // Return as downloadable file
    const filename = `botsy-analyse-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating analytics export:', error)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
