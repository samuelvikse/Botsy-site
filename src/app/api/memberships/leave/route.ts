/**
 * API endpoint for leaving a company
 * POST /api/memberships/leave
 *
 * Allows non-owner members to leave their company so they can join another one
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, membershipId } = body

    if (!userId || !membershipId) {
      return NextResponse.json(
        { error: 'userId og membershipId er påkrevd' },
        { status: 400 }
      )
    }

    // Fetch the membership to verify ownership
    const membershipResponse = await fetch(`${FIRESTORE_BASE_URL}/memberships/${membershipId}`)
    if (!membershipResponse.ok) {
      return NextResponse.json(
        { error: 'Medlemskapet finnes ikke' },
        { status: 404 }
      )
    }

    const membershipDoc = await membershipResponse.json()
    const membershipData = parseFirestoreFields(membershipDoc.fields)

    // Verify that the membership belongs to this user
    if (membershipData.userId !== userId) {
      return NextResponse.json(
        { error: 'Du kan kun forlate ditt eget medlemskap' },
        { status: 403 }
      )
    }

    // Verify that the user is not an owner
    if (membershipData.role === 'owner') {
      return NextResponse.json(
        { error: 'Eiere kan ikke forlate bedriften. Du må først overføre eierskapet til en annen.' },
        { status: 403 }
      )
    }

    // Delete the membership
    const deleteResponse = await fetch(`${FIRESTORE_BASE_URL}/memberships/${membershipId}`, {
      method: 'DELETE',
    })

    if (!deleteResponse.ok) {
      throw new Error('Failed to delete membership')
    }

    // Clear the user's companyId
    const userUpdateResponse = await fetch(
      `${FIRESTORE_BASE_URL}/users/${userId}?updateMask.fieldPaths=companyId`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            companyId: toFirestoreValue(null),
          },
        }),
      }
    )

    if (!userUpdateResponse.ok) {
      console.error('[Leave Company] Failed to clear user companyId, but membership was deleted')
    }

    console.log(`[Leave Company] User ${userId} left company via membership ${membershipId}`)

    return NextResponse.json({
      success: true,
      message: 'Du har forlatt bedriften',
    })
  } catch (error) {
    console.error('[Leave Company] Error:', error)
    return NextResponse.json(
      { error: 'Kunne ikke forlate bedriften. Prøv igjen senere.' },
      { status: 500 }
    )
  }
}
