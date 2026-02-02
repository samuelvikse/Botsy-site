import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getUsersWithDailySummaryEnabled, getAllWidgetChats } from '@/lib/firestore'
import { getAllSMSChats } from '@/lib/sms-firestore'
import { getAllMessengerChats } from '@/lib/messenger-firestore'
import { getTeamMembers } from '@/lib/membership-firestore'
import { renderDailySummaryEmail } from '@/emails/DailySummaryEmail'

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
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if set (for security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Gather statistics for the day
    const stats = await gatherDailyStats(companyId)
    const employeeOfTheDay = await findEmployeeOfTheDay(companyId)
    const insights = generateInsights(stats, employeeOfTheDay)
    const recentEscalations = await getRecentEscalations(companyId)

    // Format date
    const today = new Date()
    const dateStr = today.toLocaleDateString('nb-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Get company name
    const companyName = 'Din bedrift' // TODO: Fetch from company doc

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
          subject: `Daglig Oppsummering - ${today.toLocaleDateString('nb-NO')}`,
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
 * Gather statistics for today
 */
async function gatherDailyStats(companyId: string): Promise<DailyStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalConversations = 0
  let escalatedCount = 0
  let totalResponseTime = 0
  let responseCount = 0

  try {
    // Widget chats
    const widgetChats = await getAllWidgetChats(companyId)
    for (const chat of widgetChats) {
      if (chat.lastMessageAt >= today) {
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
      if (chat.lastMessageAt >= today) {
        totalConversations++
      }
    }

    // Messenger chats
    const messengerChats = await getAllMessengerChats(companyId)
    for (const chat of messengerChats) {
      if (chat.lastMessageAt >= today) {
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
    const teamMembers = await getTeamMembers(companyId)

    if (teamMembers.length === 0) return null

    // For now, we'll use a simple calculation based on conversations handled
    // In the future, this could be based on actual points from a leaderboard system
    let bestEmployee: EmployeeStats | null = null

    // TODO: Implement actual points tracking
    // For now, return the first team member with placeholder data
    if (teamMembers.length > 0) {
      const member = teamMembers[0]
      bestEmployee = {
        userId: member.membership.userId,
        name: member.user.displayName || member.user.email,
        points: 0, // Would come from leaderboard
        conversationsHandled: 0, // Would come from tracking
      }
    }

    return bestEmployee
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
      insights.push('Botsy håndterte over 80% av samtalene automatisk i dag - utmerket!')
    } else if (stats.resolvedByBot >= 60) {
      insights.push('God dag! Botsy håndterte flertallet av samtalene automatisk.')
    } else if (stats.resolvedByBot < 40) {
      insights.push('Mange samtaler trengte manuell hjelp i dag. Vurder å oppdatere FAQ-ene.')
    }

    if (stats.totalConversations >= 10) {
      insights.push(`${stats.totalConversations} samtaler i dag - høy aktivitet!`)
    }
  } else {
    insights.push('Ingen samtaler registrert i dag.')
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
 * Get recent escalations from today
 */
async function getRecentEscalations(companyId: string): Promise<Array<{
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // Check widget chats for escalations
    const widgetChats = await getAllWidgetChats(companyId)
    for (const chat of widgetChats) {
      if (chat.isManualMode && chat.lastMessageAt >= today) {
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
      if (chat.isManualMode && chat.lastMessageAt >= today) {
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
