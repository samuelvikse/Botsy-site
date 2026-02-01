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

  console.log('[AI] Gemini failed, trying Groq fallback...')

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
    console.log('[AI Gemini] API key exists:', !!apiKey, 'length:', apiKey?.length || 0)
    if (!apiKey) {
      console.log('[AI Gemini] No GEMINI_API_KEY found - skipping Gemini')
      return { success: false, response: '' }
    }

    console.log('[AI Gemini] Calling API with key starting with:', apiKey.substring(0, 10) + '...')

    // Convert messages to Gemini format
    const geminiContents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
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

    console.log('[AI Gemini] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI Gemini] Error:', errorText)
      return { success: false, response: '' }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (text) {
      console.log('[AI Gemini] Success, response length:', text.length)
      return { success: true, response: text }
    }

    console.log('[AI Gemini] No text in response')
    return { success: false, response: '' }
  } catch (error) {
    console.error('[AI Gemini] Exception:', error)
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
      console.log('[AI Groq] No GROQ_API_KEY found')
      return { success: false, response: '' }
    }

    console.log('[AI Groq] Calling API (fallback)')

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

    console.log('[AI Groq] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI Groq] Error:', errorText)
      return { success: false, response: '' }
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    if (text) {
      console.log('[AI Groq] Success, response length:', text.length)
      return { success: true, response: text }
    }

    console.log('[AI Groq] No text in response')
    return { success: false, response: '' }
  } catch (error) {
    console.error('[AI Groq] Exception:', error)
    return { success: false, response: '' }
  }
}
