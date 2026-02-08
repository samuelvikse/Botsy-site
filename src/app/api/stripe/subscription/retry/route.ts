import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getDocumentRest } from '@/lib/firebase-rest'
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { formatStripeError } from '@/lib/stripe-errors'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

/**
 * POST - Retry failed payment
 * Attempts to pay the latest unpaid invoice
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    // Rate limiting - stricter for payment retries
    const rateLimitResult = checkRateLimit(
      getRateLimitIdentifier(user.uid),
      { maxRequests: 3, windowMs: 300000 } // 3 attempts per 5 minutes
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'For mange betalingsforsøk. Vent litt før du prøver igjen.',
          errorCode: 'Rate Limit',
          retryAfter: rateLimitResult.retryAfter,
          recoverable: true,
          suggestion: `Prøv igjen om ${Math.ceil((rateLimitResult.retryAfter || 60) / 60)} minutter.`,
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

    if (!companyData?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No customer found' },
        { status: 400 }
      )
    }

    if (!companyData?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      )
    }

    // Get the subscription to find latest invoice
    const subscription = await stripe.subscriptions.retrieve(
      companyData.stripeSubscriptionId as string,
      { expand: ['latest_invoice'] }
    )

    const latestInvoice = subscription.latest_invoice as {
      id: string
      status: string
      payment_intent?: { id: string } | string | null
    } | null

    if (!latestInvoice) {
      return NextResponse.json(
        {
          error: 'Ingen ubetalt faktura funnet',
          errorCode: 'No Invoice',
          recoverable: false,
        },
        { status: 400 }
      )
    }

    // Check if invoice is actually unpaid
    if (latestInvoice.status === 'paid') {
      return NextResponse.json(
        {
          error: 'Fakturaen er allerede betalt',
          errorCode: 'Already Paid',
          recoverable: false,
        },
        { status: 400 }
      )
    }

    // Try to pay the invoice
    try {
      const paidInvoice = await stripe.invoices.pay(latestInvoice.id)

      if (paidInvoice.status === 'paid') {
        return NextResponse.json({
          success: true,
          message: 'Betalingen var vellykket!',
        })
      } else {
        return NextResponse.json(
          {
            error: 'Betalingen kunne ikke gjennomføres',
            errorCode: 'Payment Failed',
            recoverable: true,
            suggestion: 'Prøv å oppdatere betalingsmetoden din.',
          },
          { status: 400 }
        )
      }
    } catch (payError) {
      // Handle specific Stripe payment errors
      console.error('[Stripe Retry] Payment error:', payError)
      return NextResponse.json(
        formatStripeError(payError),
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[Stripe Subscription] Retry payment error:', error)
    return NextResponse.json(
      formatStripeError(error),
      { status: 500 }
    )
  }
}
