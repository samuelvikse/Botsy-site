import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { updateDocumentRest, queryDocumentsRest, addDocumentRest, getDocumentRest } from '@/lib/firebase-rest'
import { sendSubscriptionConfirmationEmail, sendSubscriptionCancelledEmail } from '@/lib/botsy-emails'
import { logSubscriptionEvent } from '@/lib/audit-log'
import { logError } from '@/lib/error-logger'
import Stripe from 'stripe'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// Track which subscriptions we've already sent welcome emails for (in-memory, resets on deploy)
const sentWelcomeEmails = new Set<string>()

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
    // Log error with context for monitoring
    await logError(error, {
      page: '/api/stripe/webhook',
      action: 'stripe_webhook',
      additionalData: {
        type: 'webhook_handler_error',
      },
    })

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

    const companies = await queryDocumentsRest(
      'companies',
      'stripeCustomerId',
      'EQUAL',
      customerId,
      1
    )

    if (companies.length === 0) {
      console.error('[Stripe Webhook] Could not find company for subscription')
      return
    }

    await updateCompanySubscription(companies[0].id, subscription)
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
    subscriptionPriceId: firstItem?.price.id || null,
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

  await updateDocumentRest('companies', companyId, subscriptionData, [
    'stripeSubscriptionId',
    'subscriptionStatus',
    'subscriptionPriceId',
    'subscriptionCurrentPeriodStart',
    'subscriptionCurrentPeriodEnd',
    'subscriptionTrialEnd',
    'subscriptionCancelAtPeriodEnd',
    'subscriptionUpdatedAt',
  ])

  console.log(`[Stripe Webhook] Updated subscription for company: ${companyId}, status: ${subscription.status}`)

  // Log audit event
  await logSubscriptionEvent({
    action: subscription.status === 'trialing' ? 'subscription.created' : 'subscription.updated',
    companyId,
    subscriptionId: subscription.id,
    status: subscription.status,
  })

  // Send welcome/confirmation email for new subscriptions
  const isNewSubscription = subscription.status === 'trialing' || subscription.status === 'active'
  const emailKey = `${subscription.id}-${subscription.status}`

  if (isNewSubscription && !sentWelcomeEmails.has(emailKey)) {
    sentWelcomeEmails.add(emailKey)

    try {
      // Get company and customer details
      const companyData = await getDocumentRest('companies', companyId)
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      // Get customer email from Stripe
      let customerEmail: string | null = null
      let customerName: string | null = null

      if (stripe) {
        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !customer.deleted) {
          customerEmail = customer.email || null
          customerName = customer.name || null
        }
      }

      if (customerEmail) {
        const trialEndDate = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toLocaleDateString('nb-NO', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : null

        const nextBillingDate = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000).toLocaleDateString('nb-NO', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'Ukjent'

        const price = firstItem?.price.unit_amount
          ? (firstItem.price.unit_amount / 100).toString()
          : '699'

        await sendSubscriptionConfirmationEmail({
          to: customerEmail,
          customerName: customerName || 'Kunde',
          companyName: (companyData?.name as string) || 'Din bedrift',
          price,
          currency: firstItem?.price.currency?.toUpperCase() || 'NOK',
          trialEndDate,
          nextBillingDate,
        })

        console.log(`[Stripe Webhook] Sent subscription confirmation email to ${customerEmail}`)
      }
    } catch (emailError) {
      // Don't fail the webhook if email fails
      console.error('[Stripe Webhook] Failed to send confirmation email:', emailError)
    }
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const companies = await queryDocumentsRest(
    'companies',
    'stripeCustomerId',
    'EQUAL',
    customerId,
    1
  )

  if (companies.length === 0) {
    console.error('[Stripe Webhook] Could not find company for deleted subscription')
    return
  }

  const companyId = companies[0].id
  const companyData = companies[0].data as Record<string, unknown>

  // Get period end for access until date
  const firstItem = subscription.items.data[0]
  const accessUntil = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : new Date()

  await updateDocumentRest('companies', companyId, {
    subscriptionStatus: 'canceled',
    subscriptionCanceledAt: new Date(),
    subscriptionUpdatedAt: new Date(),
  }, ['subscriptionStatus', 'subscriptionCanceledAt', 'subscriptionUpdatedAt'])

  // Log audit event
  await logSubscriptionEvent({
    action: 'subscription.cancelled',
    companyId,
    subscriptionId: subscription.id,
    status: 'canceled',
  })

  // Send cancellation email
  try {
    if (stripe) {
      const customer = await stripe.customers.retrieve(customerId)
      if (customer && !customer.deleted && customer.email) {
        await sendSubscriptionCancelledEmail({
          to: customer.email,
          customerName: customer.name || 'Kunde',
          companyName: (companyData.name as string) || 'Din bedrift',
          cancellationDate: new Date().toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          accessUntil: accessUntil.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        })
        console.log(`[Stripe Webhook] Sent cancellation email to ${customer.email}`)
      }
    }
  } catch (emailError) {
    console.error('[Stripe Webhook] Failed to send cancellation email:', emailError)
  }

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

  const companies = await queryDocumentsRest(
    'companies',
    'stripeCustomerId',
    'EQUAL',
    customerId,
    1
  )

  if (companies.length === 0) return

  const companyId = companies[0].id

  // Store invoice record
  await addDocumentRest('companies', companyId, 'invoices', {
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

  // Log audit event
  await logSubscriptionEvent({
    action: 'subscription.payment_succeeded',
    companyId,
    amount: invoice.amount_paid,
    currency: invoice.currency,
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

  const companies = await queryDocumentsRest(
    'companies',
    'stripeCustomerId',
    'EQUAL',
    customerId,
    1
  )

  if (companies.length === 0) return

  const companyId = companies[0].id

  await updateDocumentRest('companies', companyId, {
    subscriptionStatus: 'past_due',
    lastPaymentFailedAt: new Date(),
  }, ['subscriptionStatus', 'lastPaymentFailedAt'])

  // Log audit event
  await logSubscriptionEvent({
    action: 'subscription.payment_failed',
    companyId,
    amount: invoice.amount_due,
    currency: invoice.currency,
  })

  console.log(`[Stripe Webhook] Invoice payment failed for company: ${companyId}`)
}
