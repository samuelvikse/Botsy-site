/**
 * Cancel Vipps Agreement
 * POST /api/vipps/cancel
 *
 * Cancels a Vipps recurring agreement (subscription)
 */

import { NextRequest, NextResponse } from 'next/server'
import { stopVippsAgreement, isVippsConfigured } from '@/lib/vipps'
import { updateDocumentRest, getDocumentRest } from '@/lib/firebase-rest'
import { logSubscriptionEvent } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  try {
    if (!isVippsConfigured()) {
      return NextResponse.json(
        { error: 'Vipps er ikke konfigurert' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    // Get company data
    const company = await getDocumentRest('companies', companyId)
    if (!company) {
      return NextResponse.json(
        { error: 'Bedrift ikke funnet' },
        { status: 404 }
      )
    }

    const agreementId = company.vippsAgreementId as string
    if (!agreementId) {
      return NextResponse.json(
        { error: 'Ingen Vipps-avtale funnet' },
        { status: 400 }
      )
    }

    // Stop the agreement in Vipps
    await stopVippsAgreement(agreementId)

    // Update company status
    await updateDocumentRest('companies', companyId, {
      vippsAgreementStatus: 'STOPPED',
      subscriptionCancelAtPeriodEnd: true,
      subscriptionUpdatedAt: new Date(),
    }, ['vippsAgreementStatus', 'subscriptionCancelAtPeriodEnd', 'subscriptionUpdatedAt'])

    // Log audit event
    await logSubscriptionEvent({
      action: 'subscription.cancelled',
      companyId,
      status: 'canceled',
    })

    console.log(`[Vipps] Cancelled agreement ${agreementId} for company ${companyId}`)

    return NextResponse.json({
      success: true,
      message: 'Abonnementet er kansellert',
    })
  } catch (error) {
    console.error('[Vipps] Error cancelling agreement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke kansellere abonnement' },
      { status: 500 }
    )
  }
}
