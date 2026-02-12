import { NextRequest, NextResponse } from 'next/server'
import { toFirestoreValue } from '@/lib/firestore-utils'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function firestoreHeaders(token: string) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

// PATCH - Update user profile
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function PATCH(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { userId, updates } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId er påkrevd' },
        { status: 400 }
      )
    }

    const fields: Record<string, unknown> = {}
    const fieldPaths: string[] = []

    if (updates.displayName !== undefined) {
      fields.displayName = toFirestoreValue(updates.displayName)
      fieldPaths.push('displayName')
    }
    if (updates.avatarUrl !== undefined) {
      fields.avatarUrl = toFirestoreValue(updates.avatarUrl)
      fieldPaths.push('avatarUrl')
    }
    if (updates.phone !== undefined) {
      fields.phone = toFirestoreValue(updates.phone)
      fieldPaths.push('phone')
    }

    if (fieldPaths.length === 0) {
      return NextResponse.json({ success: true })
    }

    const updateMask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&')

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/users/${userId}?${updateMask}`,
      {
        method: 'PATCH',
        headers: firestoreHeaders(user.token),
        body: JSON.stringify({ fields }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to update profile')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere profil' },
      { status: 500 }
    )
  }
}
