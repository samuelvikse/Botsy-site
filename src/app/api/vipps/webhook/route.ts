/**
 * Vipps Webhook Handler
 * POST /api/vipps/webhook
 *
 * Handles webhook events from Vipps Recurring API
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseVippsWebhook, VippsWebhookEvent } from '@/lib/vipps'
import { updateDocumentRest, queryDocumentsRest, getDocumentRest } from '@/lib/firebase-rest'
import { sendSubscriptionConfirmationEmail, sendSubscriptionCancelledEmail } from '@/lib/botsy-emails'
import { logSubscriptionEvent } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = parseVippsWebhook(body)

    console.log(`[Vipps Webhook] Received event: ${event.name}`, {
      agreementId: event.agreementId,
      chargeId: event.chargeId,
      amount: event.amount,
    })

    // Find company by Vipps agreement ID
    let companyId: string | null = null
    let companyData: Record<string, unknown> | null = null

    if (event.agreementId) {
      const companies = await queryDocumentsRest(
        'companies',
        'vippsAgreementId',
        'EQUAL',
        event.agreementId,
        1
      )

      if (companies.length > 0) {
        companyId = companies[0].id
        companyData = companies[0].data as Record<string, unknown>
      }
    }

    if (!companyId) {
      console.error('[Vipps Webhook] Company not found for agreement:', event.agreementId)
      // Return 200 to acknowledge receipt even if we can't process
      return NextResponse.json({ received: true })
    }

    // Skip processing for lifetime access companies
    if (companyData?.lifetimeAccess === true) {
      console.log(`[Vipps Webhook] Skipping webhook for lifetime access company: ${companyId}`)
      return NextResponse.json({ received: true, skipped: 'lifetime_access' })
    }

    // Handle different event types
    switch (event.name as VippsWebhookEvent) {
      case 'recurring.agreement-activated.v1':
        await handleAgreementActivated(companyId, companyData!, event)
        break

      case 'recurring.agreement-rejected.v1':
        await handleAgreementRejected(companyId, event)
        break

      case 'recurring.agreement-stopped.v1':
        await handleAgreementStopped(companyId, companyData!, event)
        break

      case 'recurring.agreement-expired.v1':
        await handleAgreementExpired(companyId, event)
        break

      case 'recurring.charge-reserved.v1':
        await handleChargeReserved(companyId, event)
        break

      case 'recurring.charge-captured.v1':
        await handleChargeCaptured(companyId, companyData!, event)
        break

      case 'recurring.charge-failed.v1':
        await handleChargeFailed(companyId, companyData!, event)
        break

      case 'recurring.charge-cancelled.v1':
        await handleChargeCancelled(companyId, event)
        break

      default:
        console.log(`[Vipps Webhook] Unhandled event type: ${event.name}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Vipps Webhook] Error:', error)
    // Return 200 to prevent Vipps from retrying
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}

/**
 * Agreement activated - subscription is now active
 */
async function handleAgreementActivated(
  companyId: string,
  companyData: Record<string, unknown>,
  event: ReturnType<typeof parseVippsWebhook>
) {
  // Calculate trial end date (14 days from now)
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)

  await updateDocumentRest('companies', companyId, {
    vippsAgreementStatus: 'ACTIVE',
    subscriptionStatus: 'trialing',
    subscriptionTrialEnd: trialEnd,
    subscriptionCurrentPeriodStart: new Date(),
    subscriptionCurrentPeriodEnd: trialEnd,
    subscriptionUpdatedAt: new Date(),
  }, [
    'vippsAgreementStatus',
    'subscriptionStatus',
    'subscriptionTrialEnd',
    'subscriptionCurrentPeriodStart',
    'subscriptionCurrentPeriodEnd',
    'subscriptionUpdatedAt',
  ])

  // Log audit event
  await logSubscriptionEvent({
    action: 'subscription.created',
    companyId,
    status: 'trialing',
  })

  // Send confirmation email
  const ownerId = companyData.ownerId as string
  if (ownerId) {
    const owner = await getDocumentRest('users', ownerId)
    if (owner?.email) {
      await sendSubscriptionConfirmationEmail({
        to: owner.email as string,
        customerName: (owner.displayName as string) || 'Kunde',
        companyName: (companyData.name as string) || 'Din bedrift',
        price: '699',
        currency: 'NOK',
        billingPeriod: 'månedlig',
        trialEndDate: trialEnd.toLocaleDateString('nb-NO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        nextBillingDate: trialEnd.toLocaleDateString('nb-NO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      })
    }
  }

  console.log(`[Vipps Webhook] Agreement activated for company ${companyId}`)
}

/**
 * Agreement rejected - user declined in Vipps app
 */
