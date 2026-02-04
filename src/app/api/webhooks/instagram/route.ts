import { NextRequest, NextResponse } from 'next/server'
import {
  findCompanyByInstagramPageId,
  getInstagramChannel,
  saveInstagramMessage,
  getInstagramHistory,
  getBusinessProfile,
  getFAQs,
  getActiveInstructions,
  getKnowledgeDocuments,
  getInstagramChatManualMode,
} from '@/lib/instagram-firestore'
import { sendInstagramMessage } from '@/lib/instagram'
import { buildToneConfiguration } from '@/lib/groq'
import { createEscalation } from '@/lib/escalation-firestore'
import { sendEscalationNotifications } from '@/lib/push-notifications'
import { isSubscriptionActive, getInactiveSubscriptionMessage } from '@/lib/subscription-check'
import type { ToneConfig } from '@/types'

// Phrases that indicate user wants human assistance
const HUMAN_HANDOFF_PHRASES = [
  'snakke med en ansatt',
  'snakke med et menneske',
  'snakke med en person',
  'snakke med kundeservice',
  'snakke med support',
  'ekte person',
  'ekte menneske',
  'menneskelig hjelp',
  'kontakte dere',
  'ringe dere',
  'få hjelp av en ansatt',
  'talk to a human',
  'talk to a person',
  'real person',
  'human agent',
  'customer service',
  'speak to someone',
]

function detectHumanHandoff(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return HUMAN_HANDOFF_PHRASES.some(phrase => lowerMessage.includes(phrase))
}

// Webhook verification token - hardcoded for reliability
const VERIFY_TOKEN = 'botsy_webhook_secret_2024'

