import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse } from '@/lib/ai-providers'

/**
 * POST - Test AI provider (Gemini/Groq)
 * For developer testing only
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    const result = await generateAIResponse(
      'Du er en hjelpsom assistent. Svar kort og konsist.',
      [{ role: 'user', content: prompt }],
      { maxTokens: 100, temperature: 0.7 }
    )

    const responseTime = Date.now() - startTime

    if (result.success) {
      return NextResponse.json({
        success: true,
        provider: result.provider,
        response: result.response,
        responseTimeMs: responseTime,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'AI provider failed to respond',
        responseTimeMs: responseTime,
      })
    }
  } catch (error) {
    console.error('[AI Provider Test] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test AI provider'
      },
      { status: 500 }
    )
  }
}
