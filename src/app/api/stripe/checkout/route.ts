import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { verifyIdTokenRest, getDocumentRest, updateDocumentRest } from '@/lib/firebase-rest'

/**
 * POST - Create a Stripe Checkout Session for subscription
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
      console.error('[Stripe Checkout] Stripe not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    if (!STRIPE_CONFIG.priceId) {
      console.error('[Stripe Checkout] Price ID not configured')
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

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin') || 'https://www.botsy.no'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.trialDays,
        metadata: {
          companyId: companyId,
          userId: userId,
        },
      },
      success_url: `${origin}/admin/fakturering?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/admin/fakturering?canceled=true`,
      metadata: {
        companyId: companyId,
        userId: userId,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: 'required',
      // Norwegian locale
      locale: 'nb',
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
