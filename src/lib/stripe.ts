import Stripe from 'stripe'

// Server-side Stripe instance - only use in API routes
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is not set')
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      typescript: true,
    })
  : null

// Product and Price IDs - set these after creating them in Stripe Dashboard
export const STRIPE_CONFIG = {
  // Monthly subscription price
  priceId: process.env.STRIPE_PRICE_ID || '',

  // Trial period in days
  trialDays: 14,

  // Webhook secret for verifying webhook signatures
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
}

// Helper function to format amount for display
export function formatPrice(amount: number, currency: string = 'NOK'): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100)
}

// Subscription status types
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

// Check if subscription is in good standing
export function isSubscriptionActive(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}
