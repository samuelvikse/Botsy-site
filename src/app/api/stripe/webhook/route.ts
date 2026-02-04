import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import Stripe from 'stripe'

/**
 * POST - Handle Stripe webhook events
 * IMPORTANT: This endpoint verifies webhook signatures to ensure events come from Stripe
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      console.error('[Stripe Webhook] Stripe not configured')
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    // Get the raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Stripe Webhook] No signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    if (!STRIPE_CONFIG.webhookSecret) {
      console.error('[Stripe Webhook] Webhook secret not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify webhook signature - CRITICAL for security
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_CONFIG.webhookSecret
      )
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/**
 * Handle checkout.session.completed - user finished checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId

  if (!companyId) {
    console.error('[Stripe Webhook] No companyId in session metadata')
    return
  }

  console.log(`[Stripe Webhook] Checkout completed for company: ${companyId}`)

  // The subscription update will be handled by customer.subscription.created event
}

/**
 * Handle subscription creation/update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId

  if (!companyId) {
    // Try to find company by customer ID
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

    const companiesSnapshot = await adminDb
      ?.collection('companies')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get()

    if (!companiesSnapshot || companiesSnapshot.empty) {
      console.error('[Stripe Webhook] Could not find company for subscription')
      return
    }

    const companyDoc = companiesSnapshot.docs[0]
    await updateCompanySubscription(companyDoc.id, subscription)
  } else {
    await updateCompanySubscription(companyId, subscription)
  }
}

/**
 * Update company subscription data in Firestore
 */
async function updateCompanySubscription(companyId: string, subscription: Stripe.Subscription) {
  // In Stripe API v20+, current_period_start/end are on subscription items
  const firstItem = subscription.items.data[0]

  const subscriptionData = {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionPriceId: firstItem?.price.id,
    subscriptionCurrentPeriodStart: firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : null,
    subscriptionCurrentPeriodEnd: firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
      : null,
    subscriptionTrialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
    subscriptionUpdatedAt: new Date(),
  }

  await adminDb?.collection('companies').doc(companyId).update(subscriptionData)

  console.log(`[Stripe Webhook] Updated subscription for company: ${companyId}, status: ${subscription.status}`)
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const companiesSnapshot = await adminDb
    ?.collection('companies')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (!companiesSnapshot || companiesSnapshot.empty) {
    console.error('[Stripe Webhook] Could not find company for deleted subscription')
    return
  }

  const companyId = companiesSnapshot.docs[0].id

  await adminDb?.collection('companies').doc(companyId).update({
    subscriptionStatus: 'canceled',
    subscriptionCanceledAt: new Date(),
    subscriptionUpdatedAt: new Date(),
  })

  console.log(`[Stripe Webhook] Subscription canceled for company: ${companyId}`)
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const companiesSnapshot = await adminDb
    ?.collection('companies')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (!companiesSnapshot || companiesSnapshot.empty) return

  const companyId = companiesSnapshot.docs[0].id

  // Store invoice record
  await adminDb?.collection('companies').doc(companyId).collection('invoices').add({
    stripeInvoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    invoicePdf: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    createdAt: new Date(),
  })

  console.log(`[Stripe Webhook] Invoice payment succeeded for company: ${companyId}`)
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const companiesSnapshot = await adminDb
    ?.collection('companies')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (!companiesSnapshot || companiesSnapshot.empty) return

  const companyId = companiesSnapshot.docs[0].id

  await adminDb?.collection('companies').doc(companyId).update({
    subscriptionStatus: 'past_due',
    lastPaymentFailedAt: new Date(),
  })

  console.log(`[Stripe Webhook] Invoice payment failed for company: ${companyId}`)

  // TODO: Send email notification about payment failure
}
