import { NextRequest, NextResponse } from 'next/server'
import {
  getCompaniesWithActiveGmail,
  updateGmailCheckState,
  updateGmailAccessToken,
  saveEmailMessage,
} from '@/lib/email-firestore'
import {
  refreshAccessToken,
  getRecentGmailMessages,
  getGmailMessage,
} from '@/lib/google-oauth'
import { extractEmailAddress } from '@/lib/email'
import { sendEscalationNotifications } from '@/lib/push-notifications'
import { createEscalation } from '@/lib/escalation-firestore'

// Skip automated/noreply senders
const IGNORED_SENDER_PATTERNS = [
  'noreply@',
  'no-reply@',
  'no_reply@',
  'donotreply@',
  'mailer-daemon@',
  'postmaster@',
  'notifications@',
  'notification@',
  'alert@',
  'alerts@',
  'newsletter@',
  'news@',
  'marketing@',
  'promo@',
  'updates@',
  'info@stripe.com',
  'notifications@stripe.com',
  '@email.vippsmobilepay.com',
  '@sendgrid.net',
  '@mailgun.org',
  'calendar-notification@google.com',
]

function isAutomatedSender(email: string): boolean {
  const lower = email.toLowerCase()
  return IGNORED_SENDER_PATTERNS.some(pattern => lower.includes(pattern))
}

/**
 * GET - Cron job to poll Gmail for new emails (every 2 minutes)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companies = await getCompaniesWithActiveGmail()

    if (companies.length === 0) {
      return NextResponse.json({ status: 'ok', processed: 0 })
    }

    let totalNewMessages = 0

    for (const company of companies) {
      try {
        let accessToken = company.credentials.accessToken

        // Refresh token if expired or missing
        if (!accessToken || (company.credentials.expiresAt && company.credentials.expiresAt < Date.now() + 60000)) {
          if (!company.credentials.refreshToken) {
            console.error(`[Gmail Cron] No refresh token for company ${company.companyId}`)
            continue
          }

          try {
            const refreshed = await refreshAccessToken(company.credentials.refreshToken)
            accessToken = refreshed.access_token
            const expiresAt = Date.now() + refreshed.expires_in * 1000

            // Fire-and-forget: update token in Firestore
            updateGmailAccessToken(company.companyId, accessToken, expiresAt).catch(() => {})
          } catch (error) {
            console.error(`[Gmail Cron] Token refresh failed for ${company.companyId}:`, error)
            continue
          }
        }

        if (!accessToken) continue

        // Build time-based query (don't rely on is:unread — emails may be auto-read)
        // Look back from last check time minus 2 min buffer, or 1 hour if first run
        const lastCheckTime = company.lastGmailCheckAt
          ? new Date(company.lastGmailCheckAt).getTime()
          : Date.now() - 3600000
        const afterEpoch = Math.floor((lastCheckTime - 120000) / 1000) // 2 min buffer

        const recentMessages = await getRecentGmailMessages({
          accessToken,
          query: `after:${afterEpoch} is:inbox -from:me`,
          maxResults: 20,
        })

        console.log(`[Gmail Cron] ${company.companyId}: ${recentMessages?.length || 0} unread messages found`)

        if (!recentMessages || recentMessages.length === 0) continue

        // Filter out already processed messages
        const processedIds = new Set(company.processedGmailMessageIds)
        const newMessageIds = recentMessages.filter(m => !processedIds.has(m.id))

        console.log(`[Gmail Cron] ${company.companyId}: ${newMessageIds.length} new (${processedIds.size} already processed)`)

        if (newMessageIds.length === 0) continue

        const updatedProcessedIds = [...company.processedGmailMessageIds]

        for (const msgRef of newMessageIds) {
          try {
            const fullMessage = await getGmailMessage({
              accessToken,
              messageId: msgRef.id,
            })

            // Filter out self-sent and automated messages
            const fromAddress = extractEmailAddress(fullMessage.from)
            if (fromAddress.toLowerCase() === company.emailAddress.toLowerCase() || isAutomatedSender(fromAddress)) {
              updatedProcessedIds.push(msgRef.id)
              continue
            }

            // Save inbound email to Firestore
            await saveEmailMessage(company.companyId, fromAddress, {
              direction: 'inbound',
              from: fromAddress,
              to: company.emailAddress,
              subject: fullMessage.subject,
              body: fullMessage.text || '(Ingen tekstinnhold)',
              timestamp: fullMessage.date,
            })

            const conversationId = `email-${fromAddress.replace(/[.@]/g, '_')}`

            // Create escalation for notification bell (fire-and-forget)
            createEscalation({
              companyId: company.companyId,
              conversationId,
              channel: 'email',
              customerIdentifier: fromAddress,
              customerMessage: fullMessage.subject,
              status: 'pending',
            }).catch(() => {})

            // Send push notification to employees (fire-and-forget)
            sendEscalationNotifications(
              company.companyId,
              fromAddress,
              `E-post: ${fullMessage.subject}`,
              conversationId,
              'email'
            ).catch(() => {})

            updatedProcessedIds.push(msgRef.id)
            totalNewMessages++
          } catch (error) {
            console.error(`[Gmail Cron] Error processing message ${msgRef.id}:`, error)
            // Still mark as processed to avoid retrying broken messages indefinitely
            updatedProcessedIds.push(msgRef.id)
          }
        }

        // Update processed IDs (fire-and-forget)
        updateGmailCheckState(
          company.companyId,
          updatedProcessedIds,
          new Date().toISOString()
        ).catch(() => {})

      } catch (error) {
        console.error(`[Gmail Cron] Error for company ${company.companyId}:`, error)
      }
    }

    return NextResponse.json({
      status: 'ok',
      companiesChecked: companies.length,
      newMessages: totalNewMessages,
    })
  } catch (error) {
    console.error('[Gmail Cron] Error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
