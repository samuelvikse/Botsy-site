import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function firestoreHeaders(token: string) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

interface ToggleModeRequest {
  companyId: string
  sessionId: string
  isManual: boolean
}

interface SendMessageRequest {
  companyId: string
  sessionId: string
  message: string
}

// Toggle manual mode for a chat session
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function PUT(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = (await request.json()) as ToggleModeRequest
    const { companyId, sessionId, isManual } = body

    if (!companyId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'companyId og sessionId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    const docPath = `companies/${companyId}/customerChats/${sessionId}`

    // Check if session exists
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/${docPath}`, {
      headers: firestoreHeaders(user.token),
    })

    if (!getResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    // Update manual mode
    const updateUrl = `${FIRESTORE_BASE_URL}/${docPath}?updateMask.fieldPaths=isManualMode&updateMask.fieldPaths=manualModeUpdatedAt`
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: firestoreHeaders(user.token),
      body: JSON.stringify({
        fields: {
          isManualMode: toFirestoreValue(isManual),
          manualModeUpdatedAt: toFirestoreValue(new Date().toISOString()),
        },
      }),
    })

    if (!updateResponse.ok) {
      throw new Error('Failed to update manual mode')
    }

    return NextResponse.json({
      success: true,
      isManualMode: isManual,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke endre modus' },
      { status: 500 }
    )
  }
}

// Send a manual message
export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = (await request.json()) as SendMessageRequest
    const { companyId, sessionId, message } = body

    if (!companyId || !sessionId || !message) {
      return NextResponse.json(
        { success: false, error: 'companyId, sessionId og message er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    const docPath = `companies/${companyId}/customerChats/${sessionId}`

    // Get existing session
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/${docPath}`, {
      headers: firestoreHeaders(user.token),
    })

    if (!getResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    const existingDoc = await getResponse.json()
    const existingData = existingDoc.fields ? parseFirestoreFields(existingDoc.fields) : {}
    const existingMessages = (existingData.messages as Array<Record<string, unknown>>) || []

    // Add the manual message
    const updatedMessages = [
      ...existingMessages,
      {
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
        isManual: true,
      },
    ]

    const updateUrl = `${FIRESTORE_BASE_URL}/${docPath}?updateMask.fieldPaths=messages&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=isManualMode`
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: firestoreHeaders(user.token),
      body: JSON.stringify({
        fields: {
          messages: toFirestoreValue(updatedMessages),
          updatedAt: toFirestoreValue(new Date().toISOString()),
          isManualMode: toFirestoreValue(true),
        },
      }),
    })

    if (!updateResponse.ok) {
      throw new Error('Failed to send manual message')
    }

    return NextResponse.json({
      success: true,
      message: 'Melding sendt',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke sende melding' },
      { status: 500 }
    )
  }
}

// Get chat status including manual mode
export async function GET(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const sessionId = searchParams.get('sessionId')

    if (!companyId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'companyId og sessionId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    const docPath = `companies/${companyId}/customerChats/${sessionId}`
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/${docPath}`, {
      headers: firestoreHeaders(user.token),
    })

    if (!getResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    const doc = await getResponse.json()
    const data = doc.fields ? parseFirestoreFields(doc.fields) : {}

    return NextResponse.json({
      success: true,
      isManualMode: (data.isManualMode as boolean) || false,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke hente status' },
      { status: 500 }
    )
  }
}
