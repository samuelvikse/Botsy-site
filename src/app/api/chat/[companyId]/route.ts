import { NextRequest, NextResponse } from 'next/server'
import { chatWithCustomer } from '@/lib/groq'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { createEscalation, getEscalation } from '@/lib/escalation-firestore'
import { sendEscalationNotifications } from '@/lib/push-notifications'
import { incrementPositiveFeedback } from '@/lib/leaderboard-firestore'
import type { BusinessProfile, Instruction } from '@/types'

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
  greeting: 'Hei! 👋 Jeg er Botsy. Hvordan kan jeg hjelpe deg i dag?',
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

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI-tjenesten er ikke konfigurert. Legg til GROQ_API_KEY.' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Demo mode - use demo data
    const isDemo = companyId === 'demo'

    let businessProfile: BusinessProfile
    let instructions: Instruction[] = []
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (isDemo) {
      businessProfile = DEMO_PROFILE
    } else {
      // Use Firebase Client SDK
      const app = getFirebaseApp()
      const db = getFirestore(app)

      // Get company data
      const companyRef = doc(db, 'companies', companyId)
      const companyDoc = await getDoc(companyRef)

      if (!companyDoc.exists()) {
        return NextResponse.json(
          { success: false, error: 'Bedrift ikke funnet. Prøv /widget/demo for testing.' },
          { status: 404 }
        )
      }

      const companyData = companyDoc.data()

      if (!companyData?.businessProfile) {
        return NextResponse.json(
          { success: false, error: 'Bedriftsprofil ikke konfigurert. Fullfør onboarding først.' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (!companyData?.widgetSettings?.isEnabled) {
        return NextResponse.json(
          { success: false, error: 'Chat er ikke aktivert for denne bedriften' },
          { status: 403, headers: corsHeaders }
        )
      }

      businessProfile = {
        ...companyData.businessProfile,
        lastAnalyzed: companyData.businessProfile.lastAnalyzed?.toDate?.() || new Date(),
        faqs: companyData.businessProfile.faqs || [],
      }

      // Get instructions
      try {
        const instructionsRef = collection(db, 'companies', companyId, 'instructions')
        const instructionsQuery = query(
          instructionsRef,
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        )
        const instructionsSnapshot = await getDocs(instructionsQuery)

        instructions = instructionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          startsAt: doc.data().startsAt?.toDate?.() || null,
          expiresAt: doc.data().expiresAt?.toDate?.() || null,
        })) as Instruction[]
      } catch {
        // Silently continue without instructions
      }

      // Get chat history and check manual mode
      let isManualMode = false
      try {
        const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
        const sessionDoc = await getDoc(sessionRef)

        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data()
          isManualMode = sessionData?.isManualMode || false
          history = (sessionData?.messages || []).map((msg: { role: 'user' | 'assistant'; content: string }) => ({
            role: msg.role,
            content: msg.content,
          }))
        }
      } catch {
        // Silently continue without history
      }

      // Save user message
      try {
        const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
        const sessionDoc = await getDoc(sessionRef)

        const userMessageData = {
          role: 'user',
          content: message,
          timestamp: new Date(),
        }

        if (sessionDoc.exists()) {
          const existingData = sessionDoc.data()
          await updateDoc(sessionRef, {
            messages: [
              ...(existingData?.messages || []),
              userMessageData,
            ],
            updatedAt: new Date(),
          })
        } else {
          await setDoc(sessionRef, {
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [userMessageData],
          })
        }
      } catch {
        // Silently continue - message saving is not critical
      }

      // If in manual mode, check for positive feedback and return waiting message
      if (isManualMode) {
        // Check if this is positive feedback for an employee
        if (detectPositiveFeedback(message)) {
          try {
            const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
            const sessionDoc = await getDoc(sessionRef)

            if (sessionDoc.exists()) {
              const sessionData = sessionDoc.data()
              const escalationId = sessionData?.escalationId

              if (escalationId) {
                const escalation = await getEscalation(escalationId)
                if (escalation && escalation.claimedBy) {
                  // Track positive feedback for the employee who helped
                  await incrementPositiveFeedback(escalation.claimedBy, companyId)
                }
              }
            }
          } catch (feedbackError) {
            console.error('Error tracking positive feedback:', feedbackError)
          }
        }

        return NextResponse.json({
          success: true,
          reply: 'En kundebehandler vil svare deg snart.',
          isManualMode: true,
        }, { headers: corsHeaders })
      }

      // Check for human handoff request
      if (detectHumanHandoff(message)) {
        try {
          // Create escalation
          const escalationId = await createEscalation({
            companyId,
            conversationId: sessionId,
            channel: 'widget',
            customerIdentifier: `Besøkende ${sessionId.slice(0, 8)}`,
            customerMessage: message,
            status: 'pending',
          })

          // Send push notifications to all subscribed employees
          await sendEscalationNotifications(
            companyId,
            `Besøkende ${sessionId.slice(0, 8)}`,
            message,
            sessionId,
            'widget'
          )

          // Set session to manual mode
          const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
          await updateDoc(sessionRef, {
            isManualMode: true,
            escalationId,
            updatedAt: new Date(),
          })

          // Save escalation response
          const sessionDoc = await getDoc(sessionRef)
          if (sessionDoc.exists()) {
            const sessionData = sessionDoc.data()
            await updateDoc(sessionRef, {
              messages: [
                ...(sessionData?.messages || []),
                {
                  role: 'assistant',
                  content: 'Jeg forstår at du ønsker å snakke med en av våre ansatte. Jeg har varslet teamet vårt, og noen vil ta kontakt med deg så snart som mulig. 🙋‍♂️',
                  timestamp: new Date(),
                },
              ],
              updatedAt: new Date(),
            })
          }

          return NextResponse.json({
            success: true,
            reply: 'Jeg forstår at du ønsker å snakke med en av våre ansatte. Jeg har varslet teamet vårt, og noen vil ta kontakt med deg så snart som mulig. 🙋‍♂️',
            isManualMode: true,
            escalated: true,
          }, { headers: corsHeaders })
        } catch (escalationError) {
          console.error('Error creating escalation:', escalationError)
          // Continue with normal AI response if escalation fails
        }
      }

      // Fetch knowledge documents (include uploadedAt and fileName for prioritization)
      let knowledgeDocuments: Array<{
        faqs: Array<{ question: string; answer: string }>
        rules: string[]
        policies: string[]
        importantInfo: string[]
        uploadedAt: Date
        fileName: string
      }> = []

      try {
        const docsRef = collection(db, 'companies', companyId, 'knowledgeDocs')
        const docsQuery = query(docsRef, where('status', '==', 'ready'))
        const docsSnapshot = await getDocs(docsQuery)

        knowledgeDocuments = docsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data.analyzedData,
            uploadedAt: data.uploadedAt?.toDate?.() || new Date(data.uploadedAt),
            fileName: data.fileName || 'Ukjent dokument',
          }
        })
      } catch {
        // Continue without knowledge documents - not critical
      }

      // Generate response (with or without knowledge documents)
      const reply = await chatWithCustomer(message, {
        businessProfile,
        faqs: businessProfile.faqs,
        instructions,
        conversationHistory: history,
        knowledgeDocuments: knowledgeDocuments.length > 0 ? knowledgeDocuments : undefined,
      })

      // Save assistant response
      try {
        const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
        const sessionDoc = await getDoc(sessionRef)

        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data()
          await updateDoc(sessionRef, {
            messages: [
              ...(sessionData?.messages || []),
              { role: 'assistant', content: reply, timestamp: new Date() },
            ],
            updatedAt: new Date(),
          })
        }
      } catch {
        // Silently continue - message saving is not critical
      }

      return NextResponse.json({
        success: true,
        reply,
      }, { headers: corsHeaders })
    }

    // Generate response (for demo mode only)
    const reply = await chatWithCustomer(message, {
      businessProfile,
      faqs: businessProfile.faqs,
      instructions,
      conversationHistory: history,
    })

    return NextResponse.json({
      success: true,
      reply,
    }, { headers: corsHeaders })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'En ukjent feil oppstod'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET endpoint to retrieve widget configuration
export async function GET(
  request: NextRequest,
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
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: `Kunne ikke hente konfigurasjon: ${errorMessage}` },
      { status: 500 }
    )
  }
}
