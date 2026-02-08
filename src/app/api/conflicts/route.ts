import { NextRequest, NextResponse } from 'next/server'
import { getConflicts, getConflict, resolveConflict } from '@/lib/knowledge-sync/firestore'
import { updateFAQ, addFAQ } from '@/lib/firestore'
import type { ConflictStatus } from '@/lib/knowledge-sync/types'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

/**
 * GET - Get all conflicts for a company
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
    const conflictId = searchParams.get('conflictId')
    const status = searchParams.get('status') as ConflictStatus | null

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    // Get specific conflict
    if (conflictId) {
      const conflict = await getConflict(companyId, conflictId)
      return NextResponse.json({
        success: true,
        conflict,
      })
    }

    // Get all conflicts (optionally filtered by status)
    const conflicts = await getConflicts(companyId, status || undefined)

    return NextResponse.json({
      success: true,
      conflicts,
      pendingCount: conflicts.filter(c => c.status === 'pending').length,
    })
  } catch (error) {
    console.error('[Conflicts API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get conflicts' },
      { status: 500 }
    )
  }
}

/**
 * POST - Resolve a conflict
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { companyId, conflictId, resolution, userId, note } = body

    if (!companyId || !conflictId || !resolution) {
      return NextResponse.json(
        { success: false, error: 'companyId, conflictId, and resolution are required' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    // Get the conflict
    const conflict = await getConflict(companyId, conflictId)
    if (!conflict) {
      return NextResponse.json(
        { success: false, error: 'Conflict not found' },
        { status: 404 }
      )
    }

    // Handle different resolutions
    let status: ConflictStatus

    switch (resolution) {
      case 'keep_current':
        // Keep the current FAQ, ignore website version
        status = 'resolved_keep_current'
        break

      case 'use_website':
        // Update FAQ with website version
        await updateFAQ(companyId, conflict.faqId, {
          question: conflict.websiteQuestion,
          answer: conflict.websiteAnswer,
        })
        status = 'resolved_use_website'
        break

      case 'merge':
        // Merge answers (keep current question, combine answers)
        const mergedAnswer = `${conflict.currentAnswer}\n\n---\n\n${conflict.websiteAnswer}`
        await updateFAQ(companyId, conflict.faqId, {
          answer: mergedAnswer,
        })
        status = 'resolved_merged'
        break

      case 'keep_both':
        // Keep existing FAQ AND create new FAQ from website version
        await addFAQ(companyId, {
          id: `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          question: conflict.websiteQuestion,
          answer: conflict.websiteAnswer,
          source: 'website',
          confirmed: true,
        })
        status = 'resolved_keep_both'
        break

      case 'dismiss':
        // Just dismiss without action
        status = 'dismissed'
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid resolution type' },
          { status: 400 }
        )
    }

    // Update conflict status
    await resolveConflict(companyId, conflictId, {
      status,
      resolvedBy: userId || 'unknown',
      resolutionNote: note,
    })

    return NextResponse.json({
      success: true,
      resolution: status,
    })
  } catch (error) {
    console.error('[Conflicts API] Error resolving:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve conflict' },
      { status: 500 }
    )
  }
}
