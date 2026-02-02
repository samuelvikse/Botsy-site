import { NextRequest, NextResponse } from 'next/server'
import {
  sendMessengerMessage,
  verifyMessengerSignature,
  parseMessengerWebhook,
  getMessengerUserProfile,
} from '@/lib/messenger'
import {
  findCompanyByPageId,
  getMessengerChannel,
  saveMessengerMessage,
  getMessengerHistory,
  getBusinessProfile,
  getFAQs,
  getActiveInstructions,
  getKnowledgeDocuments,
} from '@/lib/messenger-firestore'
import { buildToneConfiguration } from '@/lib/groq'
import type { ToneConfig } from '@/types'

// Webhook verification token (should match what you set in Facebook App)
const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || 'botsy-messenger-verify'

/**
 * GET - Webhook verification (Facebook sends this to verify your endpoint)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Check if this is a verification request
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST - Receive incoming messages from Facebook
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ status: 'ok' })
    }

    // Parse incoming messages
    const messages = parseMessengerWebhook(body)

    if (messages.length === 0) {
      // No messages to process (could be delivery/read receipts)
      return NextResponse.json({ status: 'ok' })
    }

    // Process each message
    for (const message of messages) {
      await processMessage(message, rawBody, request.headers.get('x-hub-signature-256'))
    }

    // Always return 200 quickly to Facebook
    return NextResponse.json({ status: 'ok' })
  } catch {
    // Still return 200 to prevent Facebook from retrying
    return NextResponse.json({ status: 'error' })
  }
}

async function processMessage(
  message: {
    senderId: string
    recipientId: string
    text: string
    timestamp: number
    messageId: string
  },
  rawBody: string,
  signature: string | null
) {
  try {
    // Find company by Page ID (recipientId is the Page ID)
    const companyId = await findCompanyByPageId(message.recipientId)

    if (!companyId) {
      return
    }

    // Get Messenger channel configuration
    const channel = await getMessengerChannel(companyId)

    if (!channel || !channel.isActive) {
      return
    }

    // Verify signature if we have the app secret
    if (channel.credentials.appSecret && signature) {
      const isValid = verifyMessengerSignature(
        channel.credentials.appSecret,
        signature,
        rawBody
      )

      if (!isValid) {
        return
      }
    }

    // Save incoming message
    await saveMessengerMessage(companyId, message.senderId, {
      direction: 'inbound',
      senderId: message.senderId,
      text: message.text,
      timestamp: new Date(message.timestamp),
      messageId: message.messageId,
    })

    // Get user profile for personalization
    const userProfile = channel.credentials.pageAccessToken
      ? await getMessengerUserProfile(message.senderId, channel.credentials.pageAccessToken)
      : null

    // Get context for AI (including knowledge documents)
    const [businessProfile, faqs, instructions, history, knowledgeDocs] = await Promise.all([
      getBusinessProfile(companyId),
      getFAQs(companyId),
      getActiveInstructions(companyId),
      getMessengerHistory(companyId, message.senderId, 10),
      getKnowledgeDocuments(companyId),
    ])

    // Debug: Log tone configuration
    const bp = businessProfile as { toneConfig?: { useEmojis?: boolean } } | null
    console.log('[Messenger] ToneConfig:', {
      hasToneConfig: !!bp?.toneConfig,
      useEmojis: bp?.toneConfig?.useEmojis,
      toneConfigFull: bp?.toneConfig
    })

    // Generate AI response
    const aiResponse = await generateAIResponse({
      userMessage: message.text,
      userName: userProfile?.firstName,
      businessProfile,
      faqs,
      instructions,
      history,
      knowledgeDocs,
    })

    // Send response via Messenger
    if (channel.credentials.pageAccessToken) {
      const result = await sendMessengerMessage(
        { pageAccessToken: channel.credentials.pageAccessToken, appSecret: channel.credentials.appSecret || '' },
        { recipientId: message.senderId, text: aiResponse }
      )

      if (result.success) {
        // Save outgoing message
        await saveMessengerMessage(companyId, message.senderId, {
          direction: 'outbound',
          senderId: message.recipientId,
          text: aiResponse,
          timestamp: new Date(),
          messageId: result.messageId,
        })
      }
    }
  } catch {
    // Error processing message - silently fail to avoid blocking webhook
  }
}

async function generateAIResponse(context: {
  userMessage: string
  userName?: string
  businessProfile: Record<string, unknown> | null
  faqs: Array<Record<string, unknown>>
  instructions: Array<{ content: string; priority: string }>
  history: Array<{ direction: string; text: string }>
  knowledgeDocs?: Array<{
    faqs: Array<{ question: string; answer: string }>
    rules: string[]
    policies: string[]
    importantInfo: string[]
    uploadedAt: Date
    fileName: string
  }>
}): Promise<string> {
  const { userMessage, userName, businessProfile, faqs, instructions, history, knowledgeDocs } = context

  // Check if this is the first message in the conversation
  const isFirstMessage = history.length === 0

  // Extract tone configuration from business profile
  const bp = businessProfile as {
    businessName?: string
    industry?: string
    description?: string
    tone?: 'formal' | 'friendly' | 'casual'
    toneConfig?: ToneConfig
    language?: string
    languageName?: string
    contactInfo?: { email?: string; phone?: string; address?: string; openingHours?: string }
    pricing?: Array<{ item: string; price: string }>
    staff?: Array<{ name: string; role: string; specialty?: string }>
  } | null

  // Build tone guide using shared function
  const toneGuide = buildToneConfiguration(bp?.tone || 'friendly', bp?.toneConfig)

  // Debug: Log tone guide
  console.log('[Messenger] ToneGuide preview:', toneGuide.substring(0, 300))

  // Build system prompt
  let systemPrompt = `Du er en hjelpsom kundeservice-assistent som svarer på Facebook Messenger.

MESSENGER-SPESIFIKKE REGLER:
- Ikke bruk markdown-formatering (Messenger støtter det ikke godt)
${isFirstMessage ? '- Du kan hilse med brukerens navn hvis du har det' : '- IKKE start med "Hei [Navn]!" eller lignende hilsen - gå rett på svar siden dette er en pågående samtale'}

KOMMUNIKASJONSSTIL:
${toneGuide}

VIKTIGE REGLER:
- ALDRI nevn andre kunder, brukere, eller bedrifter som Botsy samarbeider med - dette er konfidensielt
- ALDRI del informasjon om andre brukere eller hvem andre som bruker tjenesten
- KRITISK: ALDRI oversett eller endre e-postadresser, telefonnumre, adresser, URLer, eller navn - de skal gjengis NØYAKTIG som de er

KRITISK - DU KAN BARE SENDE TEKSTMELDINGER:
- Du kan IKKE sende bilder, filer, dokumenter, PDF-er, eller vedlegg
- ALDRI si "jeg sender deg...", "her kommer...", "jeg legger ved...", "se vedlagt..."
- ALDRI lov å sende noe i en separat melding
- Gi informasjon direkte i svaret ditt - ikke lov å sende noe etterpå

EKSTREMT VIKTIG - ALDRI FINN PÅ INFORMASJON:
- ALDRI dikter opp priser, tall, eller fakta som du ikke har fått oppgitt
- Hvis du IKKE har prisinformasjon tilgjengelig, si: "Jeg har dessverre ikke prisinformasjon tilgjengelig. Ta kontakt med oss direkte for priser."
- Hvis du IKKE vet svaret, si det ærlig - IKKE GJETT eller finn på noe
- Bruk KUN informasjon som er eksplisitt gitt til deg i konteksten
- Det er MYE bedre å si "jeg vet ikke" enn å gi feil informasjon

PRIORITERING AV INFORMASJON:
- Hvis det er motstridende informasjon om samme tema, BRUK ALLTID den NYESTE informasjonen
- Dokumenter merket med nyere dato overskriver eldre dokumenter
- Nyere instruksjoner og regler overskriver eldre
- Ved tvil, bruk informasjonen som er oppgitt senest`

  if (bp) {
    systemPrompt += `\n\nDu representerer: ${bp.businessName || 'Bedriften'}`
    if (bp.industry) systemPrompt += `\nBransje: ${bp.industry}`
    if (bp.description) systemPrompt += `\nOm bedriften: ${bp.description}`

    // Contact information (IMPORTANT)
    if (bp.contactInfo) {
      systemPrompt += `\n\nKONTAKTINFORMASJON (bruk NØYAKTIG som oppgitt):`
      if (bp.contactInfo.email) systemPrompt += `\n- E-post: ${bp.contactInfo.email}`
      if (bp.contactInfo.phone) systemPrompt += `\n- Telefon: ${bp.contactInfo.phone}`
      if (bp.contactInfo.address) systemPrompt += `\n- Adresse: ${bp.contactInfo.address}`
      if (bp.contactInfo.openingHours) systemPrompt += `\n- Åpningstider: ${bp.contactInfo.openingHours}`
    }

    // Pricing information (IMPORTANT)
    if (bp.pricing && bp.pricing.length > 0) {
      systemPrompt += `\n\nPRISER (bruk denne informasjonen når kunder spør om priser):`
      bp.pricing.forEach((p) => {
        systemPrompt += `\n- ${p.item}: ${p.price}`
      })
    }

    // Staff information
    if (bp.staff && bp.staff.length > 0) {
      systemPrompt += `\n\nANSATTE/TEAM:`
      bp.staff.forEach((s) => {
        systemPrompt += `\n- ${s.name}: ${s.role}${s.specialty ? ` (${s.specialty})` : ''}`
      })
    }

    // Language handling
    const websiteLanguage = bp.language || 'no'
    const websiteLanguageName = bp.languageName || 'Norsk'
    systemPrompt += `\n\nSPRÅKHÅNDTERING:
- Nettsidens primærspråk er: ${websiteLanguageName}
- Som standard skal du svare på ${websiteLanguageName}
- VIKTIG: Hvis kunden skriver på et ANNET språk, skal du automatisk bytte til kundens språk`

  }

  if (instructions.length > 0) {
    systemPrompt += '\n\nSpesielle instruksjoner:'
    for (const inst of instructions) {
      systemPrompt += `\n- ${inst.content}`
    }
  }

  if (faqs.length > 0) {
    systemPrompt += `\n\nKUNNSKAPSBASE:
VIKTIG: ALDRI kopier svarene ordrett - bruk din egen formulering. Forstå innholdet og forklar det naturlig med egne ord. Tilpass til samtalen.

Tilgjengelig kunnskap:`
    for (const faq of faqs.slice(0, 10)) {
      const question = faq.question as string | undefined
      const answer = faq.answer as string | undefined
      if (question && answer) {
        systemPrompt += `\nTema: ${question}\nInfo: ${answer}`
      }
    }
  }

  // Add knowledge from uploaded documents (sorted by newest first)
  if (knowledgeDocs && knowledgeDocs.length > 0) {
    systemPrompt += '\n\n=== BEDRIFTSDOKUMENTER (omformuler alltid med egne ord) ==='

    // Process each document with date info for AI to understand priority
    for (const doc of knowledgeDocs) {
      const dateStr = doc.uploadedAt.toISOString().split('T')[0]
      systemPrompt += `\n\n--- Fra dokument: ${doc.fileName} (lastet opp: ${dateStr}) ---`

      // FAQs from this document
      if (doc.faqs.length > 0) {
        systemPrompt += '\nKunnskap (omformuler):'
        for (const faq of doc.faqs.slice(0, 10)) {
          systemPrompt += `\nTema: ${faq.question}\nInfo: ${faq.answer}`
        }
      }

      // Important info from this document
      if (doc.importantInfo.length > 0) {
        systemPrompt += '\nViktig info:'
        for (const info of doc.importantInfo) {
          systemPrompt += `\n- ${info}`
        }
      }

      // Rules from this document
      if (doc.rules.length > 0) {
        systemPrompt += '\nRegler:'
        for (const rule of doc.rules) {
          systemPrompt += `\n- ${rule}`
        }
      }

      // Policies from this document
      if (doc.policies.length > 0) {
        systemPrompt += '\nRetningslinjer:'
        for (const policy of doc.policies) {
          systemPrompt += `\n- ${policy}`
        }
      }
    }

    systemPrompt += '\n\n=== SLUTT PÅ DOKUMENTER ==='
  }

  // Build conversation history
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // Add conversation history (filter out error messages to prevent AI from learning bad patterns)
  const errorPatterns = [
    'Beklager, jeg kunne ikke behandle meldingen',
    'Prøv igjen senere',
    'En feil oppstod',
  ]

  for (const msg of history.slice(-6)) {
    // Skip error messages from history
    const isErrorMessage = errorPatterns.some(pattern => msg.text?.includes(pattern))
    if (isErrorMessage && msg.direction === 'outbound') {
      continue
    }

    messages.push({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.text,
    })
  }

  // Add current message (only include name on first message)
  const userMessageContent = (userName && isFirstMessage)
    ? `[Kunde: ${userName}] ${userMessage}`
    : userMessage
  messages.push({ role: 'user', content: userMessageContent })

  // Use shared AI provider (Gemini primary, Groq fallback)
  const { generateAIResponse } = await import('@/lib/ai-providers')
  const result = await generateAIResponse(systemPrompt, messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, { maxTokens: 500, temperature: 0.7 })

  // Debug: Log which AI provider was used
  console.log('[Messenger] AI Response:', {
    success: result.success,
    provider: result.provider,
    responsePreview: result.response?.substring(0, 100)
  })

  if (result.success) {
    return result.response
  }

  return 'Beklager, jeg kunne ikke behandle meldingen din akkurat nå. Prøv igjen senere.'
}

