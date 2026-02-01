/**
 * AI Provider abstraction layer
 * Primary: Gemini (1M free tokens/day)
 * Fallback: Groq (100k free tokens/day)
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  success: boolean
  response: string
  provider?: 'gemini' | 'groq'
}

/**
 * Generate AI response using Gemini (primary) with Groq fallback
 */
export async function generateAIResponse(
  systemPrompt: string,
  messages: AIMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<AIResponse> {
  const maxTokens = options?.maxTokens ?? 500
  const temperature = options?.temperature ?? 0.7

  // Try Gemini first
  const geminiResult = await callGemini(systemPrompt, messages, maxTokens, temperature)
  if (geminiResult.success) {
    return { ...geminiResult, provider: 'gemini' }
  }

  // Fallback to Groq
  const groqResult = await callGroq(systemPrompt, messages, maxTokens, temperature)
  if (groqResult.success) {
    return { ...groqResult, provider: 'groq' }
  }

  return { success: false, response: '', provider: undefined }
}

async function callGemini(
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{ success: boolean; response: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    console.log('[Gemini v2] Starting call, API key exists:', !!apiKey)
    if (!apiKey) {
      return { success: false, response: '' }
    }

    // Use gemini-1.5-flash with v1beta API (supports systemInstruction)
    const geminiContents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature,
          },
        }),
      }
    )

    console.log('[Gemini v2] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gemini v2] Error:', errorText)
      return { success: false, response: '' }
    }

    const data = await response.json()
    console.log('[Gemini v2] Response data keys:', Object.keys(data))
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    console.log('[Gemini v2] Extracted text length:', text?.length || 0)

    return text ? { success: true, response: text } : { success: false, response: '' }
  } catch {
    return { success: false, response: '' }
  }
}

async function callGroq(
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{ success: boolean; response: string }> {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return { success: false, response: '' }
    }

    // Groq uses OpenAI-compatible format
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system')
    ]

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    })

    if (!response.ok) {
      return { success: false, response: '' }
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    return text ? { success: true, response: text } : { success: false, response: '' }
  } catch {
    return { success: false, response: '' }
  }
}
