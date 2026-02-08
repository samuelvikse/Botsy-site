import { NextRequest, NextResponse } from 'next/server'
import {
  getSMSChannel,
  saveSMSChannel,
  updateSMSChannel,
  deleteSMSChannel,
} from '@/lib/sms-firestore'
import { formatPhoneNumber, isValidE164 } from '@/lib/sms'
import type { SMSProvider, SMSCredentials } from '@/types'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

interface SMSConfigRequest {
  companyId: string
  provider: SMSProvider
  phoneNumber: string
  credentials: SMSCredentials
}

// GET - Retrieve SMS configuration
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const companyId = request.nextUrl.searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    const channel = await getSMSChannel(companyId)

    if (!channel) {
      return NextResponse.json({
        success: true,
        configured: false,
        channel: null,
      })
    }

    // Don't expose sensitive credentials
    const safeChannel = {
      id: channel.id,
      provider: channel.provider,
      phoneNumber: channel.phoneNumber,
      isActive: channel.isActive,
      isVerified: channel.isVerified,
      hasCredentials: !!(
        channel.credentials.accountSid ||
        channel.credentials.authToken ||
        channel.credentials.apiKey
      ),
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    }

    return NextResponse.json({
      success: true,
      configured: true,
      channel: safeChannel,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// POST - Create or update SMS configuration
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = (await request.json()) as SMSConfigRequest
    const { companyId, provider, phoneNumber, credentials } = body

    // Validate required fields
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'provider er påkrevd' },
        { status: 400 }
      )
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber er påkrevd' },
        { status: 400 }
      )
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (!isValidE164(formattedPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ugyldig telefonnummer. Bruk E.164 format (f.eks. +4712345678)',
        },
        { status: 400 }
      )
    }

    // Validate credentials based on provider
    if (provider === 'twilio') {
      if (!credentials.accountSid || !credentials.authToken) {
        return NextResponse.json(
          {
            success: false,
            error: 'Twilio krever Account SID og Auth Token',
          },
          { status: 400 }
        )
      }
    } else if (provider === 'messagebird') {
      if (!credentials.apiKey) {
        return NextResponse.json(
          { success: false, error: 'MessageBird krever API Key' },
          { status: 400 }
        )
      }
    }

    // Save the configuration
    await saveSMSChannel(companyId, {
      provider,
      phoneNumber: formattedPhone,
      isActive: true,
      isVerified: false, // Will be verified when first SMS is received/sent
      credentials,
    })

    // Generate webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://botsy.no'
    const webhookUrl = `${baseUrl}/api/webhooks/sms?provider=${provider}`

    return NextResponse.json({
      success: true,
      message: 'SMS-konfigurasjon lagret',
      webhookUrl,
      phoneNumber: formattedPhone,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// PATCH - Update specific fields
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { companyId, ...updates } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    // Format phone number if provided
    if (updates.phoneNumber) {
      updates.phoneNumber = formatPhoneNumber(updates.phoneNumber)
      if (!isValidE164(updates.phoneNumber)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Ugyldig telefonnummer. Bruk E.164 format (f.eks. +4712345678)',
          },
          { status: 400 }
        )
      }
    }

    await updateSMSChannel(companyId, updates)

    return NextResponse.json({
      success: true,
      message: 'SMS-konfigurasjon oppdatert',
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE - Deactivate SMS configuration
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const companyId = request.nextUrl.searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    await deleteSMSChannel(companyId)

    return NextResponse.json({
      success: true,
      message: 'SMS-integrasjon deaktivert',
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
