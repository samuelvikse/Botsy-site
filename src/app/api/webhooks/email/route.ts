import { NextRequest, NextResponse } from 'next/server'
import {
  sendEmail,
  parseSendGridInbound,
  parseMailgunInbound,
  extractEmailAddress,
  formatReplySubject,
  type EmailCredentials,
} from '@/lib/email'
import {
  findCompanyByEmail,
  getEmailChannel,
  getBusinessProfile,
  getFAQs,
  getActiveInstructions,
} from '@/lib/email-firestore'

/**
 * POST - Receive incoming emails from SendGrid or Mailgun
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') || 'sendgrid'

    // Parse the request body based on content type
    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, unknown>

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries()) as Record<string, unknown>
    } else {
      body = await request.json().catch(() => ({}))
    }

    console.log('[Email Webhook] Received from:', provider)

    // Parse inbound email based on provider
    let inboundEmail
    if (provider === 'mailgun') {
      inboundEmail = parseMailgunInbound(body)
    } else {
      inboundEmail = parseSendGridInbound(body)
    }

    if (!inboundEmail || !inboundEmail.to || !inboundEmail.from) {
      console.log('[Email Webhook] Could not parse email')
      return NextResponse.json({ status: 'ok', message: 'Could not parse email' })
    }

    // Process the email
    await processEmail(inboundEmail, provider)

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Email Webhook] Error:', error)
    return NextResponse.json({ status: 'error' })
  }
}

async function processEmail(
  email: {
    from: string
    to: string
    subject: string
    text: string
    html?: string
    messageId?: string
    timestamp: Date
  },
  provider: string
) {
  try {
    const toAddress = extractEmailAddress(email.to)
    const fromAddress = extractEmailAddress(email.from)

    console.log('[Email] Processing:', {
      from: fromAddress,
      to: toAddress,
      subject: email.subject,
    })

    // Find company by email address
    const companyId = await findCompanyByEmail(toAddress)

    if (!companyId) {
      console.log('[Email] No company found for email:', toAddress)
      return
    }

    // Get email channel configuration
    const channel = await getEmailChannel(companyId)

    if (!channel || !channel.isActive) {
      console.log('[Email] Channel not active for company:', companyId)
      return
    }

    // Get context for AI
    const [businessProfile, faqs, instructions] = await Promise.all([
      getBusinessProfile(companyId),
      getFAQs(companyId),
      getActiveInstructions(companyId),
    ])

    // Generate AI response
    const aiResponse = await generateAIResponse({
      emailSubject: email.subject,
      emailBody: email.text,
      senderEmail: fromAddress,
      businessProfile,
      faqs,
      instructions,
    })

    // Build credentials for sending
    const credentials: EmailCredentials = {
      provider: channel.provider,
      apiKey: channel.credentials.apiKey,
      domain: channel.credentials.domain,
      smtpHost: channel.credentials.smtpHost,
      smtpPort: channel.credentials.smtpPort,
      smtpUser: channel.credentials.smtpUser,
      smtpPass: channel.credentials.smtpPass,
    }

    // Send response email
    const result = await sendEmail(credentials, {
      to: fromAddress,
      from: channel.emailAddress,
      subject: formatReplySubject(email.subject),
      text: aiResponse,
      replyTo: channel.emailAddress,
    })

    if (result.success) {
      console.log('[Email] Response sent successfully')
    } else {
      console.error('[Email] Failed to send response:', result.error)
    }
  } catch (error) {
    console.error('[Email] Error processing email:', error)
  }
}

async function generateAIResponse(context: {
  emailSubject: string
  emailBody: string
  senderEmail: string
  businessProfile: Record<string, unknown> | null
  faqs: Array<Record<string, unknown>>
  instructions: Array<{ content: string; priority: string }>
}): Promise<string> {
  const { emailSubject, emailBody, senderEmail, businessProfile, faqs, instructions } = context

  // Build system prompt
  let systemPrompt = `Du er en hjelpsom kundeservice-assistent som svarer på e-post.

VIKTIG:
- Svar alltid på norsk med mindre kunden skriver på et annet språk
- Skriv profesjonelle og høflige e-postsvar
- Hold svarene konsise men fullstendige
- Ikke bruk overdreven formatering
- Start IKKE med "Hei [e-postadresse]" - bruk en generell hilsen som "Hei," eller "Hei der,"
- Avslutt med en høflig avslutning
- ALDRI nevn andre kunder, brukere, eller bedrifter som bruker tjenesten - dette er konfidensielt
- ALDRI del informasjon om andre brukere`

  if (businessProfile) {
    const bp = businessProfile as { businessName?: string; industry?: string; description?: string; tone?: string }
    systemPrompt += `\n\nDu representerer: ${bp.businessName || 'Bedriften'}`
    if (bp.industry) systemPrompt += `\nBransje: ${bp.industry}`
    if (bp.description) systemPrompt += `\nOm bedriften: ${bp.description}`
    if (bp.tone) systemPrompt += `\nTonefall: ${bp.tone}`
  }

  if (instructions.length > 0) {
    systemPrompt += '\n\nSpesielle instruksjoner:'
    for (const inst of instructions) {
      systemPrompt += `\n- ${inst.content}`
    }
  }

  if (faqs.length > 0) {
    systemPrompt += '\n\nVanlige spørsmål og svar:'
    for (const faq of faqs.slice(0, 10)) {
      const question = faq.question as string | undefined
      const answer = faq.answer as string | undefined
      if (question && answer) {
        systemPrompt += `\nQ: ${question}\nA: ${answer}`
      }
    }
  }

  // Build messages
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `E-post fra kunde:
Emne: ${emailSubject}

${emailBody}

---
Skriv et profesjonelt svar på denne e-posten.`
    },
  ]

  // Call Groq API
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Email] Groq API error:', errorText)
      return `Takk for din henvendelse. Vi har mottatt e-posten din og vil svare så snart som mulig.

Med vennlig hilsen,
Kundeservice`
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || `Takk for din henvendelse. Vi har mottatt e-posten din og vil svare så snart som mulig.

Med vennlig hilsen,
Kundeservice`
  } catch (error) {
    console.error('[Email] AI generation error:', error)
    return `Takk for din henvendelse. Vi har mottatt e-posten din og vil svare så snart som mulig.

Med vennlig hilsen,
Kundeservice`
  }
}
