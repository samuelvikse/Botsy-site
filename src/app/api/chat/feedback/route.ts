import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { widgetCorsHeaders } from '@/lib/cors'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: widgetCorsHeaders })
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip')
    const identifier = getRateLimitIdentifier(undefined, ip)
    const rateLimitResult = checkRateLimit(identifier + ':feedback', RATE_LIMITS.feedback)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Prøv igjen om litt.' }, { status: 429, headers: widgetCorsHeaders })
    }

    const body = await request.json()
    const { companyId, sessionId, messageIndex, rating, messageContent } = body

    if (!companyId || !sessionId || messageIndex === undefined || !rating) {
      return NextResponse.json({ error: 'Manglende felter' }, { status: 400, headers: widgetCorsHeaders })
    }

    if (rating !== 'positive' && rating !== 'negative') {
      return NextResponse.json({ error: 'Ugyldig rating' }, { status: 400, headers: widgetCorsHeaders })
    }

    // Store feedback in chatFeedback subcollection
    const response = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}/chatFeedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            sessionId: { stringValue: sessionId },
            messageIndex: { integerValue: String(messageIndex) },
            rating: { stringValue: rating },
            messageContent: { stringValue: messageContent || '' },
            createdAt: { timestampValue: new Date().toISOString() },
          },
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Kunne ikke lagre feedback' }, { status: 500, headers: widgetCorsHeaders })
    }

    return NextResponse.json({ success: true }, { headers: widgetCorsHeaders })
  } catch (error) {
    console.error('[Chat Feedback] Error:', error)
    return NextResponse.json({ error: 'Intern feil' }, { status: 500, headers: widgetCorsHeaders })
  }
}
