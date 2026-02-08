import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getUsersWithDailySummaryEnabled, getAllWidgetChats, getCompany } from '@/lib/firestore'
import { getAllSMSChats } from '@/lib/sms-firestore'
import { getAllMessengerChats } from '@/lib/messenger-firestore'
import { getLeaderboard } from '@/lib/leaderboard-firestore'
import { renderDailySummaryEmail } from '@/emails/DailySummaryEmail'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

const resend = new Resend(process.env.RESEND_API_KEY)

interface DailyStats {
  totalConversations: number
  resolvedByBot: number
  escalatedToHuman: number
  avgResponseTime: string
}

interface EmployeeStats {
  userId: string
  name: string
  points: number
  conversationsHandled: number
}

/**
 * POST - Send daily summary emails
 * Can be called by a cron job (e.g., Vercel Cron)
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if set (for security), otherwise verify user auth
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Cron job - allowed
    } else {
      const user = await verifyAuth(request)
      if (!user) return unauthorizedResponse()
    }

    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Get users who have daily summary enabled
    const users = await getUsersWithDailySummaryEnabled(companyId)

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users have daily summary enabled',
        emailsSent: 0,
      })
    }

    // Summarize yesterday (cron runs in the morning)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const stats = await gatherDailyStats(companyId, yesterday)
    const employeeOfTheDay = await findEmployeeOfTheDay(companyId)
    const insights = generateInsights(stats, employeeOfTheDay)
    const recentEscalations = await getRecentEscalations(companyId, yesterday)

    // Format yesterday's date
    const dateStr = yesterday.toLocaleDateString('nb-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Get company name
    const company = await getCompany(companyId)
    const companyName = company?.businessName || 'Din bedrift'

    let emailsSent = 0
    const errors: string[] = []

    // Send email to each user
    for (const user of users) {
      try {
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://botsy.no'}/admin?settings=notifications`

        const html = renderDailySummaryEmail({
          companyName,
          date: dateStr,
          stats: {
            totalConversations: stats.totalConversations,
            resolvedByBot: stats.resolvedByBot,
            escalatedToHuman: stats.escalatedToHuman,
            avgResponseTime: stats.avgResponseTime,
          },
          employeeOfTheDay: employeeOfTheDay ? {
            name: employeeOfTheDay.name,
            points: employeeOfTheDay.points,
            conversationsHandled: employeeOfTheDay.conversationsHandled,
          } : undefined,
          insights,
          recentEscalations,
          unsubscribeUrl,
        })

        await resend.emails.send({
          from: 'Botsy <noreply@botsy.no>',
          to: user.email,
          subject: `Daglig Oppsummering - ${yesterday.toLocaleDateString('nb-NO')}`,
          html,
        })

        emailsSent++
      } catch (err) {
        console.error(`Failed to send daily summary to ${user.email}:`, err)
        errors.push(user.email)
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Daily Summary] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send daily summaries' },
      { status: 500 }
    )
  }
}

/**
 * Gather statistics for a given day
 */
async function gatherDailyStats(companyId: string, targetDate: Date): Promise<DailyStats> {
  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  let totalConversations = 0
  let escalatedCount = 0
  let totalResponseTime = 0
  let responseCount = 0

  try {
    // Widget chats
    const widgetChats = await getAllWidgetChats(companyId)
    for (const chat of widgetChats) {
      if (chat.lastMessageAt >= dayStart && chat.lastMessageAt <= dayEnd) {
        totalConversations++
        if (chat.isManualMode) {
          escalatedCount++
        }

        // Calculate response time from messages
        if (chat.messages && chat.messages.length >= 2) {
          const userMsgs = chat.messages.filter(m => m.role === 'user')
          const botMsgs = chat.messages.filter(m => m.role === 'assistant')
          if (userMsgs.length > 0 && botMsgs.length > 0) {
            const firstUser = userMsgs[0].timestamp
            const firstBot = botMsgs[0].timestamp
            if (firstBot > firstUser) {
              totalResponseTime += (firstBot.getTime() - firstUser.getTime()) / 1000
              responseCount++
            }
          }
        }
      }
    }

    // SMS chats
    const smsChats = await getAllSMSChats(companyId)
    for (const chat of smsChats) {
      if (chat.lastMessageAt >= dayStart && chat.lastMessageAt <= dayEnd) {
        totalConversations++
      }
    }

    // Messenger chats
    const messengerChats = await getAllMessengerChats(companyId)
    for (const chat of messengerChats) {
      if (chat.lastMessageAt >= dayStart && chat.lastMessageAt <= dayEnd) {
        totalConversations++
        if (chat.isManualMode) {
          escalatedCount++
        }
      }
    }
  } catch (error) {
    console.error('[Daily Summary] Error gathering stats:', error)
  }

  const resolvedByBot = totalConversations > 0
    ? Math.round(((totalConversations - escalatedCount) / totalConversations) * 100)
    : 0

  const escalatedToHuman = totalConversations > 0
    ? Math.round((escalatedCount / totalConversations) * 100)
    : 0

  const avgResponseTime = responseCount > 0
    ? formatResponseTime(totalResponseTime / responseCount)
    : '< 1s'

  return {
    totalConversations,
    resolvedByBot,
    escalatedToHuman,
    avgResponseTime,
  }
}

