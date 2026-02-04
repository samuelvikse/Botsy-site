import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifyIdTokenRest, getDocumentRest } from '@/lib/firebase-rest'
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { formatStripeError } from '@/lib/stripe-errors'

/**
 * POST - Create a Stripe Customer Portal session
 * Allows customers to manage their subscription, payment methods, and view invoices
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

    // Rate limiting
    const rateLimitResult = checkRateLimit(
      getRateLimitIdentifier(user.uid),
      RATE_LIMITS.portal
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'For mange forespørsler',
          errorCode: 'Rate Limit',
          retryAfter: rateLimitResult.retryAfter,
          recoverable: true,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const userId = user.uid

    // Get user data to find company
    const userData = await getDocumentRest('users', userId)
    const companyId = userData?.companyId as string | undefined

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company found for user' },
        { status: 400 }
      )
    }

    // Get company's Stripe customer ID
    const companyData = await getDocumentRest('companies', companyId)
    const stripeCustomerId = companyData?.stripeCustomerId as string | undefined

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error: 'Ingen abonnement funnet',
          errorCode: 'No Subscription',
          recoverable: false,
          suggestion: 'Start et abonnement først for å få tilgang til kundeportalen.',
        },
        { status: 400 }
      )
    }

    // Get the origin for redirect URL
    const origin = request.headers.get('origin') || 'https://www.botsy.no'

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/admin/fakturering`,
    })

    return NextResponse.json({
      url: portalSession.url,
    })
  } catch (error) {
    console.error('[Stripe Portal] Error:', error)
    return NextResponse.json(
      formatStripeError(error),
      { status: 500 }
    )
  }
}
