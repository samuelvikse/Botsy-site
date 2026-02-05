import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifyIdTokenRest, getDocumentRest, updateDocumentRest } from '@/lib/firebase-rest'
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { formatStripeError } from '@/lib/stripe-errors'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

/**
 * GET - Get current subscription status
 */
export async function GET(request: NextRequest) {
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
      RATE_LIMITS.general
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

    // Get company subscription data
    const companyData = await getDocumentRest('companies', companyId)

    // Get invoices from subcollection
    const invoices = await getInvoicesRest(companyId)

    return NextResponse.json({
      subscription: {
        status: companyData?.subscriptionStatus || null,
        priceId: companyData?.subscriptionPriceId || null,
        currentPeriodStart: companyData?.subscriptionCurrentPeriodStart || null,
        currentPeriodEnd: companyData?.subscriptionCurrentPeriodEnd || null,
        trialEnd: companyData?.subscriptionTrialEnd || null,
        cancelAtPeriodEnd: companyData?.subscriptionCancelAtPeriodEnd || false,
        pausedAt: companyData?.subscriptionPausedAt || null,
        resumesAt: companyData?.subscriptionResumesAt || null,
        paymentProvider: companyData?.paymentProvider || null,
        vippsAgreementStatus: companyData?.vippsAgreementStatus || null,
        lifetimeAccess: companyData?.lifetimeAccess || false,
      },
      invoices,
      companyId,
      hasStripeCustomer: !!companyData?.stripeCustomerId,
    })
  } catch (error) {
    console.error('[Stripe Subscription] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Cancel subscription at period end
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
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Cancel at period end (don't cancel immediately)
    await stripe.subscriptions.update(companyData.stripeSubscriptionId as string, {
      cancel_at_period_end: true,
    })

    // Update local record
    await updateDocumentRest('companies', companyId, {
      subscriptionCancelAtPeriodEnd: true,
      subscriptionUpdatedAt: new Date(),
    }, ['subscriptionCancelAtPeriodEnd', 'subscriptionUpdatedAt'])

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
    })
  } catch (error) {
    console.error('[Stripe Subscription] Cancel error:', error)
    return NextResponse.json(
      formatStripeError(error),
      { status: 500 }
    )
  }
}

/**
 * PUT - Resume canceled subscription
 */
export async function PUT(request: NextRequest) {
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

    // Resume subscription
    await stripe.subscriptions.update(companyData.stripeSubscriptionId as string, {
      cancel_at_period_end: false,
    })

    // Update local record
    await updateDocumentRest('companies', companyId, {
      subscriptionCancelAtPeriodEnd: false,
      subscriptionUpdatedAt: new Date(),
    }, ['subscriptionCancelAtPeriodEnd', 'subscriptionUpdatedAt'])

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed',
    })
  } catch (error) {
    console.error('[Stripe Subscription] Resume error:', error)
    return NextResponse.json(
      formatStripeError(error),
      { status: 500 }
    )
  }
}

/**
 * Get invoices from subcollection using REST API
 */
async function getInvoicesRest(companyId: string) {
  try {
    const response = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}/invoices?orderBy=createdAt desc&pageSize=12`
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const documents = data.documents || []

    return documents.map((doc: { name: string; fields: Record<string, unknown> }) => {
      const fields = doc.fields || {}
      return {
        id: doc.name.split('/').pop(),
        stripeInvoiceId: parseValue(fields.stripeInvoiceId),
        amountPaid: parseValue(fields.amountPaid),
        currency: parseValue(fields.currency),
        status: parseValue(fields.status),
        invoicePdf: parseValue(fields.invoicePdf),
        hostedInvoiceUrl: parseValue(fields.hostedInvoiceUrl),
        periodStart: parseValue(fields.periodStart),
        periodEnd: parseValue(fields.periodEnd),
        createdAt: parseValue(fields.createdAt),
      }
    })
  } catch (error) {
    console.error('[Stripe Subscription] Get invoices error:', error)
    return []
  }
}

function parseValue(field: unknown): unknown {
  if (!field || typeof field !== 'object') return null
  const f = field as Record<string, unknown>
  if ('stringValue' in f) return f.stringValue
  if ('integerValue' in f) return parseInt(f.integerValue as string)
  if ('doubleValue' in f) return f.doubleValue
  if ('booleanValue' in f) return f.booleanValue
  if ('timestampValue' in f) return f.timestampValue
  if ('nullValue' in f) return null
  return null
}
