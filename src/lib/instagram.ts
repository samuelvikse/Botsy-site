/**
 * Instagram Messaging Service Layer
 * Handles sending messages via the Instagram Graph API
 */

interface InstagramSendResponse {
  recipient_id: string
  message_id: string
}

/**
 * Send a message via Instagram DM
 * Uses the Instagram Graph API (same as Facebook Messenger for business)
 */
export async function sendInstagramMessage(
  pageAccessToken: string,
  recipientId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Instagram uses the same Graph API endpoint as Messenger
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          messaging_type: 'RESPONSE',
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Instagram] Send error:', errorData)
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send message',
      }
    }

    const data: InstagramSendResponse = await response.json()
    return {
      success: true,
      messageId: data.message_id,
    }
  } catch (error) {
    console.error('[Instagram] Send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get Instagram user profile
 */
export async function getInstagramUserProfile(
  userId: string,
  pageAccessToken: string
): Promise<{ username?: string; name?: string } | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${userId}?fields=username,name&access_token=${pageAccessToken}`
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      username: data.username,
      name: data.name,
    }
  } catch {
    return null
  }
}