async function handleAgreementRejected(
  companyId: string,
  event: ReturnType<typeof parseVippsWebhook>
) {
  await updateDocumentRest('companies', companyId, {
    vippsAgreementStatus: 'REJECTED',
    vippsAgreementId: null,
  }, ['vippsAgreementStatus', 'vippsAgreementId'])

  console.log(`[Vipps Webhook] Agreement rejected for company ${companyId}`)
}

/**
 * Agreement stopped - subscription cancelled
 */
async function handleAgreementStopped(
  companyId: string,
  companyData: Record<string, unknown>,
  event: ReturnType<typeof parseVippsWebhook>
) {
  await updateDocumentRest('companies', companyId, {
    vippsAgreementStatus: 'STOPPED',
    subscriptionStatus: 'canceled',
    subscriptionCanceledAt: new Date(),
    subscriptionUpdatedAt: new Date(),
  }, [
    'vippsAgreementStatus',
    'subscriptionStatus',
    'subscriptionCanceledAt',
    'subscriptionUpdatedAt',
  ])

  // Log audit event
  await logSubscriptionEvent({
    action: 'subscription.cancelled',
    companyId,
    status: 'canceled',
  })

  // Send cancellation email
  const ownerId = companyData.ownerId as string
  if (ownerId) {
    const owner = await getDocumentRest('users', ownerId)
    if (owner?.email) {
      const accessUntil = companyData.subscriptionCurrentPeriodEnd
        ? new Date(companyData.subscriptionCurrentPeriodEnd as string)
        : new Date()

      await sendSubscriptionCancelledEmail({
        to: owner.email as string,
        customerName: (owner.displayName as string) || 'Kunde',
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
    }
  }

  console.log(`[Vipps Webhook] Agreement stopped for company ${companyId}`)
}

/**
 * Agreement expired
 */
async function handleAgreementExpired(
  companyId: string,
  event: ReturnType<typeof parseVippsWebhook>
) {
  await updateDocumentRest('companies', companyId, {
    vippsAgreementStatus: 'EXPIRED',
    subscriptionStatus: 'canceled',
    subscriptionUpdatedAt: new Date(),
  }, ['vippsAgreementStatus', 'subscriptionStatus', 'subscriptionUpdatedAt'])

  console.log(`[Vipps Webhook] Agreement expired for company ${companyId}`)
}

/**
 * Charge reserved - payment is pending
 */
async function handleChargeReserved(
  companyId: string,
  event: ReturnType<typeof parseVippsWebhook>
) {
  console.log(`[Vipps Webhook] Charge reserved for company ${companyId}: ${event.chargeId}`)
}

/**
 * Charge captured - payment successful
 */
async function handleChargeCaptured(
  companyId: string,
  companyData: Record<string, unknown>,
  event: ReturnType<typeof parseVippsWebhook>
) {
  // Calculate next billing period
  const now = new Date()
  const nextPeriodEnd = new Date(now)
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1)

  await updateDocumentRest('companies', companyId, {
    subscriptionStatus: 'active',
    subscriptionCurrentPeriodStart: now,
    subscriptionCurrentPeriodEnd: nextPeriodEnd,
    subscriptionUpdatedAt: new Date(),
    lastVippsChargeId: event.chargeId,
    lastVippsPaymentAt: new Date(),
  }, [
    'subscriptionStatus',
    'subscriptionCurrentPeriodStart',
    'subscriptionCurrentPeriodEnd',
    'subscriptionUpdatedAt',
    'lastVippsChargeId',
    'lastVippsPaymentAt',
  ])

  // Log audit event
  await logSubscriptionEvent({
    action: 'subscription.payment_succeeded',
    companyId,
    amount: event.amount / 100, // Convert from øre to NOK
    currency: event.currency,
  })

  console.log(`[Vipps Webhook] Charge captured for company ${companyId}: ${event.amount / 100} NOK`)
}

/**
 * Charge failed - payment failed
 */
async function handleChargeFailed(
  companyId: string,
  companyData: Record<string, unknown>,
  event: ReturnType<typeof parseVippsWebhook>
) {
  await updateDocumentRest('companies', companyId, {
    subscriptionStatus: 'past_due',
    lastPaymentFailedAt: new Date(),
    subscriptionUpdatedAt: new Date(),
  }, ['subscriptionStatus', 'lastPaymentFailedAt', 'subscriptionUpdatedAt'])

  // Log audit event
  await logSubscriptionEvent({
    action: 'subscription.payment_failed',
    companyId,
    amount: event.amount / 100,
    currency: event.currency,
  })

  console.log(`[Vipps Webhook] Charge failed for company ${companyId}`)
}

/**
 * Charge cancelled
 */
async function handleChargeCancelled(
  companyId: string,
  event: ReturnType<typeof parseVippsWebhook>
) {
  console.log(`[Vipps Webhook] Charge cancelled for company ${companyId}: ${event.chargeId}`)
}
