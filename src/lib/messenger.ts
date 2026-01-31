/**
 * Facebook Messenger Service Layer
 * Handles sending messages via the Messenger Platform API
 */

export interface MessengerCredentials {
  pageAccessToken: string
  appSecret: string
}

export interface MessengerMessage {
  recipientId: string
  text: string
}

export interface MessengerInboundMessage {
  senderId: string
  recipientId: string // Page ID
  text: string
  timestamp: number
  messageId: string
}

interface MessengerSendResponse {
  recipient_id: string
  message_id: string
}

/**
 * Send a message via Messenger
 */
export async function sendMessengerMessage(
  credentials: MessengerCredentials,
  message: MessengerMessage
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${credentials.pageAccessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: message.recipientId },
          message: { text: message.text },
          messaging_type: 'RESPONSE',
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Messenger] Send error:', errorData)
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send message',
      }
    }

    const data: MessengerSendResponse = await response.json()
    return {
      success: true,
      messageId: data.message_id,
    }
  } catch (error) {
    console.error('[Messenger] Send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Verify webhook signature from Facebook
 */
export function verifyMessengerSignature(
  appSecret: string,
  signature: string,
  payload: string
): boolean {
  try {
    // Facebook sends signature as "sha256=..."
    if (!signature.startsWith('sha256=')) {
      return false
    }

    const signatureHash = signature.substring(7)

    // Use Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder()
    const keyData = encoder.encode(appSecret)
    const messageData = encoder.encode(payload)

    // For server-side, we need to use Node.js crypto
    // This will be executed in Node.js runtime (Next.js API route)
    const crypto = require('crypto')
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    )
  } catch (error) {
    console.error('[Messenger] Signature verification error:', error)
    return false
  }
}

/**
 * Parse incoming webhook event from Facebook
 */
export function parseMessengerWebhook(body: unknown): MessengerInboundMessage[] {
  const messages: MessengerInboundMessage[] = []

  try {
    const data = body as {
      object: string
      entry?: Array<{
        id: string
        time: number
        messaging?: Array<{
          sender: { id: string }
          recipient: { id: string }
          timestamp: number
          message?: {
            mid: string
            text?: string
          }
        }>
      }>
    }

    if (data.object !== 'page' || !data.entry) {
      return messages
    }

    for (const entry of data.entry) {
      if (!entry.messaging) continue

      for (const event of entry.messaging) {
        // Only process text messages
        if (event.message?.text) {
          messages.push({
            senderId: event.sender.id,
            recipientId: event.recipient.id,
            text: event.message.text,
            timestamp: event.timestamp,
            messageId: event.message.mid,
          })
        }
      }
    }
  } catch (error) {
    console.error('[Messenger] Parse error:', error)
  }

  return messages
}

/**
 * Get user profile from Facebook
 */
export async function getMessengerUserProfile(
  userId: string,
  pageAccessToken: string
): Promise<{ firstName?: string; lastName?: string; profilePic?: string } | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      firstName: data.first_name,
      lastName: data.last_name,
      profilePic: data.profile_pic,
    }
  } catch {
    return null
  }
}
