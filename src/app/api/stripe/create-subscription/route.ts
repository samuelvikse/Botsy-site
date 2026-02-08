import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { getDocumentRest, updateDocumentRest } from '@/lib/firebase-rest'
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { formatStripeError } from '@/lib/stripe-errors'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

/**
 * POST - Create a subscription with embedded payment
 * Returns client_secret for Stripe Elements
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    // Rate limiting - strict for checkout
    const rateLimitResult = checkRateLimit(
      getRateLimitIdentifier(user.uid),
      RATE_LIMITS.checkout
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'For mange forsøk på å starte abonnement',
          errorCode: 'Rate Limit',
          retryAfter: rateLimitResult.retryAfter,
          recoverable: true,
          suggestion: `Vent ${rateLimitResult.retryAfter} sekunder før du prøver igjen.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      )
    }

    if (!stripe) {
      console.error('[Stripe] Stripe not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    if (!STRIPE_CONFIG.priceId) {
      console.error('[Stripe] Price ID not configured')
      return NextResponse.json(
        { error: 'Subscription price not configured' },
        { status: 500 }
      )
    }

    const userId = user.uid
    const userEmail = user.email

    // Get user data to find company
    const userData = await getDocumentRest('users', userId)
    const companyId = userData?.companyId as string | undefined

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company found for user' },
        { status: 400 }
      )
    }

    // Check if company already has a Stripe customer
    const companyData = await getDocumentRest('companies', companyId)
    let stripeCustomerId = companyData?.stripeCustomerId as string | undefined

    // Check if user already has an active subscription
    if (companyData?.subscriptionStatus === 'active' || companyData?.subscriptionStatus === 'trialing') {
      return NextResponse.json(
        {
          error: 'Du har allerede et aktivt abonnement',
          errorCode: 'Already Subscribed',
          recoverable: false,
        },
        { status: 400 }
      )
    }

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: {
          companyId: companyId,
          userId: userId,
        },
      })
      stripeCustomerId = customer.id

      // Save customer ID to company
      await updateDocumentRest('companies', companyId, {
        stripeCustomerId: stripeCustomerId,
      }, ['stripeCustomerId'])
    }

    // Create subscription with incomplete status (payment pending)
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: STRIPE_CONFIG.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      trial_period_days: STRIPE_CONFIG.trialDays,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        companyId: companyId,
        userId: userId,
      },
    })

    // Get client secret from the payment intent
    const invoice = subscription.latest_invoice as {
      payment_intent?: { client_secret: string } | null
    }

    // For trial subscriptions, there might not be a payment intent
    // In that case, we need to get a setup intent instead
    let clientSecret: string | null = null

    if (invoice?.payment_intent?.client_secret) {
      clientSecret = invoice.payment_intent.client_secret
    } else {
      // Create a setup intent for collecting payment method during trial
      // When confirmed, it saves the payment method to the customer
      // The subscription will use this method when the trial ends
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        metadata: {
          subscription_id: subscription.id,
          companyId: companyId,
        },
      })
      clientSecret = setupIntent.client_secret
    }

    // Immediately save subscription status to Firestore so SubscriptionGate
    // doesn't block access before the webhook fires (timing gap fix)
    updateDocumentRest('companies', companyId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status, // 'trialing' for trial subs
      subscriptionUpdatedAt: new Date(),
    }, ['stripeSubscriptionId', 'subscriptionStatus', 'subscriptionUpdatedAt'])

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      customerId: stripeCustomerId,
    })
  } catch (error) {
    console.error('[Stripe Create Subscription] Error:', error)
    return NextResponse.json(
      formatStripeError(error),
      { status: 500 }
    )
  }
}
