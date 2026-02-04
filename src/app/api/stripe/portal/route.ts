import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifyIdToken } from '@/lib/auth-server'
import { adminDb } from '@/lib/firebase-admin'

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
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const userId = decodedToken.uid

    // Get user data to find company
    const userDoc = await adminDb?.collection('users').doc(userId).get()
    const userData = userDoc?.data()
    const companyId = userData?.companyId

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company found for user' },
        { status: 400 }
      )
    }

    // Get company's Stripe customer ID
    const companyDoc = await adminDb?.collection('companies').doc(companyId).get()
    const companyData = companyDoc?.data()
    const stripeCustomerId = companyData?.stripeCustomerId

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
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
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
