import { NextRequest, NextResponse } from 'next/server'
import { getPendingEscalations, claimEscalation, resolveEscalation, resolveEscalationsByConversation, resolveAllPendingEscalations } from '@/lib/escalation-firestore'
import { incrementAnsweredCustomers } from '@/lib/leaderboard-firestore'
import { clearWidgetChatManualMode } from '@/lib/firestore'
import { clearMessengerChatManualMode } from '@/lib/messenger-firestore'

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId')

    if (!companyId) {
      // For now, return empty array if no companyId
      // In production, this should get the companyId from the authenticated user
      return NextResponse.json({ escalations: [] })
    }

    const escalations = await getPendingEscalations(companyId)

    return NextResponse.json({
      escalations: escalations.map((esc) => ({
        id: esc.id,
        customerIdentifier: esc.customerIdentifier,
        customerMessage: esc.customerMessage,
        channel: esc.channel,
        createdAt: esc.createdAt,
        conversationId: esc.conversationId,
      })),
    })
  } catch (error) {
    console.error('Error fetching escalations:', error)
    return NextResponse.json({ escalations: [] })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { escalationId, action, userId, companyId, conversationId } = await request.json()

    // Support resolving all pending escalations for a company (bulk cleanup)
    if (action === 'resolveAll' && companyId) {
      const resolvedCount = await resolveAllPendingEscalations(companyId)
      return NextResponse.json({ success: true, resolvedCount })
    }

    // Support resolving by conversationId (when employee opens a conversation)
    if (action === 'resolveByConversation' && companyId && conversationId) {
      const resolvedCount = await resolveEscalationsByConversation(companyId, conversationId)

      // Also clear the isManualMode flag on the chat document
      // conversationId format: "widget-{sessionId}" or "messenger-{senderId}"
      if (conversationId.startsWith('widget-')) {
        const sessionId = conversationId.replace('widget-', '')
        await clearWidgetChatManualMode(companyId, sessionId)
      } else if (conversationId.startsWith('messenger-')) {
        const senderId = conversationId.replace('messenger-', '')
        await clearMessengerChatManualMode(companyId, senderId)
      }

      return NextResponse.json({ success: true, resolvedCount })
    }

    if (!escalationId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action === 'claim') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Missing userId for claim action' },
          { status: 400 }
        )
      }
      await claimEscalation(escalationId, userId)
    } else if (action === 'resolve') {
      const escalation = await resolveEscalation(escalationId)

      // Increment answered customers count for the employee who resolved it
      if (escalation && escalation.claimedBy) {
        await incrementAnsweredCustomers(escalation.claimedBy, escalation.companyId)
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating escalation:', error)
    return NextResponse.json(
      { error: 'Failed to update escalation' },
      { status: 500 }
    )
  }
}
