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
  saveEmailMessage,
  getEmailHistory,
} from '@/lib/email-firestore'
import { buildToneConfiguration } from '@/lib/groq'
import type { ToneConfig } from '@/types'

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

    // Parse inbound email based on provider
    let inboundEmail
    if (provider === 'mailgun') {
      inboundEmail = parseMailgunInbound(body)
    } else {
      inboundEmail = parseSendGridInbound(body)
    }

    if (!inboundEmail || !inboundEmail.to || !inboundEmail.from) {
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

    // Find company by email address
    const companyId = await findCompanyByEmail(toAddress)

    if (!companyId) {
      return
    }

    // Get email channel configuration
    const channel = await getEmailChannel(companyId)

    if (!channel || !channel.isActive) {
      return
    }

    // Save inbound email to conversation history
    await saveEmailMessage(companyId, fromAddress, {
      direction: 'inbound',
      from: fromAddress,
      to: toAddress,
      subject: email.subject,
      body: email.text,
      timestamp: email.timestamp,
    })

    // Get conversation history for context
    const conversationHistory = await getEmailHistory(companyId, fromAddress, 10)

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
      conversationHistory,
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
    const replySubject = formatReplySubject(email.subject)
    await sendEmail(credentials, {
      to: fromAddress,
      from: channel.emailAddress,
      subject: replySubject,
      text: aiResponse,
      replyTo: channel.emailAddress,
    })

    // Save outbound email to conversation history
    await saveEmailMessage(companyId, fromAddress, {
      direction: 'outbound',
      from: channel.emailAddress,
      to: fromAddress,
      subject: replySubject,
      body: aiResponse,
      timestamp: new Date(),
    })

  } catch {
    // Error processing email
  }
}

async function generateAIResponse(context: {
  emailSubject: string
  emailBody: string
  senderEmail: string
  businessProfile: Record<string, unknown> | null
  faqs: Array<Record<string, unknown>>
  instructions: Array<{ content: string; priority: string }>
  conversationHistory?: Array<{ direction: string; subject: string; body: string }>
}): Promise<string> {
  const { emailSubject, emailBody, businessProfile, faqs, instructions, conversationHistory } = context

  // Extract tone configuration from business profile
  const bp = businessProfile as {
    businessName?: string
    industry?: string
    description?: string
    tone?: 'formal' | 'friendly' | 'casual'
    toneConfig?: ToneConfig
    contactInfo?: { email?: string; phone?: string; address?: string; openingHours?: string }
    pricing?: Array<{ item: string; price: string }>
  } | null

  // Build tone guide using shared function
  const toneGuide = buildToneConfiguration(bp?.tone || 'friendly', bp?.toneConfig)

  // Build system prompt
  let systemPrompt = `Du er en hjelpsom kundeservice-assistent som svarer på e-post.

E-POST-SPESIFIKKE REGLER:
- Skriv profesjonelle og høflige e-postsvar
- Ikke bruk overdreven formatering
- Start IKKE med "Hei [e-postadresse]" - bruk en generell hilsen som "Hei," eller "Hei der,"
- Avslutt med en høflig avslutning

KOMMUNIKASJONSSTIL:
${toneGuide}

VIKTIGE REGLER:
- Svar alltid på norsk med mindre kunden skriver på et annet språk
- ALDRI nevn andre kunder, brukere, eller bedrifter som bruker tjenesten - dette er konfidensielt
- ALDRI del informasjon om andre brukere
- KRITISK: ALDRI oversett eller endre e-postadresser, telefonnumre, adresser, URLer, eller navn - de skal gjengis NØYAKTIG som de er

EKSTREMT VIKTIG - ALDRI FINN PÅ INFORMASJON:
- ALDRI dikter opp priser, tall, eller fakta som du ikke har fått oppgitt
- Hvis du IKKE har prisinformasjon tilgjengelig, si det ærlig
- Hvis du IKKE vet svaret, si det ærlig - IKKE GJETT eller finn på noe
- Det er MYE bedre å si "jeg vet ikke" enn å gi feil informasjon`

  if (bp) {
    systemPrompt += `\n\nDu representerer: ${bp.businessName || 'Bedriften'}`
    if (bp.industry) systemPrompt += `\nBransje: ${bp.industry}`
    if (bp.description) systemPrompt += `\nOm bedriften: ${bp.description}`

    // Contact information
    if (bp.contactInfo) {
      systemPrompt += `\n\nKONTAKTINFORMASJON (bruk NØYAKTIG som oppgitt):`
      if (bp.contactInfo.email) systemPrompt += `\n- E-post: ${bp.contactInfo.email}`
      if (bp.contactInfo.phone) systemPrompt += `\n- Telefon: ${bp.contactInfo.phone}`
      if (bp.contactInfo.address) systemPrompt += `\n- Adresse: ${bp.contactInfo.address}`
      if (bp.contactInfo.openingHours) systemPrompt += `\n- Åpningstider: ${bp.contactInfo.openingHours}`
    }

    // Pricing information
    if (bp.pricing && bp.pricing.length > 0) {
      systemPrompt += `\n\nPRISER (bruk denne informasjonen når kunder spør om priser):`
      bp.pricing.forEach((p) => {
        systemPrompt += `\n- ${p.item}: ${p.price}`
      })
    }

    // Add useEmojis setting (usually off for email)
    if (bp.toneConfig?.useEmojis === true) {
      systemPrompt += `\n\nEMOJI: Du kan bruke emojis naturlig i svarene.`
    } else {
      systemPrompt += `\n\nEMOJI: Unngå emojis i e-postsvar for profesjonalitet.`
    }
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

  // Build conversation context if available
  let conversationContext = ''
  if (conversationHistory && conversationHistory.length > 1) {
    conversationContext = '\n\nTidligere i samtalen:\n'
    // Skip the last message (current inbound) and get previous exchanges
    for (const msg of conversationHistory.slice(0, -1).slice(-4)) {
      const sender = msg.direction === 'inbound' ? 'Kunde' : 'Du'
      conversationContext += `\n${sender}: ${msg.body.slice(0, 300)}${msg.body.length > 300 ? '...' : ''}\n`
    }
  }

  // Build messages
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `E-post fra kunde:
Emne: ${emailSubject}
${conversationContext}
Ny melding:
${emailBody}

---
Skriv et profesjonelt svar på denne e-posten.`
    },
  ]

  // Use Gemini (primary) with Groq fallback
  try {
    const { generateAIResponse: callAI } = await import('@/lib/ai-providers')
    const result = await callAI(systemPrompt, messages, { maxTokens: 1000, temperature: 0.7 })

    if (result.success) {
      console.log(`[Email AI] Response from ${result.provider}`)
      return result.response
    }

    return `Takk for din henvendelse. Vi har mottatt e-posten din og vil svare så snart som mulig.

Med vennlig hilsen,
Kundeservice`
  } catch {
    return `Takk for din henvendelse. Vi har mottatt e-posten din og vil svare så snart som mulig.

Med vennlig hilsen,
Kundeservice`
  }
}
