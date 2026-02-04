import { NextRequest, NextResponse } from 'next/server'
import { getInstagramChannel, saveInstagramMessage } from '@/lib/instagram-firestore'
import { sendInstagramMessage } from '@/lib/instagram'

export async function POST(request: NextRequest) {
  try {
    const { companyId, senderId, message } = await request.json()

    if (!companyId || !senderId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get Instagram channel configuration
    const channel = await getInstagramChannel(companyId)

    if (!channel || !channel.isActive || !channel.credentials.pageAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Instagram not configured or inactive' },
        { status: 400 }
      )
    }

    // Send message via Instagram API
    const result = await sendInstagramMessage(
      channel.credentials.pageAccessToken,
      senderId,
      message
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send message' },
        { status: 500 }
      )
    }

    // Save message to Firestore
    await saveInstagramMessage(companyId, senderId, {
      direction: 'outbound',
      senderId: senderId,
      text: message,
      timestamp: new Date(),
      messageId: result.messageId,
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error('[Instagram Send] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
