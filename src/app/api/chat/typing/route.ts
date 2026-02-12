import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { widgetCorsHeaders } from '@/lib/cors'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export async function OPTIONS() {
  return NextResponse.json({}, { headers: widgetCorsHeaders })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, sessionId, who } = body

    if (!companyId || !sessionId || !who) {
      return NextResponse.json({ error: 'Manglende felter' }, { status: 400, headers: widgetCorsHeaders })
    }

    if (who !== 'customer' && who !== 'agent') {
      return NextResponse.json({ error: 'who må være customer eller agent' }, { status: 400, headers: widgetCorsHeaders })
    }

    // Require auth for agent/owner actions; allow customer widget requests without auth
    let authToken: string | null = null
    if (who === 'agent') {
      const user = await verifyAuth(request)
      if (!user) return unauthorizedResponse()
      authToken = user.token
    }

    const fieldName = who === 'customer' ? 'customerTypingAt' : 'agentTypingAt'

    // Update the typing timestamp on the session document
    const url = `${FIRESTORE_BASE_URL}/companies/${companyId}/customerChats/${sessionId}?updateMask.fieldPaths=${fieldName}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          [fieldName]: { timestampValue: new Date().toISOString() },
        },
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Kunne ikke oppdatere' }, { status: 500, headers: widgetCorsHeaders })
    }

    return NextResponse.json({ success: true }, { headers: widgetCorsHeaders })
  } catch (error) {
    console.error('[Typing] Error:', error)
    return NextResponse.json({ error: 'Intern feil' }, { status: 500, headers: widgetCorsHeaders })
  }
}
