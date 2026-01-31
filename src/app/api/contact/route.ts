import { NextRequest, NextResponse } from 'next/server'

interface ContactFormData {
  name: string
  email: string
  company?: string
  message: string
  type: 'demo' | 'sales' | 'support' | 'general' | 'booking'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactFormData
    const { name, email, company, message, type } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Mangler påkrevde felt' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig e-postadresse' },
        { status: 400 }
      )
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('[Contact] Resend API key not configured')
      return NextResponse.json(
        { success: false, error: 'E-posttjenesten er ikke konfigurert' },
        { status: 503 }
      )
    }

    // Determine subject based on type
    const typeLabels: Record<string, string> = {
      demo: 'Demo-forespørsel',
      sales: 'Salgshenvendelse',
      support: 'Support-henvendelse',
      general: 'Generell henvendelse',
      booking: 'Møteforespørsel',
    }
    const subject = `[Botsy Kontakt] ${typeLabels[type] || 'Ny henvendelse'} fra ${name}`

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a2e; color: #ffffff;">
  <div style="background-color: #252542; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #CCFF00; font-size: 24px; margin: 0;">Ny henvendelse fra botsy.no</h1>
    </div>

    <div style="background-color: rgba(204,255,0,0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #CCFF00; font-weight: 600;">${typeLabels[type] || 'Henvendelse'}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">Navn:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #fff;">${name}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">E-post:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);"><a href="mailto:${email}" style="color: #CCFF00;">${email}</a></td>
      </tr>
      ${company ? `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">Bedrift:</td>
        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #fff;">${company}</td>
      </tr>
      ` : ''}
    </table>

    <div style="margin-top: 24px;">
      <p style="color: #888; margin-bottom: 8px;">Melding:</p>
      <div style="background-color: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px;">
        <p style="margin: 0; color: #fff; white-space: pre-wrap;">${message}</p>
      </div>
    </div>

    <div style="margin-top: 32px; text-align: center;">
      <a href="mailto:${email}" style="display: inline-block; background-color: #CCFF00; color: #1a1a2e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Svar på henvendelsen</a>
    </div>
  </div>

  <div style="text-align: center; margin-top: 24px;">
    <p style="color: #666; font-size: 12px;">
      Denne e-posten ble sendt automatisk fra kontaktskjemaet på botsy.no
    </p>
  </div>
</body>
</html>
`

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Botsy Kontakt <kontakt@botsy.no>',
        to: 'hei@botsy.no',
        reply_to: email,
        subject: subject,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('[Contact] Failed to send email:', errorData)
      return NextResponse.json(
        { success: false, error: 'Kunne ikke sende melding. Prøv igjen senere.' },
        { status: 500 }
      )
    }

    // Also send a confirmation email to the user
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Botsy <hei@botsy.no>',
        to: email,
        subject: 'Vi har mottatt din henvendelse - Botsy',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 16px;">Takk for din henvendelse!</h1>

    <p style="color: #4a5568; line-height: 1.6;">
      Hei ${name}!
    </p>

    <p style="color: #4a5568; line-height: 1.6;">
      Vi har mottatt meldingen din og vil svare deg så snart som mulig, vanligvis innen 2-4 timer.
    </p>

    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="color: #6b7a94; margin: 0 0 8px 0; font-size: 14px;">Din melding:</p>
      <p style="color: #1a1a2e; margin: 0; white-space: pre-wrap;">${message}</p>
    </div>

    <p style="color: #4a5568; line-height: 1.6;">
      Med vennlig hilsen,<br>
      <strong>Botsy-teamet</strong>
    </p>
  </div>

  <div style="text-align: center; margin-top: 24px;">
    <p style="color: #6b7a94; font-size: 12px;">
      <a href="https://botsy.no" style="color: #CCFF00;">botsy.no</a> - Din digitale kundeserviceassistent
    </p>
  </div>
</body>
</html>
`,
      }),
    })

    return NextResponse.json({
      success: true,
      message: 'Melding sendt!',
    })
  } catch (error) {
    console.error('[Contact] Error:', error)
    return NextResponse.json(
      { success: false, error: 'En feil oppstod. Prøv igjen.' },
      { status: 500 }
    )
  }
}
