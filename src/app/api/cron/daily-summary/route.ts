import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

/**
 * GET - Cron job endpoint for sending daily summaries to all companies
 * Called by Vercel Cron at 08:00 every day
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
    }

    // Get all companies
    const companiesRef = collection(db, 'companies')
    const companiesSnapshot = await getDocs(companiesRef)

    const results: Array<{
      companyId: string
      emailsSent: number
      error?: string
    }> = []

    // Process each company
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id

      try {
        // Call the daily summary API for this company
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'https://botsy.no'}/api/notifications/daily-summary`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cronSecret}`,
            },
            body: JSON.stringify({ companyId }),
          }
        )

        const data = await response.json()

        results.push({
          companyId,
          emailsSent: data.emailsSent || 0,
          error: data.error,
        })
      } catch (err) {
        results.push({
          companyId,
          emailsSent: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const totalEmailsSent = results.reduce((sum, r) => sum + r.emailsSent, 0)
    const companiesProcessed = results.length
    const errors = results.filter(r => r.error).length

    console.log(`[Daily Summary Cron] Processed ${companiesProcessed} companies, sent ${totalEmailsSent} emails, ${errors} errors`)

    return NextResponse.json({
      success: true,
      companiesProcessed,
      totalEmailsSent,
      errors,
      details: results,
    })
  } catch (error) {
    console.error('[Daily Summary Cron] Error:', error)
    return NextResponse.json(
      { error: 'Failed to run daily summary cron' },
      { status: 500 }
    )
  }
}
