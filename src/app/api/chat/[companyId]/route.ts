import { NextRequest, NextResponse } from 'next/server'
import { chatWithCustomer } from '@/lib/groq'
import { getInactiveSubscriptionMessage } from '@/lib/subscription-check'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { createEscalation, getEscalation } from '@/lib/escalation-firestore'
import { sendEscalationNotifications } from '@/lib/push-notifications'
import { incrementPositiveFeedback } from '@/lib/leaderboard-firestore'
import { logError } from '@/lib/error-logger'
import { scrapeWithFAQPage, formatForAnalysis } from '@/lib/scraper'
import { analyzeWebsiteContent } from '@/lib/groq'
import type { BusinessProfile, Instruction, FAQ } from '@/types'

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

// Phrases that indicate positive feedback/thanks from customer
const POSITIVE_FEEDBACK_PHRASES = [
  'takk',
  'tusen takk',
  'mange takk',
  'takk for hjelpen',
  'takk for svar',
  'flott',
  'supert',
  'perfekt',
  'bra',
  'veldig bra',
  'kjempebra',
  'fantastisk',
  'utmerket',
  'strålende',
  'toppen',
  'tipp topp',
  'thank you',
  'thanks',
  'great',
  'perfect',
  'awesome',
  'excellent',
]

function detectPositiveFeedback(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim()
  // Check if the message is short and contains positive phrases
  // Longer messages might just mention "takk" in passing
  if (lowerMessage.length > 100) return false
  return POSITIVE_FEEDBACK_PHRASES.some(phrase => lowerMessage.includes(phrase))
}

// Phrases that indicate the bot couldn't answer properly
const UNANSWERED_PHRASES = [
  'jeg har dessverre ikke',
  'jeg har ikke informasjon',
  'jeg er usikker',
  'jeg vet ikke',
  'jeg kan dessverre ikke',
  'jeg finner ikke',
  'har ikke nok informasjon',
  'har ikke tilgang til',
  'anbefaler at du kontakter',
  'bør kontakte',
  'ta direkte kontakt',
  'jeg kan ikke svare på',
  'finner ingen informasjon om',
  'unfortunately i don\'t have',
  'i\'m not sure',
  'i don\'t have information',
]

function detectUnansweredQuestion(response: string): boolean {
  const lowerResponse = response.toLowerCase()
  return UNANSWERED_PHRASES.some(phrase => lowerResponse.includes(phrase))
}

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Initialize Firebase Client SDK
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig)
  }
  return getApp()
}