/**
 * GET - Webhook verification (Facebook/Instagram sends this to verify your endpoint)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Debug logging
  console.log('[Instagram Webhook] Verification request:', {
    mode,
    token,
    challenge,
    expectedToken: VERIFY_TOKEN,
    envToken: process.env.WEBHOOK_VERIFY_TOKEN,
    tokenMatch: token === VERIFY_TOKEN
  })

  // Check if this is a verification request
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram Webhook] Verification successful')
    return new NextResponse(challenge, { status: 200 })
  }

  console.log('[Instagram Webhook] Verification failed - token mismatch')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST - Receive incoming messages from Instagram
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    console.log('[Instagram Webhook] Received:', rawBody)

    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ status: 'ok' })
    }

    // Instagram messages come in this format
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        // Instagram Business Account ID
        const instagramAccountId = entry.id

        for (const messagingEvent of entry.messaging || []) {
          await processInstagramMessage(instagramAccountId, messagingEvent)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Instagram Webhook] Error:', error)
    return NextResponse.json({ status: 'error' })
  }
}

async function processInstagramMessage(
  instagramAccountId: string,
  event: {
    sender: { id: string }
    recipient: { id: string }
    timestamp: number
    message?: {
      mid: string
      text?: string
    }
  }
) {
  try {
    // Skip if no message text (could be a reaction, story reply, etc.)
    if (!event.message?.text) {
      console.log('[Instagram] Skipping non-text message')
      return
    }

    const senderId = event.sender.id
    const messageText = event.message.text
    const messageId = event.message.mid
    const timestamp = event.timestamp

    console.log('[Instagram] Processing message:', {
      instagramAccountId,
      senderId,
      messageText: messageText.substring(0, 50),
    })

    // Find company by Instagram Page ID
    const companyId = await findCompanyByInstagramPageId(instagramAccountId)

    if (!companyId) {
      console.log('[Instagram] No company found for Instagram account:', instagramAccountId)
      return
    }

    // Check subscription status
    const hasActiveSubscription = await isSubscriptionActive(companyId)
    if (!hasActiveSubscription) {
      console.log('[Instagram] Subscription inactive for company:', companyId)
      // Send polite message that service is unavailable
      const channel = await getInstagramChannel(companyId)
      if (channel?.credentials?.pageAccessToken) {
        await sendInstagramMessage(
          channel.credentials.pageAccessToken,
          senderId,
          getInactiveSubscriptionMessage('no')
        )
      }
      return
    }

    // Get Instagram channel configuration
    const channel = await getInstagramChannel(companyId)
    console.log('[Instagram] Channel config:', JSON.stringify(channel, null, 2))

    if (!channel || !channel.isActive) {
      console.log('[Instagram] Channel not active for company:', companyId)
      return
    }

    // Save incoming message
    await saveInstagramMessage(companyId, senderId, {
      direction: 'inbound',
      senderId,
      text: messageText,
      timestamp: new Date(timestamp),
      messageId,
    })

    // Check if chat is in manual mode
    const isManualMode = await getInstagramChatManualMode(companyId, senderId)
    if (isManualMode) {
      console.log('[Instagram] Chat is in manual mode, skipping AI response')
      return
    }

    // Check for human handoff request
    if (detectHumanHandoff(messageText)) {
      try {
        console.log('[Instagram] Human handoff detected, creating escalation')

        await createEscalation({
          companyId,
          conversationId: `instagram-${senderId}`,
          channel: 'instagram',
          customerIdentifier: `Instagram ${senderId.slice(-6)}`,
          customerMessage: messageText,
          status: 'pending',
        })

        await sendEscalationNotifications(
          companyId,
          `Instagram ${senderId.slice(0, 8)}`,
          messageText,
          senderId,
          'instagram'
        )

        // Send escalation response
        if (channel.credentials.pageAccessToken) {
          const escalationResponse = 'Jeg forstår at du ønsker å snakke med en av våre ansatte. Jeg har varslet teamet vårt, og noen vil ta kontakt med deg så snart som mulig.'

          await sendInstagramMessage(
            channel.credentials.pageAccessToken,
            senderId,
            escalationResponse
          )

          await saveInstagramMessage(companyId, senderId, {
            direction: 'outbound',
            senderId: instagramAccountId,
            text: escalationResponse,
            timestamp: new Date(),
            messageId: `esc-${Date.now()}`,
          })
        }

        return
      } catch (error) {
        console.error('[Instagram] Error creating escalation:', error)
      }
    }

    // Get context for AI response
    console.log('[Instagram] Fetching context for AI response...')
    const [businessProfile, faqs, instructions, history, knowledgeDocs] = await Promise.all([
      getBusinessProfile(companyId),
      getFAQs(companyId),
      getActiveInstructions(companyId),
      getInstagramHistory(companyId, senderId, 10),
      getKnowledgeDocuments(companyId),
    ])
    console.log('[Instagram] Context fetched, generating AI response...')

    // Generate AI response
    const aiResponse = await generateAIResponse({
      userMessage: messageText,
      businessProfile,
      faqs,
      instructions,
      history,
      knowledgeDocs,
    })
    console.log('[Instagram] AI response generated:', aiResponse.substring(0, 100))

    // Send response via Instagram
    if (channel.credentials.pageAccessToken) {
      console.log('[Instagram] Sending response via Instagram API...')
      const result = await sendInstagramMessage(
        channel.credentials.pageAccessToken,
        senderId,
        aiResponse
      )
      console.log('[Instagram] Send result:', result)

      if (result.success) {
        await saveInstagramMessage(companyId, senderId, {
          direction: 'outbound',
          senderId: instagramAccountId,
          text: aiResponse,
          timestamp: new Date(),
          messageId: result.messageId || `ig-${Date.now()}`,
        })
        console.log('[Instagram] Response saved to history')
      }
    } else {
      console.error('[Instagram] No pageAccessToken found!')
    }
  } catch (error) {
    console.error('[Instagram] Error processing message:', error)
  }
}

async function generateAIResponse(context: {
  userMessage: string
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
  const { userMessage, businessProfile, faqs, instructions, history, knowledgeDocs } = context

  const isFirstMessage = history.length === 0

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

  const toneGuide = buildToneConfiguration(bp?.tone || 'friendly', bp?.toneConfig)
  const useEmojis = bp?.toneConfig?.useEmojis ?? false
  const emojiTopInstruction = useEmojis
    ? ''
    : `⚠️ KRITISK REGEL - LES FØRST: Du skal ALDRI bruke emojis i svarene dine. INGEN emojis overhodet.\n\n`

  let systemPrompt = `${emojiTopInstruction}Du er en hjelpsom kundeservice-assistent som svarer på Instagram DMs.

INSTAGRAM-SPESIFIKKE REGLER:
- Hold svar korte og konsise (Instagram er en mobil-først plattform)
- Ikke bruk markdown-formatering
${isFirstMessage ? '- Du kan hilse hyggelig siden dette er første melding' : '- IKKE start med hilsen - gå rett på svar siden dette er en pågående samtale'}
${!useEmojis ? '- ALDRI bruk emojis' : ''}

KOMMUNIKASJONSSTIL:
${toneGuide}

VIKTIGE REGLER:
- ALDRI nevn andre kunder eller bedrifter som bruker tjenesten
- KRITISK: ALDRI oversett kontaktinfo - gjengi NØYAKTIG som oppgitt
- Hvis kunden spør om noe urelatert, svar høflig at du hjelper med spørsmål om bedriften

KRITISK - DU KAN BARE SENDE TEKSTMELDINGER:
- Du kan IKKE sende bilder, filer, eller vedlegg
- ALDRI lov å sende noe i en separat melding

EKSTREMT VIKTIG - ALDRI FINN PÅ INFORMASJON:
- ALDRI dikter opp priser eller fakta
- Hvis du IKKE vet svaret, si det ærlig`

  if (bp) {
    systemPrompt += `\n\nDu representerer: ${bp.businessName || 'Bedriften'}`
    if (bp.industry) systemPrompt += `\nBransje: ${bp.industry}`
    if (bp.description) systemPrompt += `\nOm bedriften: ${bp.description}`

    if (bp.contactInfo) {
      systemPrompt += `\n\nKONTAKTINFO:`
      if (bp.contactInfo.email) systemPrompt += `\n- E-post: ${bp.contactInfo.email}`
      if (bp.contactInfo.phone) systemPrompt += `\n- Telefon: ${bp.contactInfo.phone}`
      if (bp.contactInfo.address) systemPrompt += `\n- Adresse: ${bp.contactInfo.address}`
      if (bp.contactInfo.openingHours) systemPrompt += `\n- Åpningstider: ${bp.contactInfo.openingHours}`
    }

    if (bp.pricing && bp.pricing.length > 0) {
      systemPrompt += `\n\nPRISER:`
      bp.pricing.forEach((p) => {
        systemPrompt += `\n- ${p.item}: ${p.price}`
      })
    }

    const websiteLanguage = bp.language || 'no'
    const websiteLanguageName = bp.languageName || 'Norsk'
    systemPrompt += `\n\nSPRÅK: Svar på ${websiteLanguageName}. Bytt til kundens språk hvis de skriver på et annet språk.`
  }

  if (instructions.length > 0) {
    systemPrompt += '\n\nInstruksjoner:'
    for (const inst of instructions) {
      systemPrompt += `\n- ${inst.content}`
    }
  }

  if (faqs.length > 0) {
    systemPrompt += `\n\nKUNNSKAPSBASE:`
    for (const faq of faqs.slice(0, 10)) {
      const question = faq.question as string | undefined
      const answer = faq.answer as string | undefined
      if (question && answer) {
        systemPrompt += `\n- ${question}: ${answer}`
      }
    }
  }

  if (knowledgeDocs && knowledgeDocs.length > 0) {
    systemPrompt += `\n\nDOKUMENTER:`
    for (const doc of knowledgeDocs) {
      if (doc.faqs.length > 0) {
        for (const faq of doc.faqs.slice(0, 5)) {
          systemPrompt += `\n- ${faq.question}: ${faq.answer}`
        }
      }
      if (doc.importantInfo.length > 0) {
        for (const info of doc.importantInfo) {
          systemPrompt += `\n- ${info}`
        }
      }
    }
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  for (const msg of history.slice(-6)) {
    messages.push({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.text,
    })
  }

  messages.push({ role: 'user', content: userMessage })

  const { generateAIResponse } = await import('@/lib/ai-providers')
  const result = await generateAIResponse(
    systemPrompt,
    messages,
    { maxTokens: 200, temperature: 0.7 }
  )

  if (result.success) {
    return result.response
  }

  return 'Beklager, jeg kunne ikke behandle meldingen din akkurat nå. Prøv igjen senere.'
}

