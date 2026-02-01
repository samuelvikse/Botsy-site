import { NextRequest, NextResponse } from 'next/server'
import { sendTeamInvitationEmail } from '@/lib/botsy-emails'

/**
 * Test endpoint for email sending
 *
 * Usage: POST /api/test-email
 * Body: { "email": "your@email.com" }
 *
 * DELETE THIS FILE IN PRODUCTION or add authentication!
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint disabled in production' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required. Send: { "email": "your@email.com" }' },
        { status: 400 }
      )
    }

    console.log(`[Test Email] Sending test email to: ${email}`)

    const result = await sendTeamInvitationEmail({
      to: email,
      inviterName: 'Test Bruker',
      companyName: 'Test Bedrift AS',
      role: 'employee',
      inviteUrl: 'https://botsy.no/invite/test-token-123',
    })

    if (result.success) {
      console.log(`[Test Email] Success! Email ID: ${result.id}`)
      return NextResponse.json({
        success: true,
        message: `Test-email sendt til ${email}`,
        emailId: result.id,
      })
    } else {
      console.error(`[Test Email] Failed:`, result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        hint: 'Sjekk RESEND_API_KEY i .env.local og at domenet er verifisert',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Test Email] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// GET for easy browser testing
export async function GET() {
  return NextResponse.json({
    message: 'Email test endpoint',
    usage: 'POST /api/test-email med body: { "email": "din@email.com" }',
    example: 'curl -X POST http://localhost:3000/api/test-email -H "Content-Type: application/json" -d \'{"email":"test@example.com"}\'',
  })
}
