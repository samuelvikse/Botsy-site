import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getAllWidgetChats, getBusinessProfile } from '@/lib/firestore'
import { getAllSMSChats } from '@/lib/sms-firestore'
import { getAllMessengerChats } from '@/lib/messenger-firestore'
import { getTeamMembers } from '@/lib/membership-firestore'
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
 * POST - Send daily summary to a specific email (for testing / manual trigger)
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const { companyId, email } = await request.json()

    if (!companyId || !email) {
      return NextResponse.json(
        { error: 'companyId and email are required' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

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

    // Get company name from business profile
    let companyName = 'Din bedrift'
    try {
      const profile = await getBusinessProfile(companyId)
      if (profile?.businessName) {
        companyName = profile.businessName
      }
    } catch {
      // Use default
    }

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
      to: email,
      subject: `Daglig Oppsummering - ${today.toLocaleDateString('nb-NO')}`,
      html,
    })

    return NextResponse.json({
      success: true,
      message: `Daily summary sent to ${email}`,
    })
  } catch (error) {
    console.error('[Daily Summary Send Now] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send daily summary' },
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

    // For now, return the first team member with placeholder data
    if (teamMembers.length > 0) {
      const member = teamMembers[0]
      return {
        userId: member.membership.userId,
        name: member.user.displayName || member.user.email,
        points: 0,
        conversationsHandled: 0,
      }
    }

    return null
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
