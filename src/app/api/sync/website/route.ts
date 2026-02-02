import { NextRequest, NextResponse } from 'next/server'
import { runWebsiteSync } from '@/lib/knowledge-sync/sync-service'
import { getSyncConfig, saveSyncConfig } from '@/lib/knowledge-sync/firestore'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds

/**
 * POST - Trigger manual website sync
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log(`[Sync API] Starting manual sync for company: ${companyId}`)

    const result = await runWebsiteSync(companyId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Sync API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run sync' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update sync configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, ...config } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    await saveSyncConfig(companyId, config)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Sync API] Error updating config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get sync configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    const config = await getSyncConfig(companyId)

    return NextResponse.json({
      success: true,
      config: config || {
        enabled: false,
        websiteUrl: '',
        syncIntervalHours: 1,
        autoApproveWebsiteFaqs: false,
        notifyOnConflicts: true,
        notifyOnNewFaqs: true,
      },
    })
  } catch (error) {
    console.error('[Sync API] Error getting config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get config' },
      { status: 500 }
    )
  }
}
