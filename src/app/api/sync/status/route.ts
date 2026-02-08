import { NextRequest, NextResponse } from 'next/server'
import { getRecentSyncJobs, getSyncJob, getSyncConfig, getPendingConflictsCount } from '@/lib/knowledge-sync/firestore'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

/**
 * GET - Get sync status and recent jobs
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const jobId = searchParams.get('jobId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    // If specific job requested
    if (jobId) {
      const job = await getSyncJob(companyId, jobId)
      return NextResponse.json({
        success: true,
        job,
      })
    }

    // Get config and recent jobs
    const [config, recentJobs, pendingConflicts] = await Promise.all([
      getSyncConfig(companyId),
      getRecentSyncJobs(companyId, 10),
      getPendingConflictsCount(companyId),
    ])

    return NextResponse.json({
      success: true,
      config: config || { enabled: false },
      recentJobs,
      pendingConflicts,
      lastSync: config?.lastSyncAt || null,
    })
  } catch (error) {
    console.error('[Sync Status API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
