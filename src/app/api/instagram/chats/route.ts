import { NextRequest, NextResponse } from 'next/server'
import { getAllInstagramChats, getInstagramHistory } from '@/lib/instagram-firestore'

/**
 * GET - Fetch Instagram chats for a company
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const senderId = searchParams.get('senderId')

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 })
    }

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
