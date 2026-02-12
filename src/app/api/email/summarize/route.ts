import { NextRequest, NextResponse } from 'next/server'
import { getBusinessProfile, getEmailHistory } from '@/lib/email-firestore'
import { summarizeEmailConversation, summarizeLastEmail } from '@/lib/email-ai'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

/**
 * POST - Summarize email conversation or last email
 * mode: "last" (siste mail) or "conversation" (hele samtalen, default)
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { companyId, customerEmail, mode = 'conversation' } = body

    if (!companyId || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'companyId og customerEmail er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

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

    let summary: string

    if (mode === 'last') {
      // Find the last inbound email
      const lastInbound = [...emailHistory].reverse().find(m => m.direction === 'inbound')
      if (!lastInbound) {
        return NextResponse.json(
          { success: false, error: 'Ingen innkommende e-post funnet' },
          { status: 404 }
        )
      }

      summary = await summarizeLastEmail({
        businessProfile,
        lastEmail: {
          direction: lastInbound.direction,
          subject: lastInbound.subject,
          body: lastInbound.body,
        },
      })
    } else {
      const conversationHistory = emailHistory.map(m => ({
        direction: m.direction,
        subject: m.subject,
        body: m.body,
      }))

      summary = await summarizeEmailConversation({
        businessProfile,
        conversationHistory,
      })
    }

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('[Email Summarize] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke oppsummere' },
      { status: 500 }
    )
  }
}
