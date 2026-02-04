/**
 * Cron job to send trial expiring reminder emails
 *
 * This should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions)
 *
 * POST /api/cron/trial-reminders
 * Authorization: Bearer CRON_SECRET
 *
 * Sends emails to users whose trial expires in:
 * - 3 days (first reminder)
 * - 1 day (urgent reminder)
 * - 0 days (final reminder - day of expiration)
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendTrialExpiringEmail } from '@/lib/botsy-emails'
import { queryDocumentsRest, getDocumentRest, updateDocumentRest } from '@/lib/firebase-rest'

const REMINDER_DAYS = [3, 1, 0] // Days before expiration to send reminders

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Trial Reminders] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    console.log('[Trial Reminders] Starting trial reminder job...')

    const results: Array<{
      companyId: string
      email: string
      daysLeft: number
      success: boolean
      error?: string
    }> = []

    // Get all companies with trialing subscriptions
    const trialingCompanies = await queryDocumentsRest(
      'companies',
      'subscriptionStatus',
      'EQUAL',
      'trialing',
      100
    )

    console.log(`[Trial Reminders] Found ${trialingCompanies.length} trialing companies`)

    const now = new Date()

    for (const company of trialingCompanies) {
      const companyData = company.data as Record<string, unknown>
      const companyId = company.id

      try {
        const trialEnd = companyData.subscriptionTrialEnd as string | undefined
        if (!trialEnd) continue

        // Parse trial end date
        const trialEndDate = new Date(trialEnd)
        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Check if we should send a reminder today
        if (!REMINDER_DAYS.includes(daysLeft)) continue

        // Check if we already sent a reminder for this day
        const reminderKey = `trialReminder_${daysLeft}days`
        if (companyData[reminderKey]) {
          console.log(`[Trial Reminders] Already sent ${daysLeft}-day reminder to ${companyId}`)
          continue
        }

        // Get the owner's email from Stripe customer
        const customerId = companyData.stripeCustomerId as string | undefined
        if (!customerId) continue

        const customer = await stripe.customers.retrieve(customerId)
        if (!customer || customer.deleted || !customer.email) {
          console.log(`[Trial Reminders] No email found for company ${companyId}`)
          continue
        }

        // Send the reminder email
        const result = await sendTrialExpiringEmail({
          to: customer.email,
          customerName: customer.name || 'Kunde',
          companyName: (companyData.name as string) || 'Din bedrift',
          daysLeft,
          trialEndDate: trialEndDate.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        })

        results.push({
          companyId,
          email: customer.email,
          daysLeft,
          success: result.success,
          error: result.error,
        })

        // Mark that we sent this reminder
        if (result.success) {
          await updateDocumentRest('companies', companyId, {
            [reminderKey]: new Date(),
          }, [reminderKey])
        }

        console.log(`[Trial Reminders] Sent ${daysLeft}-day reminder to ${customer.email}: ${result.success ? 'success' : result.error}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (err) {
        console.error(`[Trial Reminders] Error processing company ${companyId}:`, err)
        results.push({
          companyId,
          email: 'unknown',
          daysLeft: -1,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`[Trial Reminders] Completed. Sent ${successCount}/${results.length} emails`)

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} of ${results.length} trial reminder emails`,
      results,
    })

  } catch (error) {
    console.error('[Trial Reminders] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process trial reminders' },
      { status: 500 }
    )
  }
}

// Also support GET for testing (but still require auth)
export async function GET(request: NextRequest) {
  return POST(request)
}
