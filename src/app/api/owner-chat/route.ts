import { NextRequest, NextResponse } from 'next/server'
import { chatWithOwner } from '@/lib/groq'
import type { OwnerChatMessage, BusinessProfile, Instruction, OwnerChatResponse, PendingAction } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse<OwnerChatResponse | { error: string }>> {
  try {
    const body = await request.json()
    const { message, history, businessProfile, activeInstructions, pendingAction, companyId } = body as {
      message: string
      history: OwnerChatMessage[]
      businessProfile: BusinessProfile | null
      activeInstructions: Instruction[]
      pendingAction?: PendingAction
      companyId?: string
    }

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Melding er påkrevd' },
        { status: 400 }
      )
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'AI-tjenesten er ikke konfigurert' },
        { status: 500 }
      )
    }

    // Chat with Groq
    const result = await chatWithOwner(
      message,
      history || [],
      businessProfile || null,
      activeInstructions || []
    )

    // Build response
    const response: OwnerChatResponse = {
      reply: result.reply,
    }

    // Handle confirmation of pending action
    if (result.isConfirmation && pendingAction && companyId) {
      if (pendingAction.type === 'faq' && pendingAction.data?.question && pendingAction.data?.answer) {
        // Create FAQ
        const { addFAQ } = await import('@/lib/firestore')
        const newFaq = {
          id: `faq-${Date.now()}`,
          question: pendingAction.data.question,
          answer: pendingAction.data.answer,
          source: 'user' as const,
          confirmed: true,
        }
        await addFAQ(companyId, newFaq)
        response.faqCreated = newFaq
      } else if (pendingAction.type === 'instruction' && pendingAction.data?.content) {
        // Create instruction - returned to client to save
        response.instructionCreated = {
          id: '',
          content: pendingAction.data.content,
          category: pendingAction.data.category || 'general',
          priority: 'medium',
          isActive: true,
          startsAt: null,
          expiresAt: null,
          createdAt: new Date(),
          createdBy: '',
        }
      } else if (pendingAction.type === 'sync_faqs') {
        // Sync FAQs from documents
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/knowledge/sync-faqs?companyId=${companyId}`, {
          method: 'POST',
        })
        const syncData = await syncResponse.json()
        if (syncData.success) {
          response.reply = `${response.reply}\n\nJeg har synkronisert ${syncData.added} nye FAQs fra dokumenter til kunnskapsbasen.`
        }
      }
    }

    // Set pending action if new action is suggested (not a confirmation)
    if (!result.isConfirmation) {
      if (result.shouldCreateFAQ && result.suggestedFAQ) {
        response.pendingAction = {
          type: 'faq',
          data: {
            question: result.suggestedFAQ.question,
            answer: result.suggestedFAQ.answer,
          },
        }
      } else if (result.shouldCreateInstruction && result.suggestedInstruction) {
        response.pendingAction = {
          type: 'instruction',
          data: {
            content: result.suggestedInstruction.content,
            category: result.suggestedInstruction.category,
          },
        }
      } else if (result.shouldSyncFAQs) {
        response.pendingAction = {
          type: 'sync_faqs',
        }
      }
    }

    // Handle export action (no confirmation needed)
    if (result.exportType) {
      response.exportType = result.exportType
    }

    return NextResponse.json(response)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'En ukjent feil oppstod'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
