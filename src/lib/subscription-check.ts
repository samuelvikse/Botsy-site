import { getDocumentRest } from './firebase-rest'

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused' | null

/**
 * Check if a company has an active subscription
 * Returns true if subscription is active, in trial period, or has lifetime access
 */
export async function isSubscriptionActive(companyId: string): Promise<boolean> {
  try {
    const companyData = await getDocumentRest('companies', companyId)

    if (!companyData) {
      return false
    }

    // Check for lifetime access first
    if (companyData.lifetimeAccess === true) {
      return true
    }

    const status = companyData.subscriptionStatus as SubscriptionStatus
    const activeStatuses: SubscriptionStatus[] = ['active', 'trialing']

    return activeStatuses.includes(status)
  } catch (error) {
    console.error(`[Subscription Check] Error checking subscription for ${companyId}:`, error)
    // Fail closed - if we can't verify subscription, deny access
    // Security over availability: prevents free access on API errors
    return false
  }
}

/**
 * Get a user-friendly message for inactive subscriptions
 */
export function getInactiveSubscriptionMessage(language: 'no' | 'en' = 'no'): string {
  if (language === 'en') {
    return "I'm sorry, but the chat service is currently unavailable. Please contact the business directly for assistance."
  }
  return "Beklager, men chat-tjenesten er for øyeblikket utilgjengelig. Vennligst kontakt bedriften direkte for hjelp."
}
