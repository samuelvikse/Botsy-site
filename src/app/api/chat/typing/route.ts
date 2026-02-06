import { NextRequest, NextResponse } from 'next/server'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, sessionId, who } = body

    if (!companyId || !sessionId || !who) {
      return NextResponse.json({ error: 'Manglende felter' }, { status: 400, headers: corsHeaders })
    }

    if (who !== 'customer' && who !== 'agent') {
      return NextResponse.json({ error: 'who må være customer eller agent' }, { status: 400, headers: corsHeaders })
    }

    const fieldName = who === 'customer' ? 'customerTypingAt' : 'agentTypingAt'

    // Update the typing timestamp on the session document
    const url = `${FIRESTORE_BASE_URL}/companies/${companyId}/customerChats/${sessionId}?updateMask.fieldPaths=${fieldName}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          [fieldName]: { timestampValue: new Date().toISOString() },
        },
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Kunne ikke oppdatere' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('[Typing] Error:', error)
    return NextResponse.json({ error: 'Intern feil' }, { status: 500, headers: corsHeaders })
  }
}
