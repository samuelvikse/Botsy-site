import { NextRequest, NextResponse } from 'next/server'
import {
  getBusinessProfile,
  getFAQs,
  getActiveInstructions,
  getEmailHistory,
  getKnowledgeDocuments,
} from '@/lib/email-firestore'
import { generateEmailAIResponse } from '@/lib/email-ai'

/**
 * POST - Generate AI suggestion for email reply
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, customerEmail, previousSuggestions } = body

    if (!companyId || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'companyId og customerEmail er påkrevd' },
        { status: 400 }
      )
    }

    // Fetch context in parallel
    const [businessProfile, faqs, instructions, emailHistory, knowledgeDocuments] = await Promise.all([
      getBusinessProfile(companyId),
      getFAQs(companyId),
      getActiveInstructions(companyId),
      getEmailHistory(companyId, customerEmail, 10),
      getKnowledgeDocuments(companyId),
    ])

    // Get the last inbound email for subject/body
    const lastInbound = [...emailHistory].reverse().find(m => m.direction === 'inbound')

    if (!lastInbound) {
      return NextResponse.json(
        { success: false, error: 'Ingen innkommende e-post funnet' },
        { status: 404 }
      )
    }

    const conversationHistory = emailHistory.map(m => ({
      direction: m.direction,
      subject: m.subject,
      body: m.body,
    }))

    // Bump temperature when regenerating to get more varied suggestions
    const temperature = previousSuggestions && previousSuggestions.length > 0 ? 0.8 : 0.7

    const suggestion = await generateEmailAIResponse({
      emailSubject: lastInbound.subject,
      emailBody: lastInbound.body,
      senderEmail: customerEmail,
      businessProfile,
      faqs,
      instructions,
      knowledgeDocuments,
      conversationHistory,
      previousSuggestions,
      temperature,
    })

    return NextResponse.json({ success: true, suggestion })
  } catch (error) {
    console.error('[Email Suggest] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke generere forslag' },
      { status: 500 }
    )
  }
}
