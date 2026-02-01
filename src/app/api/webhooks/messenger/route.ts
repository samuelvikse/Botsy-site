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
    console.log('[Messenger Webhook] Verification successful')
    return new NextResponse(challenge, { status: 200 })
  }

  console.log('[Messenger Webhook] Verification failed:', { mode, token })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST - Receive incoming messages from Facebook
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    console.log('[Messenger Webhook] Received POST request, body length:', rawBody.length)

    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('[Messenger Webhook] Failed to parse JSON:', parseError)
      return NextResponse.json({ status: 'ok' })
    }

    console.log('[Messenger Webhook] Parsed body object:', body.object)

    // Parse incoming messages
    const messages = parseMessengerWebhook(body)
    console.log('[Messenger Webhook] Parsed messages count:', messages.length)

    if (messages.length === 0) {
      // No messages to process (could be delivery/read receipts)
      console.log('[Messenger Webhook] No messages to process')
      return NextResponse.json({ status: 'ok' })
    }

    // Process each message
    for (const message of messages) {
      console.log('[Messenger Webhook] Processing message from:', message.senderId)
      await processMessage(message, rawBody, request.headers.get('x-hub-signature-256'))
    }

    // Always return 200 quickly to Facebook
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Messenger Webhook] Error:', error)
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
    console.log('[Messenger] Processing message:', {
      from: message.senderId,
      to: message.recipientId,
      text: message.text.substring(0, 50),
    })

    // Find company by Page ID (recipientId is the Page ID)
    console.log('[Messenger] Looking up company for Page ID:', message.recipientId)
    const companyId = await findCompanyByPageId(message.recipientId)

    if (!companyId) {
      console.log('[Messenger] No company found for Page ID:', message.recipientId)
      return
    }
    console.log('[Messenger] Found company:', companyId)

    // Get Messenger channel configuration
    const channel = await getMessengerChannel(companyId)
    console.log('[Messenger] Channel config:', channel ? { isActive: channel.isActive, isVerified: channel.isVerified, hasToken: !!channel.credentials.pageAccessToken } : null)

    if (!channel || !channel.isActive) {
      console.log('[Messenger] Channel not active for company:', companyId)
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
        console.error('[Messenger] Invalid signature')
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

    // Generate AI response
    console.log('[Messenger] Generating AI response for company:', companyId, 'with', knowledgeDocs.length, 'knowledge docs')
    const aiResponse = await generateAIResponse({
      userMessage: message.text,
      userName: userProfile?.firstName,
      businessProfile,
      faqs,
      instructions,
      history,
      knowledgeDocs,
    })
    console.log('[Messenger] AI response generated, length:', aiResponse.length)

    // Send response via Messenger
    if (channel.credentials.pageAccessToken) {
      console.log('[Messenger] Sending response to:', message.senderId)
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

        console.log('[Messenger] Response sent successfully')
      } else {
        console.error('[Messenger] Failed to send response:', result.error)
      }
    }
  } catch (error) {
    console.error('[Messenger] Error processing message:', error)
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
  }>
}): Promise<string> {
  const { userMessage, userName, businessProfile, faqs, instructions, history, knowledgeDocs } = context

  // Check if this is the first message in the conversation
  const isFirstMessage = history.length === 0

  // Build system prompt
  let systemPrompt = `Du er en hjelpsom kundeservice-assistent som svarer på Facebook Messenger.

VIKTIG:
- Hold svarene korte og konsise (maks 2-3 setninger når mulig)
- Vær vennlig og profesjonell
- Ikke bruk markdown-formatering (Messenger støtter det ikke godt)
- Bruk emoji sparsomt og naturlig
- ALDRI nevn andre kunder, brukere, eller bedrifter som Botsy samarbeider med - dette er konfidensielt
- ALDRI del informasjon om andre brukere eller hvem andre som bruker tjenesten
${isFirstMessage ? '- Du kan hilse med brukerens navn hvis du har det' : '- IKKE start med "Hei [Navn]!" eller lignende hilsen - gå rett på svar siden dette er en pågående samtale'}
- KRITISK: ALDRI oversett eller endre e-postadresser, telefonnumre, adresser, URLer, eller navn - de skal gjengis NØYAKTIG som de er`

  if (businessProfile) {
    const bp = businessProfile as {
      businessName?: string
      industry?: string
      description?: string
      tone?: string
      language?: string
      languageName?: string
      contactInfo?: { email?: string; phone?: string; address?: string; openingHours?: string }
      pricing?: Array<{ item: string; price: string }>
      staff?: Array<{ name: string; role: string; specialty?: string }>
    }
    systemPrompt += `\n\nDu representerer: ${bp.businessName || 'Bedriften'}`
    if (bp.industry) systemPrompt += `\nBransje: ${bp.industry}`
    if (bp.description) systemPrompt += `\nOm bedriften: ${bp.description}`
    if (bp.tone) systemPrompt += `\nTonefall: ${bp.tone}`

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
    systemPrompt += '\n\nVanlige spørsmål og svar:'
    for (const faq of faqs.slice(0, 10)) {
      const question = faq.question as string | undefined
      const answer = faq.answer as string | undefined
      if (question && answer) {
        systemPrompt += `\nQ: ${question}\nA: ${answer}`
      }
    }
  }

  // Add knowledge from uploaded documents
  if (knowledgeDocs && knowledgeDocs.length > 0) {
    // Collect all FAQs from documents
    const docFaqs = knowledgeDocs.flatMap(doc => doc.faqs)
    if (docFaqs.length > 0) {
      systemPrompt += '\n\nEkstra spørsmål og svar fra bedriftsdokumenter:'
      for (const faq of docFaqs.slice(0, 15)) {
        systemPrompt += `\nQ: ${faq.question}\nA: ${faq.answer}`
      }
    }

    // Collect all rules
    const allRules = knowledgeDocs.flatMap(doc => doc.rules)
    if (allRules.length > 0) {
      systemPrompt += '\n\nBedriftsregler (følg alltid disse):'
      for (const rule of allRules) {
        systemPrompt += `\n- ${rule}`
      }
    }

    // Collect all policies
    const allPolicies = knowledgeDocs.flatMap(doc => doc.policies)
    if (allPolicies.length > 0) {
      systemPrompt += '\n\nRetningslinjer og policies:'
      for (const policy of allPolicies) {
        systemPrompt += `\n- ${policy}`
      }
    }

    // Collect important info
    const allInfo = knowledgeDocs.flatMap(doc => doc.importantInfo)
    if (allInfo.length > 0) {
      systemPrompt += '\n\nViktig informasjon:'
      for (const info of allInfo) {
        systemPrompt += `\n- ${info}`
      }
    }
  }

  // Build conversation history
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // Add conversation history
  for (const msg of history.slice(-6)) {
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

  // Call Groq API
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Messenger] Groq API error:', errorText)
      return 'Beklager, jeg kunne ikke behandle meldingen din akkurat nå. Prøv igjen senere.'
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'Beklager, jeg forstod ikke helt. Kan du prøve å omformulere?'
  } catch (error) {
    console.error('[Messenger] AI generation error:', error)
    return 'Beklager, det oppstod en feil. Vennligst prøv igjen.'
  }
}
