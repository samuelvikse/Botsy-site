import { NextRequest, NextResponse } from 'next/server'
import { getSMSChannel, updateSMSChannel } from '@/lib/sms-firestore'
import { getSMSProvider, formatPhoneNumber, isValidE164 } from '@/lib/sms'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

interface TestSMSRequest {
  companyId: string
  testPhone: string
}

// POST - Send a test SMS to verify configuration
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = (await request.json()) as TestSMSRequest
    const { companyId, testPhone } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    if (!testPhone) {
      return NextResponse.json(
        { success: false, error: 'testPhone er påkrevd' },
        { status: 400 }
      )
    }

    // Format and validate test phone number
    const formattedTestPhone = formatPhoneNumber(testPhone)
    if (!isValidE164(formattedTestPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ugyldig telefonnummer. Bruk E.164 format (f.eks. +4712345678)',
        },
        { status: 400 }
      )
    }

    // Get SMS channel configuration
    const channel = await getSMSChannel(companyId)

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'SMS er ikke konfigurert for denne bedriften' },
        { status: 404 }
      )
    }

    if (!channel.isActive) {
      return NextResponse.json(
        { success: false, error: 'SMS-integrasjon er deaktivert' },
        { status: 400 }
      )
    }

    // Get SMS provider with credentials
    const smsProvider = getSMSProvider(channel.provider, channel.credentials)

    // Send test message
    const testMessage = `Hei! Dette er en test-melding fra Botsy for å verifisere SMS-oppsettet ditt. Hvis du mottar denne meldingen, fungerer alt som det skal! 🎉`

    const result = await smsProvider.sendSMS(
      formattedTestPhone,
      channel.phoneNumber,
      testMessage
    )

    if (result.status === 'sent') {
      // Mark channel as verified
      await updateSMSChannel(companyId, { isVerified: true })

      return NextResponse.json({
        success: true,
        message: 'Test-SMS sendt!',
        messageId: result.messageId,
        sentTo: formattedTestPhone,
        sentFrom: channel.phoneNumber,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Kunne ikke sende test-SMS',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
