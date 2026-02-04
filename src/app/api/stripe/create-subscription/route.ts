import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { verifyIdTokenRest, getDocumentRest, updateDocumentRest } from '@/lib/firebase-rest'

/**
 * POST - Create a subscription with embedded payment
 * Returns client_secret for Stripe Elements
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const user = await verifyIdTokenRest(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      customerId: stripeCustomerId,
    })
  } catch (error) {
    console.error('[Stripe Create Subscription] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
