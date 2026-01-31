import { NextRequest, NextResponse } from 'next/server'
import { chatWithCustomer } from '@/lib/groq'
import { db } from '@/lib/firebase'
import {
  getCompany,
  getInstructions,
  saveCustomerMessage,
  getCustomerChatSession,
} from '@/lib/firestore'
import type { BusinessProfile, Instruction } from '@/types'

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
    const body = (await request.json()) as ChatRequest
    const { message, sessionId } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Melding er påkrevd' },
        { status: 400 }
      )
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Session ID er påkrevd' },
        { status: 400 }
      )
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI-tjenesten er ikke konfigurert. Legg til GROQ_API_KEY.' },
        { status: 500 }
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
      // Check if Firestore is configured
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database ikke konfigurert. Prøv /widget/demo for testing.' },
          { status: 500 }
        )
      }

      // Get company data
      const company = await getCompany(companyId)

      if (!company) {
        return NextResponse.json(
          { success: false, error: 'Bedrift ikke funnet. Prøv /widget/demo for testing.' },
          { status: 404 }
        )
      }

      if (!company.businessProfile) {
        return NextResponse.json(
          { success: false, error: 'Bedriftsprofil ikke konfigurert. Fullfør onboarding først.' },
          { status: 400 }
        )
      }

      if (!company.widgetSettings.isEnabled) {
        return NextResponse.json(
          { success: false, error: 'Chat er ikke aktivert for denne bedriften' },
          { status: 403 }
        )
      }

      businessProfile = company.businessProfile
      instructions = await getInstructions(companyId, true)
      history = await getCustomerChatSession(companyId, sessionId)

      // Save user message
      await saveCustomerMessage(companyId, sessionId, {
        role: 'user',
        content: message,
      })
    }

    // Generate response
    const reply = await chatWithCustomer(message, {
      businessProfile,
      faqs: businessProfile.faqs,
      instructions,
      conversationHistory: history,
    })

    // Save assistant response (only for non-demo)
    if (!isDemo && db) {
      await saveCustomerMessage(companyId, sessionId, {
        role: 'assistant',
        content: reply,
      })
    }

    return NextResponse.json({
      success: true,
      reply,
    })
  } catch (error) {
    console.error('Customer chat error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'En ukjent feil oppstod'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
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
      })
    }

    // Check if Firestore is configured
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database ikke konfigurert. Bruk /widget/demo for testing.' },
        { status: 500 }
      )
    }

    const company = await getCompany(companyId)

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Bedrift ikke funnet. Bruk /widget/demo for testing.' },
        { status: 404 }
      )
    }

    // Return public widget config (no sensitive data)
    return NextResponse.json({
      success: true,
      config: {
        businessName: company.businessProfile?.businessName || company.businessName,
        greeting: company.widgetSettings.greeting,
        primaryColor: company.widgetSettings.primaryColor,
        position: company.widgetSettings.position,
        isEnabled: company.widgetSettings.isEnabled,
        logoUrl: company.widgetSettings.logoUrl || null,
      },
    })
  } catch (error) {
    console.error('Widget config error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil'
    return NextResponse.json(
      { success: false, error: `Kunne ikke hente konfigurasjon: ${errorMessage}` },
      { status: 500 }
    )
  }
}
