import { NextRequest, NextResponse } from 'next/server'
import { getEmailChannel, saveEmailMessage } from '@/lib/email-firestore'
import { sendEmail, formatReplySubject } from '@/lib/email'
import type { EmailCredentials } from '@/lib/email'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

/**
 * POST - Send email reply via configured provider (Gmail, SendGrid, etc.)
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { companyId, customerEmail, subject, body: emailBody } = body

    if (!companyId || !customerEmail || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'companyId, customerEmail og body er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    // Get email channel configuration
    const channel = await getEmailChannel(companyId, user.token)

    if (!channel || !channel.isActive) {
      return NextResponse.json(
        { success: false, error: 'E-postkanal er ikke konfigurert eller aktiv' },
        { status: 400 }
      )
    }

    // Build credentials
    const credentials: EmailCredentials = {
      provider: channel.provider,
      apiKey: channel.credentials.apiKey,
      domain: channel.credentials.domain,
      smtpHost: channel.credentials.smtpHost,
      smtpPort: channel.credentials.smtpPort,
      smtpUser: channel.credentials.smtpUser,
      smtpPass: channel.credentials.smtpPass,
      accessToken: channel.credentials.accessToken,
      refreshToken: channel.credentials.refreshToken,
      expiresAt: channel.credentials.expiresAt,
    }

    const replySubject = subject ? formatReplySubject(subject) : 'Re: Henvendelse'

    // Send the email
    const result = await sendEmail(credentials, {
      to: customerEmail,
      from: channel.emailAddress,
      subject: replySubject,
      text: emailBody,
      replyTo: channel.emailAddress,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Kunne ikke sende e-post' },
        { status: 500 }
      )
    }

    // Save outbound message to Firestore (fire-and-forget)
    saveEmailMessage(companyId, customerEmail, {
      direction: 'outbound',
      from: channel.emailAddress,
      to: customerEmail,
      subject: replySubject,
      body: emailBody,
      timestamp: new Date(),
    }, user.token).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Email Send] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke sende e-post' },
      { status: 500 }
    )
  }
}
