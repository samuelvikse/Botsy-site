import { NextRequest, NextResponse } from 'next/server'
import { chatWithOwner } from '@/lib/groq'
import type { OwnerChatMessage, BusinessProfile, Instruction, OwnerChatResponse } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse<OwnerChatResponse | { error: string }>> {
  try {
    const body = await request.json()
    const { message, history, businessProfile, activeInstructions } = body as {
      message: string
      history: OwnerChatMessage[]
      businessProfile: BusinessProfile | null
      activeInstructions: Instruction[]
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

    // If we should suggest creating an instruction
    if (result.shouldCreateInstruction && result.suggestedInstruction) {
      response.instructionCreated = {
        id: '', // Will be assigned by Firestore
        content: result.suggestedInstruction.content || message,
        category: result.suggestedInstruction.category || 'general',
        priority: result.suggestedInstruction.priority || 'medium',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        createdAt: new Date(),
        createdBy: '', // Will be filled by client
      }
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
