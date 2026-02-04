/**
 * Cron job to send weekly summary emails
 *
 * This should be called every Monday by a cron service (e.g., Vercel Cron, GitHub Actions)
 *
 * POST /api/cron/weekly-summary
 * Authorization: Bearer CRON_SECRET
 *
 * Sends weekly summary emails to all active companies with the past week's statistics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { queryDocumentsRest, getDocumentRest } from '@/lib/firebase-rest'
import { sendWeeklySummaryEmail } from '@/lib/botsy-emails'
import { parseFirestoreFields } from '@/lib/firestore-utils'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// Get the week number of a date
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Format date range for the week
function getWeekDateRange(date: Date): string {
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - date.getDay() - 6) // Previous Monday

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6) // Previous Sunday

  const formatDate = (d: Date) => d.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
  })

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.getDate()}. - ${formatDate(weekEnd)} ${weekEnd.getFullYear()}`
  }

  return `${formatDate(weekStart)} - ${formatDate(weekEnd)} ${weekEnd.getFullYear()}`
}

// Get stats for a company for the past week
async function getCompanyWeeklyStats(companyId: string): Promise<{
  totalConversations: number
  conversationsChange: number
  resolvedByBot: number
  resolvedByBotChange: number
  escalatedToHuman: number
  avgResponseTime: string
  customerSatisfaction?: number
}> {
  // Default stats if we can't fetch real data
  // In production, you would query your conversations/analytics collection
  const defaultStats = {
    totalConversations: 0,
    conversationsChange: 0,
    resolvedByBot: 0,
    resolvedByBotChange: 0,
    escalatedToHuman: 0,
    avgResponseTime: '< 1 sek',
    customerSatisfaction: undefined,
  }

  try {
    // Query conversations from the past week
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // This is a simplified query - in production you'd have proper analytics
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'conversations' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'companyId' },
                  op: 'EQUAL',
                  value: { stringValue: companyId },
                },
              },
            ],
          },
        },
        limit: 1000,
      },
    }

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}:runQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody),
      }
    )

    if (!response.ok) {
      return defaultStats
    }

    const data = await response.json()
    const conversations = data
      .filter((item: { document?: unknown }) => item.document)
      .map((item: { document: { fields: Record<string, unknown> } }) => parseFirestoreFields(item.document.fields))

    // Calculate stats
    const thisWeek = conversations.filter((c: Record<string, unknown>) => {
      const createdAt = new Date(c.createdAt as string)
      return createdAt >= weekAgo
    })

    const lastWeek = conversations.filter((c: Record<string, unknown>) => {
      const createdAt = new Date(c.createdAt as string)
      return createdAt >= twoWeeksAgo && createdAt < weekAgo
    })

    const totalConversations = thisWeek.length
    const lastWeekTotal = lastWeek.length
    const conversationsChange = lastWeekTotal > 0
      ? Math.round(((totalConversations - lastWeekTotal) / lastWeekTotal) * 100)
      : 0

    const resolvedByBotCount = thisWeek.filter((c: Record<string, unknown>) => c.resolvedByBot).length
    const resolvedByBot = totalConversations > 0
      ? Math.round((resolvedByBotCount / totalConversations) * 100)
      : 0

    const escalatedCount = thisWeek.filter((c: Record<string, unknown>) => c.escalated).length
    const escalatedToHuman = totalConversations > 0
      ? Math.round((escalatedCount / totalConversations) * 100)
      : 0

    return {
      totalConversations,
      conversationsChange,
      resolvedByBot,
      resolvedByBotChange: 0, // Would need historical data
      escalatedToHuman,
      avgResponseTime: '< 1 sek',
      customerSatisfaction: undefined,
    }
  } catch (error) {
    console.error(`[Weekly Summary] Error fetching stats for ${companyId}:`, error)
    return defaultStats
  }
}

// Get top performers for a company
async function getTopPerformers(companyId: string): Promise<Array<{
  name: string
  points: number
  conversationsHandled: number
  avatarUrl?: string
}>> {
  try {
    // Query leaderboard
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'leaderboard' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'companyId' },
                  op: 'EQUAL',
                  value: { stringValue: companyId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'month' },
                  op: 'EQUAL',
                  value: { integerValue: month.toString() },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'year' },
                  op: 'EQUAL',
                  value: { integerValue: year.toString() },
                },
              },
            ],
          },
        },
        orderBy: [{ field: { fieldPath: 'totalScore' }, direction: 'DESCENDING' }],
        limit: 3,
      },
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data
      .filter((item: { document?: unknown }) => item.document)
      .map((item: { document: { fields: Record<string, unknown> } }) => {
        const parsed = parseFirestoreFields(item.document.fields)
        return {
          name: (parsed.displayName as string) || 'Ukjent',
          points: (parsed.totalScore as number) || 0,
          conversationsHandled: (parsed.answeredCustomers as number) || 0,
          avatarUrl: parsed.avatarUrl as string | undefined,
        }
      })
  } catch (error) {
    console.error(`[Weekly Summary] Error fetching top performers for ${companyId}:`, error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Weekly Summary] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Weekly Summary] Starting weekly summary job...')

    const now = new Date()
    const weekNumber = getWeekNumber(now) - 1 // Previous week
    const weekDateRange = getWeekDateRange(now)

    const results: Array<{
      companyId: string
      email: string
      success: boolean
      error?: string
    }> = []

    // Get all active companies (query both statuses separately)
    const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
      queryDocumentsRest('companies', 'subscriptionStatus', 'EQUAL', 'active', 100),
      queryDocumentsRest('companies', 'subscriptionStatus', 'EQUAL', 'trialing', 100),
    ])
    const activeCompanies = [...activeSubscriptions, ...trialingSubscriptions]

    console.log(`[Weekly Summary] Found ${activeCompanies.length} active companies`)

    for (const company of activeCompanies) {
      const companyData = company.data as Record<string, unknown>
      const companyId = company.id

      // Check if company has opted out of weekly emails
      if (companyData.weeklyEmailsDisabled) {
        console.log(`[Weekly Summary] Skipping ${companyId} - emails disabled`)
        continue
      }

      try {
        // Get the owner's email
        const ownerId = companyData.ownerId as string
        if (!ownerId) continue

        const ownerDoc = await getDocumentRest('users', ownerId)
        if (!ownerDoc || !ownerDoc.email) continue

        // Get stats and top performers
        const [stats, topPerformers] = await Promise.all([
          getCompanyWeeklyStats(companyId),
          getTopPerformers(companyId),
        ])

        // Skip if no activity
        if (stats.totalConversations === 0 && topPerformers.length === 0) {
          console.log(`[Weekly Summary] Skipping ${companyId} - no activity`)
          continue
        }

        // Generate insights based on stats
        const insights: string[] = []

        if (stats.conversationsChange > 20) {
          insights.push(`Antall henvendelser økte med ${stats.conversationsChange}% denne uken. Flott at flere kunder tar kontakt!`)
        } else if (stats.conversationsChange < -20) {
          insights.push(`Antall henvendelser gikk ned med ${Math.abs(stats.conversationsChange)}% denne uken.`)
        }

        if (stats.resolvedByBot >= 80) {
          insights.push('Chatboten løser over 80% av henvendelsene automatisk - fantastisk effektivitet!')
        } else if (stats.resolvedByBot < 50 && stats.totalConversations > 10) {
          insights.push('Vurder å oppdatere chatbotens treningsdata for å øke automatisk løsningsrate.')
        }

        if (stats.escalatedToHuman > 30) {
          insights.push('Mange henvendelser eskaleres til mennesker. Se gjennom de vanligste spørsmålene for å forbedre chatboten.')
        }

        // Send the email
        const result = await sendWeeklySummaryEmail({
          to: ownerDoc.email as string,
          recipientName: (ownerDoc.displayName as string) || 'Bruker',
          companyName: (companyData.name as string) || 'Din bedrift',
          weekNumber,
          weekDateRange,
          stats,
          topPerformers,
          insights: insights.slice(0, 3), // Max 3 insights
        })

        results.push({
          companyId,
          email: ownerDoc.email as string,
          success: result.success,
          error: result.error,
        })

        console.log(`[Weekly Summary] Sent email to ${ownerDoc.email}: ${result.success ? 'success' : result.error}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (err) {
        console.error(`[Weekly Summary] Error processing company ${companyId}:`, err)
        results.push({
          companyId,
          email: 'unknown',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`[Weekly Summary] Completed. Sent ${successCount}/${results.length} emails`)

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} of ${results.length} weekly summary emails`,
      weekNumber,
      weekDateRange,
      results,
    })

  } catch (error) {
    console.error('[Weekly Summary] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process weekly summaries' },
      { status: 500 }
    )
  }
}

// Also support GET for testing (but still require auth)
export async function GET(request: NextRequest) {
  return POST(request)
}
