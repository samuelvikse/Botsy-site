import { NextRequest, NextResponse } from 'next/server'
import { getMessengerChannel, saveMessengerMessage } from '@/lib/messenger-firestore'
import { sendMessengerMessage } from '@/lib/messenger'

export async function POST(request: NextRequest) {
  try {
    const { companyId, senderId, message } = await request.json()

    if (!companyId || !senderId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get Messenger channel configuration
    const channel = await getMessengerChannel(companyId)

    if (!channel || !channel.isActive || !channel.credentials.pageAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Messenger not configured or inactive' },
        { status: 400 }
      )
    }

    // Send message via Messenger API
    const result = await sendMessengerMessage(
      {
        pageAccessToken: channel.credentials.pageAccessToken,
        appSecret: channel.credentials.appSecret || '',
      },
      {
        recipientId: senderId,
        text: message,
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send message' },
        { status: 500 }
      )
    }

    // Save message to Firestore
    await saveMessengerMessage(companyId, senderId, {
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
    console.error('[Messenger Send] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
