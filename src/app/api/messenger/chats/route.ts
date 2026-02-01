import { NextRequest, NextResponse } from 'next/server'
import { getAllMessengerChats, getMessengerHistory } from '@/lib/messenger-firestore'

/**
 * GET - Fetch Messenger chats for a company
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
      const messages = await getMessengerHistory(companyId, senderId, 100)
      console.log('[API] Messenger messages:', JSON.stringify(messages, null, 2))
      return NextResponse.json({ success: true, messages })
    }

    // Otherwise, fetch all chats
    const chats = await getAllMessengerChats(companyId)
    console.log('[API] Messenger chats:', JSON.stringify(chats, null, 2))
    return NextResponse.json({ success: true, chats })
  } catch (error) {
    console.error('[API] Error fetching messenger chats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }
}
