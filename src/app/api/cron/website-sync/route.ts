import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { runWebsiteSync } from '@/lib/knowledge-sync/sync-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for processing all companies

/**
 * GET - Cron job endpoint for website sync
 * Runs every hour to sync all companies with enabled website sync
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

    console.log('[Website Sync Cron] Starting hourly sync...')

    // Find all companies with sync enabled
    // We need to query companies that have syncConfig.website.enabled = true
    const companiesRef = collection(db, 'companies')
    const companiesSnapshot = await getDocs(companiesRef)

    const results: Array<{
      companyId: string
      success: boolean
      newFaqs?: number
      conflicts?: number
      error?: string
    }> = []

    // Process each company
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id

      try {
        // Check if sync is enabled for this company
        const syncConfigRef = collection(db, 'companies', companyId, 'syncConfig')
        const syncConfigSnap = await getDocs(syncConfigRef)

        let syncEnabled = false
        let websiteUrl = ''

        syncConfigSnap.forEach(doc => {
          const data = doc.data()
          if (data.enabled && data.websiteUrl) {
            syncEnabled = true
            websiteUrl = data.websiteUrl
          }
        })

        if (!syncEnabled) {
          continue // Skip companies without sync enabled
        }

        console.log(`[Website Sync Cron] Syncing company: ${companyId} (${websiteUrl})`)

        const result = await runWebsiteSync(companyId)

        results.push({
          companyId,
          success: result.success,
          newFaqs: result.newFaqsCreated,
          conflicts: result.conflictsCreated,
          error: result.errors.length > 0 ? result.errors[0] : undefined,
        })

        // Small delay between companies to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (err) {
        results.push({
          companyId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    const totalNewFaqs = results.reduce((sum, r) => sum + (r.newFaqs || 0), 0)
    const totalConflicts = results.reduce((sum, r) => sum + (r.conflicts || 0), 0)

    console.log(`[Website Sync Cron] Completed: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      companiesProcessed: results.length,
      successCount,
      failCount,
      totalNewFaqs,
      totalConflicts,
      details: results,
    })
  } catch (error) {
    console.error('[Website Sync Cron] Error:', error)
    return NextResponse.json(
      { error: 'Failed to run website sync cron' },
      { status: 500 }
    )
  }
}
