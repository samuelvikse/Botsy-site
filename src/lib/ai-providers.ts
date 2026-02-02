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
 * Generate AI response using Gemini and Groq in parallel (race for speed)
 * Returns the first successful response
 */
export async function generateAIResponse(
  systemPrompt: string,
  messages: AIMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<AIResponse> {
  const maxTokens = options?.maxTokens ?? 300 // Reduced for faster responses
  const temperature = options?.temperature ?? 0.7

  // Race both providers in parallel - use whichever responds first
  const geminiPromise = callGemini(systemPrompt, messages, maxTokens, temperature)
    .then(result => result.success ? { ...result, provider: 'gemini' as const } : null)
    .catch(() => null)

  const groqPromise = callGroq(systemPrompt, messages, maxTokens, temperature)
    .then(result => result.success ? { ...result, provider: 'groq' as const } : null)
    .catch(() => null)

  // Return first successful response
  const results = await Promise.all([geminiPromise, groqPromise])

  // Prefer Gemini if both succeeded (usually better quality)
  const geminiResult = results[0]
  const groqResult = results[1]

  if (geminiResult) {
    return geminiResult
  }
  if (groqResult) {
    return groqResult
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
    if (!apiKey) {
      return { success: false, response: '' }
    }

    // Use gemini-2.0-flash with v1beta API (supports systemInstruction)
    const geminiContents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

    if (!response.ok) {
      return { success: false, response: '' }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

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
        model: 'llama-3.1-8b-instant', // Much faster than 70b-versatile
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
