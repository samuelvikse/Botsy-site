import webpush from 'web-push'
import { getActiveSubscriptionsByCompany } from './escalation-firestore'

// Configure web-push with VAPID keys
// These should be set in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@botsy.no'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    conversationId?: string
    type?: 'escalation' | 'message' | 'general'
  }
}

export async function sendPushNotification(
  subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  },
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured, skipping push notification')
    return false
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload)
    )
    return true
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return false
  }
}

export async function sendEscalationNotifications(
  companyId: string,
  customerIdentifier: string,
  customerMessage: string,
  conversationId: string,
  channel: string
): Promise<number> {
  const subscriptions = await getActiveSubscriptionsByCompany(companyId)

  if (subscriptions.length === 0) {
    console.log('No active push subscriptions for company:', companyId)
    return 0
  }

  const payload: PushNotificationPayload = {
    title: '🚨 Kunde trenger hjelp',
    body: `${customerIdentifier}: "${customerMessage.slice(0, 100)}${customerMessage.length > 100 ? '...' : ''}"`,
    icon: '/brand/botsy-icon.svg',
    badge: '/brand/botsy-icon.svg',
    tag: `escalation-${conversationId}`,
    data: {
      url: `/admin?tab=conversations&id=${conversationId}`,
      conversationId,
      type: 'escalation',
    },
  }

  let successCount = 0
  for (const sub of subscriptions) {
    const success = await sendPushNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      payload
    )
    if (success) successCount++
  }

  return successCount
}

// Generate VAPID keys (run once to generate keys for .env)
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys()
}