// Auto-setup business profile from website URL
async function autoSetupBusinessProfile(
  companyId: string,
  websiteUrl: string,
  businessName: string
): Promise<BusinessProfile | null> {
  try {
    console.log(`[Chat API] Auto-setting up profile for ${companyId} from ${websiteUrl}`)
    
    // Scrape the website
    const scrapedData = await scrapeWithFAQPage(websiteUrl)
    
    // Format content for analysis
    let formattedContent = formatForAnalysis(scrapedData.mainContent)
    
    if (scrapedData.faqPage) {
      formattedContent += '\n\n--- FAQ-SIDE ---\n' + formatForAnalysis(scrapedData.faqPage)
    }
    if (scrapedData.aboutPage) {
      formattedContent += '\n\n--- OM OSS-SIDE ---\n' + formatForAnalysis(scrapedData.aboutPage)
    }
    
    if (!formattedContent || formattedContent.length < 50) {
      console.log('[Chat API] Not enough content to analyze')
      return null
    }
    
    // Analyze with AI
    const analysisResult = await analyzeWebsiteContent(formattedContent, businessName)
    
    // Build FAQs
    const allFaqs: FAQ[] = []
    const seenQuestions = new Set<string>()
    
    // Add FAQs from scraper
    if (scrapedData.mainContent.rawFaqs) {
      for (const faq of scrapedData.mainContent.rawFaqs) {
        const key = faq.question.toLowerCase().slice(0, 50)
        if (!seenQuestions.has(key)) {
          seenQuestions.add(key)
          allFaqs.push({
            id: `auto-${Date.now()}-${allFaqs.length}`,
            question: faq.question,
            answer: faq.answer,
            source: 'extracted',
            confirmed: false,
          })
        }
      }
    }
    
    // Add FAQs from AI
    if (analysisResult.faqs) {
      for (const faq of analysisResult.faqs) {
        const key = faq.question.toLowerCase().slice(0, 50)
        if (!seenQuestions.has(key)) {
          seenQuestions.add(key)
          allFaqs.push({
            id: `auto-ai-${Date.now()}-${allFaqs.length}`,
            question: faq.question,
            answer: faq.answer,
            source: 'generated',
            confirmed: false,
          })
        }
      }
    }
    
    // Build profile
    const profile: BusinessProfile = {
      websiteUrl,
      businessName: analysisResult.businessName || businessName,
      industry: analysisResult.industry,
      contactInfo: analysisResult.contactInfo,
      pricing: analysisResult.pricing,
      staff: analysisResult.staff,
      tone: analysisResult.tone || 'friendly',
      toneReason: analysisResult.toneReason,
      language: analysisResult.language,
      languageName: analysisResult.languageName,
      targetAudience: analysisResult.targetAudience,
      brandPersonality: analysisResult.brandPersonality,
      services: analysisResult.services || [],
      products: analysisResult.products || [],
      terminology: analysisResult.terminology || [],
      description: analysisResult.description,
      faqs: allFaqs,
      lastAnalyzed: new Date(),
    }
    
    // Save to Firestore
    const app = getFirebaseApp()
    const db = getFirestore(app)
    const companyRef = doc(db, 'companies', companyId)
    
    await updateDoc(companyRef, {
      businessProfile: profile,
      'widgetSettings.isEnabled': true,
    })
    
    console.log(`[Chat API] Successfully auto-setup profile for ${companyId}`)
    return profile
  } catch (error) {
    console.error('[Chat API] Auto-setup failed:', error)
    return null
  }
}

interface ChatRequest {
  message: string
  sessionId: string
}

// Demo data for testing without Firestore
const DEMO_PROFILE: BusinessProfile = {
  websiteUrl: 'https://demo.botsy.no',
  businessName: 'Demo Bedrift',
  industry: 'Teknologi',
  tone: 'friendly',
  toneReason: 'En vennlig tone passer for demo.',
  targetAudience: 'Alle som vil teste Botsy',
  brandPersonality: 'Hjelpsom, vennlig',
  services: ['Kundeservice', 'Support'],
  products: ['Botsy Chat Widget'],
  terminology: [],
  description: 'Dette er en demo-bedrift for å teste Botsy chat-widgeten.',
  faqs: [
    {
      id: 'demo-1',
      question: 'Hva er Botsy?',
      answer: 'Botsy er en AI-drevet kundeservice-chatbot som hjelper bedrifter med å svare kunder automatisk.',
      source: 'generated',
      confirmed: true,
    },
    {
      id: 'demo-2',
      question: 'Hvordan fungerer det?',
      answer: 'Du legger til en liten kode-snutt på nettsiden din, og Botsy lærer fra bedriftsprofilen din for å svare kunder.',
      source: 'generated',
      confirmed: true,
    },
  ],
  lastAnalyzed: new Date(),
}

