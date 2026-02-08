import { NextRequest, NextResponse } from 'next/server'
import { getAllInstagramChats, getInstagramHistory } from '@/lib/instagram-firestore'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

/**
 * GET - Fetch Instagram chats for a company
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
    const senderId = searchParams.get('senderId')

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    // If senderId is provided, fetch messages for that chat
    if (senderId) {
      const messages = await getInstagramHistory(companyId, senderId, 100)
      return NextResponse.json({ success: true, messages })
    }

    // Otherwise, fetch all chats
    const chats = await getAllInstagramChats(companyId)
    return NextResponse.json({ success: true, chats })
  } catch (error) {
    console.error('[API] Error fetching Instagram chats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }
}
