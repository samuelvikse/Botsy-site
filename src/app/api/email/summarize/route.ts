import { NextRequest, NextResponse } from 'next/server'
import { getBusinessProfile, getEmailHistory } from '@/lib/email-firestore'
import { summarizeEmailConversation } from '@/lib/email-ai'

/**
 * POST - Summarize email conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, customerEmail } = body

    if (!companyId || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'companyId og customerEmail er påkrevd' },
        { status: 400 }
      )
    }

    const [businessProfile, emailHistory] = await Promise.all([
      getBusinessProfile(companyId),
      getEmailHistory(companyId, customerEmail, 20),
    ])

    if (!emailHistory || emailHistory.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ingen e-poster å oppsummere' },
        { status: 404 }
      )
    }

    const conversationHistory = emailHistory.map(m => ({
      direction: m.direction,
      subject: m.subject,
      body: m.body,
    }))

    const summary = await summarizeEmailConversation({
      businessProfile,
      conversationHistory,
    })

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('[Email Summarize] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke oppsummere' },
      { status: 500 }
    )
  }
}