const DEMO_CONFIG = {
  businessName: 'Demo Bedrift',
  botName: 'Botsy',
  greeting: 'Hei! Jeg er Botsy. Hvordan kan jeg hjelpe deg i dag?',
  primaryColor: '#CCFF00',
  position: 'bottom-right',
  isEnabled: true,
  logoUrl: null,
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params

    let body: ChatRequest
    try {
      body = (await request.json()) as ChatRequest
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ugyldig request body' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { message, sessionId } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Melding er påkrevd' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Session ID er påkrevd' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if at least one AI provider is configured
    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI-tjenesten er ikke konfigurert.' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Demo mode - use demo data
    const isDemo = companyId === 'demo'

    if (isDemo) {
      const reply = await chatWithCustomer(message, {
        businessProfile: DEMO_PROFILE,
        faqs: DEMO_PROFILE.faqs,
        instructions: [],
        conversationHistory: [],
      })
      return NextResponse.json({ success: true, reply }, { headers: corsHeaders })
    }

    // === PHASE 1: Get company data (single fetch - replaces separate subscription check) ===
    const app = getFirebaseApp()
    const db = getFirestore(app)
    const companyRef = doc(db, 'companies', companyId)
    const companyDoc = await getDoc(companyRef)

    if (!companyDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Bedrift ikke funnet. Prøv /widget/demo for testing.' },
        { status: 404, headers: corsHeaders }
      )
    }

    const companyData = companyDoc.data()

    // Check subscription from company data directly (no extra HTTP call)
    if (!companyData?.lifetimeAccess) {
      const status = companyData?.subscriptionStatus
      if (status !== 'active' && status !== 'trialing') {
        return NextResponse.json(
          {
            success: true,
            reply: getInactiveSubscriptionMessage('no'),
            subscriptionInactive: true,
          },
          { headers: corsHeaders }
        )
      }
    }

    // Check if widget is explicitly disabled
    if (companyData?.widgetSettings?.isEnabled === false) {
      return NextResponse.json(
        { success: false, error: 'Chat er ikke aktivert for denne bedriften' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Auto-fix widgetSettings - fire and forget (don't block response)
    if (companyData?.widgetSettings?.isEnabled !== true) {
      updateDoc(companyRef, { 'widgetSettings.isEnabled': true }).catch(() => {})
    }

    // Auto-setup business profile if missing
    let businessProfile: BusinessProfile
    if (!companyData?.businessProfile) {
      const websiteUrl = companyData?.websiteUrl || companyData?.profile?.websiteUrl
      const businessName = companyData?.businessName || companyData?.profile?.businessName || 'Bedrift'

      if (websiteUrl) {
        const autoProfile = await autoSetupBusinessProfile(companyId, websiteUrl, businessName)
        if (autoProfile) {
          businessProfile = autoProfile
        } else {
          return NextResponse.json(
            { success: true, reply: 'Vi setter opp chatten nå. Vennligst prøv igjen om noen sekunder!', isSettingUp: true },
            { headers: corsHeaders }
          )
        }
      } else {
        return NextResponse.json(
          { success: true, reply: 'Chatten er ikke ferdig konfigurert ennå. Ta kontakt med bedriften direkte.', notConfigured: true },
          { headers: corsHeaders }
        )
      }
    } else {
      businessProfile = {
        ...companyData.businessProfile,
        lastAnalyzed: companyData.businessProfile.lastAnalyzed?.toDate?.() || new Date(),
        faqs: companyData.businessProfile.faqs || [],
      }
    }

    // === PHASE 2: Fetch all supporting data in PARALLEL (was sequential) ===
    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)

    const [instructionsResult, sessionResult, knowledgeDocsResult] = await Promise.all([
      // Fetch instructions
      (async () => {
        try {
          const instructionsRef = collection(db, 'companies', companyId, 'instructions')
          const instructionsQuery = query(instructionsRef, where('isActive', '==', true), orderBy('createdAt', 'desc'))
          const snapshot = await getDocs(instructionsQuery)
          return snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.() || new Date(),
            startsAt: d.data().startsAt?.toDate?.() || null,
            expiresAt: d.data().expiresAt?.toDate?.() || null,
          })) as Instruction[]
        } catch { return [] as Instruction[] }
      })(),

      // Fetch session (ONE read - reused everywhere)
      (async () => {
        try {
          const sessionDoc = await getDoc(sessionRef)
          if (sessionDoc.exists()) {
            return sessionDoc.data()
          }
          return null
        } catch { return null }
      })(),

      // Fetch knowledge documents
      (async () => {
        try {
          const docsRef = collection(db, 'companies', companyId, 'knowledgeDocs')
          const docsQuery = query(docsRef, where('status', '==', 'ready'))
          const snapshot = await getDocs(docsQuery)
          return snapshot.docs.map(d => {
            const data = d.data()
            return {
              ...data.analyzedData,
              uploadedAt: data.uploadedAt?.toDate?.() || new Date(data.uploadedAt),
              fileName: data.fileName || 'Ukjent dokument',
            }
          })
        } catch { return [] }
      })(),
    ])

    const instructions = instructionsResult
    const sessionData = sessionResult
    const isManualMode = sessionData?.isManualMode || false
    const existingMessages = sessionData?.messages || []
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = existingMessages.map(
      (msg: { role: 'user' | 'assistant'; content: string }) => ({ role: msg.role, content: msg.content })
    )

    // Save user message - fire and forget (don't block response)
    const userMessageData = { role: 'user', content: message, timestamp: new Date() }
    if (sessionData) {
      updateDoc(sessionRef, {
        messages: [...existingMessages, userMessageData],
        updatedAt: new Date(),
      }).catch(() => {})
    } else {
      setDoc(sessionRef, {
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [userMessageData],
      }).catch(() => {})
    }

    // If in manual mode, check if escalation is still active (with 24h timeout)
    if (isManualMode) {
      let stillActive = false
      const ESCALATION_TIMEOUT_MS = 24 * 60 * 60 * 1000

      if (sessionData?.escalationId) {
        // Use the route's own Firestore instance to check escalation status
        const escalationRef = doc(db, 'escalations', sessionData.escalationId)
        const escalationSnap = await getDoc(escalationRef)
        if (escalationSnap.exists()) {
          const escData = escalationSnap.data()
          if (escData.status === 'pending' || escData.status === 'claimed') {
            // Check if escalation is stale (older than 24 hours)
            const createdAt = escData.createdAt?.toDate?.() || new Date(escData.createdAt)
            const ageMs = Date.now() - new Date(createdAt).getTime()

            if (ageMs < ESCALATION_TIMEOUT_MS) {
              stillActive = true

              // Fire-and-forget positive feedback tracking
              if (detectPositiveFeedback(message) && escData.claimedBy) {
                incrementPositiveFeedback(escData.claimedBy, companyId).catch(() => {})
              }
            } else {
              // Auto-resolve stale escalation
              updateDoc(escalationRef, { status: 'resolved', resolvedAt: new Date() }).catch(() => {})
            }
          }
        }
      }

      if (stillActive) {
        return NextResponse.json({
          success: true,
          reply: 'En kundebehandler vil svare deg snart.',
          isManualMode: true,
        }, { headers: corsHeaders })
      }

      // Escalation is resolved/dismissed/missing/stale but isManualMode was not reset — auto-fix
      updateDoc(sessionRef, { isManualMode: false, escalationId: null }).catch(() => {})
    }

    // Check for human handoff request
    const allowEscalation = companyData?.generalSettings?.allowEscalation !== false
    if (allowEscalation && detectHumanHandoff(message)) {
      try {
        const escalationId = await createEscalation({
          companyId,
          conversationId: `widget-${sessionId}`,
          channel: 'widget',
          customerIdentifier: `Besøkende ${sessionId.slice(-6)}`,
          customerMessage: message,
          status: 'pending',
        })

        const escalationReply = 'Jeg forstår at du ønsker å snakke med en av våre ansatte. Jeg har varslet teamet vårt, og noen vil ta kontakt med deg så snart som mulig.'

        // Fire-and-forget: notifications + session update + save message
        sendEscalationNotifications(companyId, `Besøkende ${sessionId.slice(0, 8)}`, message, sessionId, 'widget').catch(() => {})
        updateDoc(sessionRef, {
          isManualMode: true,
          escalationId,
          messages: [...existingMessages, userMessageData, { role: 'assistant', content: escalationReply, timestamp: new Date() }],
          updatedAt: new Date(),
        }).catch(() => {})

        return NextResponse.json({
          success: true,
          reply: escalationReply,
          isManualMode: true,
          escalated: true,
        }, { headers: corsHeaders })
      } catch (escalationError) {
        console.error('Error creating escalation:', escalationError)
      }
    }

    // === PHASE 3: Generate AI response ===
    let reply = await chatWithCustomer(message, {
      businessProfile,
      faqs: businessProfile.faqs,
      instructions,
      conversationHistory: history,
      knowledgeDocuments: knowledgeDocsResult.length > 0 ? knowledgeDocsResult : undefined,
    })

    // Check email offer (use already-fetched session data, no extra read)
    const userMessageCount = history.filter(m => m.role === 'user').length + 1
    let shouldOfferEmail = false
    if (sessionData) {
      const emailOfferedCount = sessionData.emailOfferedCount || 0
      if (userMessageCount >= 10 && userMessageCount % 10 === 0) {
        const messagesSinceLastOffer = userMessageCount - (emailOfferedCount * 10)
        if (messagesSinceLastOffer >= 10 || emailOfferedCount === 0) {
          shouldOfferEmail = true
        }
      }
    }

    if (shouldOfferEmail && !reply.includes('[EMAIL_REQUEST]')) {
      reply += '\n\n---\n\u{1F4A1} Vil du ha en oppsummering av denne samtalen på e-post?'
    }

    // === PHASE 4: Fire-and-forget background saves (don't block response) ===
    // Save assistant response + unanswered tracking + email offer tracking
    const bgMessages = [...existingMessages, userMessageData, { role: 'assistant', content: reply, timestamp: new Date() }]
    const bgUpdate: Record<string, unknown> = { messages: bgMessages, updatedAt: new Date() }
    if (shouldOfferEmail) {
      bgUpdate.lastEmailOfferAt = new Date()
      bgUpdate.emailOfferedCount = Math.floor(userMessageCount / 10)
    }
    updateDoc(sessionRef, bgUpdate).catch(() => {})

    if (detectUnansweredQuestion(reply)) {
      const unansweredRef = collection(db, 'companies', companyId, 'unansweredQuestions')
      setDoc(doc(unansweredRef), {
        question: message,
        botResponse: reply,
        customerIdentifier: `Besøkende ${sessionId.slice(-6)}`,
        channel: 'widget',
        conversationId: `widget-${sessionId}`,
        sessionId,
        createdAt: new Date(),
        resolved: false,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      reply,
      shouldOfferEmail,
    }, { headers: corsHeaders })
  } catch (error) {
    logError(error, {
      page: '/api/chat/[companyId]',
      action: 'chat_message',
      additionalData: { method: 'POST' },
    }).catch(() => {})

    const errorMessage = error instanceof Error ? error.message : 'En ukjent feil oppstod'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET endpoint to retrieve widget configuration
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params

    // Demo mode
    if (companyId === 'demo') {
      return NextResponse.json({
        success: true,
        config: DEMO_CONFIG,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
    }

    // Use Firebase Client SDK
    const app = getFirebaseApp()
    const db = getFirestore(app)

    const companyRef = doc(db, 'companies', companyId)
    const companyDoc = await getDoc(companyRef)

    if (!companyDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Bedrift ikke funnet. Bruk /widget/demo for testing.' },
        { status: 404, headers: corsHeaders }
      )
    }

    const companyData = companyDoc.data()

    // Auto-fix: If widgetSettings.isEnabled is not set, set it to true
    if (companyData?.widgetSettings?.isEnabled === undefined) {
      try {
        await updateDoc(companyRef, {
          'widgetSettings.isEnabled': true,
        })
      } catch {
        // Non-critical, continue
      }
    }

    // Return public widget config (no sensitive data)
    return NextResponse.json({
      success: true,
      config: {
        businessName: companyData?.businessProfile?.businessName || companyData?.businessName || 'Bedrift',
        botName: companyData?.generalSettings?.botName || 'Botsy',
        greeting: companyData?.widgetSettings?.greeting || 'Hei! Hvordan kan jeg hjelpe deg?',
        primaryColor: companyData?.widgetSettings?.primaryColor || '#CCFF00',
        position: companyData?.widgetSettings?.position || 'bottom-right',
        isEnabled: companyData?.widgetSettings?.isEnabled ?? true,
        logoUrl: companyData?.widgetSettings?.logoUrl || null,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    // Log error with context
    await logError(error, {
      page: '/api/chat/[companyId]',
      action: 'get_widget_config',
      additionalData: {
        method: 'GET',
      },
    })

    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: `Kunne ikke hente konfigurasjon: ${errorMessage}` },
      { status: 500 }
    )
  }
}
