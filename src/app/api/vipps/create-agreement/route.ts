/**
 * Create Vipps Recurring Agreement
 * POST /api/vipps/create-agreement
 *
 * Creates a new Vipps subscription agreement for the user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createVippsAgreement, isVippsConfigured } from '@/lib/vipps'
import { updateDocumentRest, getDocumentRest } from '@/lib/firebase-rest'

export async function POST(request: NextRequest) {
  try {
    // Check if Vipps is configured
    if (!isVippsConfigured()) {
      return NextResponse.json(
        { error: 'Vipps er ikke konfigurert' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { phoneNumber, companyId, userId } = body

    if (!phoneNumber || !companyId || !userId) {
      return NextResponse.json(
        { error: 'Telefonnummer, companyId og userId er påkrevd' },
        { status: 400 }
      )
    }

    // Validate Norwegian phone number
    const cleanPhone = phoneNumber.replace(/\s/g, '')
    if (!/^(\+47)?[4-9]\d{7}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Ugyldig norsk mobilnummer' },
        { status: 400 }
      )
    }

    // Format phone number for Vipps (must include country code)
    const formattedPhone = cleanPhone.startsWith('+47') ? cleanPhone : `+47${cleanPhone}`

    // Get company details
    const company = await getDocumentRest('companies', companyId)
    if (!company) {
      return NextResponse.json(
        { error: 'Bedrift ikke funnet' },
        { status: 404 }
      )
    }

    // Check if company already has an active Vipps agreement
    if (company.vippsAgreementId && company.vippsAgreementStatus === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Bedriften har allerede et aktivt Vipps-abonnement' },
        { status: 400 }
      )
    }

    // Create the Vipps agreement
    const result = await createVippsAgreement({
      customerPhoneNumber: formattedPhone,
      productName: 'Botsy Standard',
      productDescription: 'AI-drevet kundeservice - månedlig abonnement',
      price: 699, // NOK per month
      interval: 'MONTHLY',
      companyId,
      userId,
      trialDays: 14, // 14 days free trial
    })

    // Store the agreement ID in the company document
    await updateDocumentRest('companies', companyId, {
      vippsAgreementId: result.agreementId,
      vippsAgreementStatus: 'PENDING',
      vippsCreatedAt: new Date(),
      paymentProvider: 'vipps',
    }, ['vippsAgreementId', 'vippsAgreementStatus', 'vippsCreatedAt', 'paymentProvider'])

    console.log(`[Vipps] Created agreement ${result.agreementId} for company ${companyId}`)

    return NextResponse.json({
      success: true,
      agreementId: result.agreementId,
      redirectUrl: result.vippsConfirmationUrl,
    })
  } catch (error) {
    console.error('[Vipps] Error creating agreement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke opprette Vipps-avtale' },
      { status: 500 }
    )
  }
}