/**
 * Find the employee with most points today
 */
async function findEmployeeOfTheDay(companyId: string): Promise<EmployeeStats | null> {
  try {
    const leaderboard = await getLeaderboard(companyId, 1)

    if (leaderboard.length === 0) return null

    const top = leaderboard[0]

    // No activity this month — skip employee of the day
    if (top.totalScore === 0) return null

    return {
      userId: top.userId,
      name: top.displayName,
      points: top.totalScore,
      conversationsHandled: top.answeredCustomers,
    }
  } catch (error) {
    console.error('[Daily Summary] Error finding employee of day:', error)
    return null
  }
}

/**
 * Generate insights based on stats
 */
function generateInsights(stats: DailyStats, employee: EmployeeStats | null): string[] {
  const insights: string[] = []

  if (stats.totalConversations > 0) {
    if (stats.resolvedByBot >= 80) {
      insights.push('Botsy håndterte over 80% av samtalene automatisk i går - utmerket!')
    } else if (stats.resolvedByBot >= 60) {
      insights.push('God dag! Botsy håndterte flertallet av samtalene automatisk i går.')
    } else if (stats.resolvedByBot < 40) {
      insights.push('Mange samtaler trengte manuell hjelp i går. Vurder å oppdatere FAQ-ene.')
    }

    if (stats.totalConversations >= 10) {
      insights.push(`${stats.totalConversations} samtaler i går - høy aktivitet!`)
    }
  } else {
    insights.push('Ingen samtaler registrert i går.')
  }

  if (employee && employee.points > 0) {
    insights.push(`${employee.name} var mest aktiv med ${employee.points} poeng.`)
  }

  // Always return at least one insight
  if (insights.length === 0) {
    insights.push('Botsy er klar til å hjelpe kundene dine.')
  }

  return insights
}

/**
 * Get recent escalations from a given day
 */
async function getRecentEscalations(companyId: string, targetDate: Date): Promise<Array<{
  customerName: string
  message: string
  time: string
  channel: string
}>> {
  const escalations: Array<{
    customerName: string
    message: string
    time: string
    channel: string
  }> = []

  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  try {
    // Check widget chats for escalations
    const widgetChats = await getAllWidgetChats(companyId)
    for (const chat of widgetChats) {
      if (chat.isManualMode && chat.lastMessageAt >= dayStart && chat.lastMessageAt <= dayEnd) {
        const lastUserMsg = chat.messages?.filter(m => m.role === 'user').pop()
        escalations.push({
          customerName: `Besøkende ${chat.sessionId.slice(-6)}`,
          message: lastUserMsg?.content.slice(0, 100) || 'Ingen melding',
          time: chat.lastMessageAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
          channel: 'Widget',
        })
      }
    }

    // Check messenger chats for escalations
    const messengerChats = await getAllMessengerChats(companyId)
    for (const chat of messengerChats) {
      if (chat.isManualMode && chat.lastMessageAt >= dayStart && chat.lastMessageAt <= dayEnd) {
        escalations.push({
          customerName: `Facebook ${chat.senderId.slice(-6)}`,
          message: chat.lastMessage?.text.slice(0, 100) || 'Ingen melding',
          time: chat.lastMessageAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
          channel: 'Messenger',
        })
      }
    }
  } catch (error) {
    console.error('[Daily Summary] Error getting escalations:', error)
  }

  // Return only the 5 most recent
  return escalations.slice(0, 5)
}

/**
 * Format response time in human readable format
 */
function formatResponseTime(seconds: number): string {
  if (seconds < 1) return '< 1s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}t`
}
