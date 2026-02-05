/**
 * AI Provider abstraction layer
 * Primary: Gemini (1M free tokens/day)
 * Fallback: Groq (100k free tokens/day)
 *
 * Features:
 * - Parallel execution for speed
 * - Retry with exponential backoff
 * - Sequential fallback if parallel fails
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

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 200

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate AI response with robust error handling
 * 1. First, try both providers in parallel
 * 2. If both fail, retry each provider sequentially with backoff
 */
export async function generateAIResponse(
  systemPrompt: string,
  messages: AIMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<AIResponse> {
  const maxTokens = options?.maxTokens ?? 300
  const temperature = options?.temperature ?? 0.7

  // PHASE 1: Race both providers - return as soon as the FIRST one succeeds
  const geminiPromise = callGeminiWithRetry(systemPrompt, messages, maxTokens, temperature, 1)
    .then(result => result.success ? { ...result, provider: 'gemini' as const } : null)
    .catch(() => null)

  const groqPromise = callGroqWithRetry(systemPrompt, messages, maxTokens, temperature, 1)
    .then(result => result.success ? { ...result, provider: 'groq' as const } : null)
    .catch(() => null)

  // Use Promise.race with a wrapper that only resolves on success
  // This returns the FIRST successful response instead of waiting for both
  const firstSuccess = await Promise.race([
    geminiPromise.then(r => r || new Promise(() => {})), // Never resolve if null
    groqPromise.then(r => r || new Promise(() => {})),   // Never resolve if null
    // Fallback: if both fail, Promise.all resolves and we handle below
    Promise.all([geminiPromise, groqPromise]).then(([g, q]) => g || q || null),
  ]) as AIResponse | null

  if (firstSuccess) {
    return firstSuccess
  }

  // PHASE 2: Both failed - try sequential with full retries
  console.log('[AI] Both providers failed in parallel, trying sequential with retries...')

  // Try Gemini with full retries
  const geminiRetry = await callGeminiWithRetry(systemPrompt, messages, maxTokens, temperature, MAX_RETRIES)
  if (geminiRetry.success) {
    console.log('[AI] Gemini succeeded on sequential retry')
    return { ...geminiRetry, provider: 'gemini' }
  }

  // Try Groq with full retries
  const groqRetry = await callGroqWithRetry(systemPrompt, messages, maxTokens, temperature, MAX_RETRIES)
  if (groqRetry.success) {
    console.log('[AI] Groq succeeded on sequential retry')
    return { ...groqRetry, provider: 'groq' }
  }

  console.error('[AI] All providers failed after retries')
  return { success: false, response: '', provider: undefined }
}

/**
 * Call Gemini with retry logic
 */
async function callGeminiWithRetry(
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number,
  maxRetries: number
): Promise<{ success: boolean; response: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, response: '' }
  }

  let lastError: string = ''

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
        const errorBody = await response.text().catch(() => 'Unknown error')
        lastError = `HTTP ${response.status}: ${errorBody.slice(0, 200)}`

        // Don't retry on 400 errors (bad request)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.error(`[Gemini] Client error, not retrying: ${lastError}`)
          return { success: false, response: '' }
        }

        if (attempt < maxRetries) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
          console.log(`[Gemini] Attempt ${attempt} failed, retrying in ${delay}ms...`)
          await sleep(delay)
          continue
        }
      } else {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (text) {
          return { success: true, response: text }
        } else {
          lastError = 'Empty response from Gemini'
          if (attempt < maxRetries) {
            await sleep(INITIAL_DELAY_MS * Math.pow(2, attempt - 1))
            continue
          }
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      if (attempt < maxRetries) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
        console.log(`[Gemini] Exception on attempt ${attempt}, retrying in ${delay}ms: ${lastError}`)
        await sleep(delay)
        continue
      }
    }
  }

  if (maxRetries > 1) {
    console.error(`[Gemini] Failed after ${maxRetries} attempts: ${lastError}`)
  }
  return { success: false, response: '' }
}

/**
 * Call Groq with retry logic
 */
async function callGroqWithRetry(
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number,
  maxRetries: number
): Promise<{ success: boolean; response: string }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { success: false, response: '' }
  }

  let lastError: string = ''

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
          model: 'llama-3.1-8b-instant',
          messages: groqMessages,
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error')
        lastError = `HTTP ${response.status}: ${errorBody.slice(0, 200)}`

        // Don't retry on 400 errors (bad request)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.error(`[Groq] Client error, not retrying: ${lastError}`)
          return { success: false, response: '' }
        }

        if (attempt < maxRetries) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
          console.log(`[Groq] Attempt ${attempt} failed, retrying in ${delay}ms...`)
          await sleep(delay)
          continue
        }
      } else {
        const data = await response.json()
        const text = data.choices?.[0]?.message?.content

        if (text) {
          return { success: true, response: text }
        } else {
          lastError = 'Empty response from Groq'
          if (attempt < maxRetries) {
            await sleep(INITIAL_DELAY_MS * Math.pow(2, attempt - 1))
            continue
          }
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      if (attempt < maxRetries) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
        console.log(`[Groq] Exception on attempt ${attempt}, retrying in ${delay}ms: ${lastError}`)
        await sleep(delay)
        continue
      }
    }
  }

  if (maxRetries > 1) {
    console.error(`[Groq] Failed after ${maxRetries} attempts: ${lastError}`)
  }
  return { success: false, response: '' }
}
