import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifyIdTokenRest, getDocumentRest, updateDocumentRest } from '@/lib/firebase-rest'
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { formatStripeError } from '@/lib/stripe-errors'

/**
 * POST - Pause subscription
 * Pauses the subscription collection for up to 3 months
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
      RATE_LIMITS.subscription
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
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
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

    // Get company subscription
    const companyData = await getDocumentRest('companies', companyId)

    if (!companyData?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Get current subscription to check status
    const subscription = await stripe.subscriptions.retrieve(
      companyData.stripeSubscriptionId as string
    )

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json(
        {
          error: 'Kan ikke pause et abonnement som ikke er aktivt',
          errorCode: 'Invalid Status',
          recoverable: false,
        },
        { status: 400 }
      )
    }

    // Pause subscription - using pause_collection
    // This pauses payment collection for up to 3 months
    const resumeDate = new Date()
    resumeDate.setMonth(resumeDate.getMonth() + 3)

    await stripe.subscriptions.update(companyData.stripeSubscriptionId as string, {
      pause_collection: {
        behavior: 'void', // Don't create invoices while paused
        resumes_at: Math.floor(resumeDate.getTime() / 1000),
      },
    })

    // Update local record
    await updateDocumentRest('companies', companyId, {
      subscriptionStatus: 'paused',
      subscriptionPausedAt: new Date(),
      subscriptionResumesAt: resumeDate,
      subscriptionUpdatedAt: new Date(),
    }, ['subscriptionStatus', 'subscriptionPausedAt', 'subscriptionResumesAt', 'subscriptionUpdatedAt'])

    return NextResponse.json({
      success: true,
      message: 'Subscription paused',
      resumesAt: resumeDate.toISOString(),
    })
  } catch (error) {
    console.error('[Stripe Subscription] Pause error:', error)
    return NextResponse.json(
      formatStripeError(error),
      { status: 500 }
    )
  }
}

/**
 * DELETE - Resume paused subscription
 */
export async function DELETE(request: NextRequest) {
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
      RATE_LIMITS.subscription
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

    // Get company subscription
    const companyData = await getDocumentRest('companies', companyId)

    if (!companyData?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      )
    }

    // Resume subscription by removing pause_collection
    await stripe.subscriptions.update(companyData.stripeSubscriptionId as string, {
      pause_collection: null,
    })

    // Update local record
    await updateDocumentRest('companies', companyId, {
      subscriptionStatus: 'active',
      subscriptionPausedAt: null,
      subscriptionResumesAt: null,
      subscriptionUpdatedAt: new Date(),
    }, ['subscriptionStatus', 'subscriptionPausedAt', 'subscriptionResumesAt', 'subscriptionUpdatedAt'])

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed',
    })
  } catch (error) {
    console.error('[Stripe Subscription] Resume from pause error:', error)
    return NextResponse.json(
      formatStripeError(error),
      { status: 500 }
    )
  }
}
