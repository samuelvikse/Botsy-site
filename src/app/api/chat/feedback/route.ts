import { NextRequest, NextResponse } from 'next/server'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, sessionId, messageIndex, rating, messageContent } = body

    if (!companyId || !sessionId || messageIndex === undefined || !rating) {
      return NextResponse.json({ error: 'Manglende felter' }, { status: 400 })
    }

    if (rating !== 'positive' && rating !== 'negative') {
      return NextResponse.json({ error: 'Ugyldig rating' }, { status: 400 })
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
      return NextResponse.json({ error: 'Kunne ikke lagre feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Chat Feedback] Error:', error)
    return NextResponse.json({ error: 'Intern feil' }, { status: 500 })
  }
}
