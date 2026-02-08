import { NextRequest, NextResponse } from 'next/server'
import { toFirestoreValue } from '@/lib/firestore-utils'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// Note: Avatar upload is handled client-side using Firebase Storage SDK
// This endpoint is for updating the avatar URL in the user document after upload

// POST - Update user avatar URL after upload
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { userId, avatarUrl } = body

    if (!userId || !avatarUrl) {
      return NextResponse.json(
        { error: 'userId og avatarUrl er påkrevd' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/users/${userId}?updateMask.fieldPaths=avatarUrl`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            avatarUrl: toFirestoreValue(avatarUrl),
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to update avatar')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere profilbilde' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user avatar
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId er påkrevd' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/users/${userId}?updateMask.fieldPaths=avatarUrl`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            avatarUrl: toFirestoreValue(null),
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to remove avatar')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke fjerne profilbilde' },
      { status: 500 }
    )
  }
}
