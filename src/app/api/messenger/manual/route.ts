import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

/**
 * PUT - Toggle manual mode for a Messenger chat
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const { companyId, senderId, isManual } = await request.json()

    if (!companyId || !senderId) {
      return NextResponse.json(
        { success: false, error: 'companyId og senderId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    const docPath = `${FIRESTORE_BASE_URL}/companies/${companyId}/messengerChats/${senderId}`

    // Update the isManualMode field
    await fetch(`${docPath}?updateMask.fieldPaths=isManualMode&updateMask.fieldPaths=manualModeUpdatedAt`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          isManualMode: { booleanValue: isManual },
          manualModeUpdatedAt: { timestampValue: new Date().toISOString() }
        }
      })
    })

    return NextResponse.json({
      success: true,
      isManualMode: isManual,
    })
  } catch (error) {
    console.error('[Messenger Manual] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke endre modus' },
      { status: 500 }
    )
  }
}
