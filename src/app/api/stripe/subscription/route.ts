import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifyIdToken } from '@/lib/auth-server'
import { adminDb } from '@/lib/firebase-admin'

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
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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

    // Get company subscription data
    const companyDoc = await adminDb?.collection('companies').doc(companyId).get()
    const companyData = companyDoc?.data()

    // Get invoices
    const invoicesSnapshot = await adminDb
      ?.collection('companies')
      .doc(companyId)
      .collection('invoices')
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get()

    const invoices = invoicesSnapshot?.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      periodStart: doc.data().periodStart?.toDate?.()?.toISOString(),
      periodEnd: doc.data().periodEnd?.toDate?.()?.toISOString(),
    })) || []

    return NextResponse.json({
      subscription: {
        status: companyData?.subscriptionStatus || null,
        priceId: companyData?.subscriptionPriceId || null,
        currentPeriodStart: companyData?.subscriptionCurrentPeriodStart?.toDate?.()?.toISOString(),
        currentPeriodEnd: companyData?.subscriptionCurrentPeriodEnd?.toDate?.()?.toISOString(),
        trialEnd: companyData?.subscriptionTrialEnd?.toDate?.()?.toISOString(),
        cancelAtPeriodEnd: companyData?.subscriptionCancelAtPeriodEnd || false,
      },
      invoices,
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

    // Get company subscription
    const companyDoc = await adminDb?.collection('companies').doc(companyId).get()
    const companyData = companyDoc?.data()

    if (!companyData?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Cancel at period end (don't cancel immediately)
    await stripe.subscriptions.update(companyData.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // Update local record
    await adminDb?.collection('companies').doc(companyId).update({
      subscriptionCancelAtPeriodEnd: true,
      subscriptionUpdatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
    })
  } catch (error) {
    console.error('[Stripe Subscription] Cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
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

    // Get company subscription
    const companyDoc = await adminDb?.collection('companies').doc(companyId).get()
    const companyData = companyDoc?.data()

    if (!companyData?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      )
    }

    // Resume subscription
    await stripe.subscriptions.update(companyData.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    // Update local record
    await adminDb?.collection('companies').doc(companyId).update({
      subscriptionCancelAtPeriodEnd: false,
      subscriptionUpdatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed',
    })
  } catch (error) {
    console.error('[Stripe Subscription] Resume error:', error)
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    )
  }
}
