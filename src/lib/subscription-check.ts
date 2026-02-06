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
      console.log(`[Subscription Check] Company not found: ${companyId}`)
      return false
    }

    // Check for lifetime access first
    if (companyData.lifetimeAccess === true) {
      console.log(`[Subscription Check] Company ${companyId} has lifetime access`)
      return true
    }

    const status = companyData.subscriptionStatus as SubscriptionStatus

    // Active statuses that allow access
    const activeStatuses: SubscriptionStatus[] = ['active', 'trialing']

    const isActive = activeStatuses.includes(status)

    if (!isActive) {
      console.log(`[Subscription Check] Company ${companyId} has inactive subscription: ${status}`)
    }

    return isActive
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
