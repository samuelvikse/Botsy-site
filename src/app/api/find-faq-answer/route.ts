import { NextRequest, NextResponse } from 'next/server'
import { findFAQAnswer, reformulateAnswer } from '@/lib/groq'

interface FindFAQAnswerRequest {
  question: string
  websiteContent: string
}

interface ReformulateRequest {
  question: string
  userAnswer: string
  tone: 'formal' | 'friendly' | 'casual'
}

// POST /api/find-faq-answer - Find answer to a question from website content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, websiteContent } = body as FindFAQAnswerRequest

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Spørsmål er påkrevd' },
        { status: 400 }
      )
    }

    if (!websiteContent || typeof websiteContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nettside-innhold er påkrevd' },
        { status: 400 }
      )
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI-tjenesten er ikke konfigurert' },
        { status: 500 }
      )
    }

    // Find answer using Groq
    const result = await findFAQAnswer(question, websiteContent)

    return NextResponse.json({
      success: true,
      found: result.found,
      answer: result.answer,
    })

  } catch (error) {
    console.error('FAQ answer lookup error:', error)
    const message = error instanceof Error ? error.message : 'En ukjent feil oppstod'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// PATCH /api/find-faq-answer - Reformulate a user-provided answer
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, userAnswer, tone } = body as ReformulateRequest

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Spørsmål er påkrevd' },
        { status: 400 }
      )
    }

    if (!userAnswer || typeof userAnswer !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Svar er påkrevd' },
        { status: 400 }
      )
    }

    if (!tone || !['formal', 'friendly', 'casual'].includes(tone)) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig tone' },
        { status: 400 }
      )
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI-tjenesten er ikke konfigurert' },
        { status: 500 }
      )
    }

    // Reformulate the answer
    const reformulatedAnswer = await reformulateAnswer(question, userAnswer, tone)

    return NextResponse.json({
      success: true,
      answer: reformulatedAnswer,
    })

  } catch (error) {
    console.error('Answer reformulation error:', error)
    const message = error instanceof Error ? error.message : 'En ukjent feil oppstod'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
