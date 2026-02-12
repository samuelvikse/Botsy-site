import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'
import type { Membership, MembershipPermissions } from '@/types'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function firestoreHeaders(token: string) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

// GET - Fetch membership(s)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function GET(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')

    if (companyId) {
      const access = await requireCompanyAccess(user.uid, companyId, user.token)
      if (!access) return forbiddenResponse()
    }

    // If both userId and companyId are provided, get specific membership
    if (userId && companyId) {
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'memberships' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'EQUAL',
                    value: { stringValue: userId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'companyId' },
                    op: 'EQUAL',
                    value: { stringValue: companyId },
                  },
                },
              ],
            },
          },
        },
      }

      const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
        method: 'POST',
        headers: firestoreHeaders(user.token),
        body: JSON.stringify(queryBody),
      })

      if (!response.ok) {
        return NextResponse.json({ membership: null })
      }

      const data = await response.json()

      if (!data || data.length === 0 || !data[0].document) {
        return NextResponse.json({ membership: null })
      }

      const doc = data[0].document
      const parsed = parseFirestoreFields(doc.fields)
      const docId = doc.name.split('/').pop()

      const membership: Membership = {
        id: docId,
        userId: parsed.userId as string,
        companyId: parsed.companyId as string,
        role: parsed.role as 'owner' | 'admin' | 'employee',
        permissions: (parsed.permissions as MembershipPermissions) || {},
        invitedBy: parsed.invitedBy as string,
        joinedAt: parsed.joinedAt as Date || new Date(),
        status: parsed.status as 'active' | 'suspended',
      }

      return NextResponse.json({ membership })
    }

    // If only companyId is provided, get all memberships for that company
    if (companyId) {
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'memberships' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'companyId' },
              op: 'EQUAL',
              value: { stringValue: companyId },
            },
          },
        },
      }

      const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
        method: 'POST',
        headers: firestoreHeaders(user.token),
        body: JSON.stringify(queryBody),
      })

      if (!response.ok) {
        return NextResponse.json({ memberships: [] })
      }

      const data = await response.json()

      const memberships: Membership[] = data
        .filter((item: { document?: unknown }) => item.document)
        .map((item: { document: { name: string; fields: Record<string, unknown> } }) => {
          const doc = item.document
          const parsed = parseFirestoreFields(doc.fields)
          const docId = doc.name.split('/').pop()

          return {
            id: docId,
            userId: parsed.userId as string,
            companyId: parsed.companyId as string,
            role: parsed.role as 'owner' | 'admin' | 'employee',
            permissions: (parsed.permissions as MembershipPermissions) || {},
            invitedBy: parsed.invitedBy as string,
            joinedAt: parsed.joinedAt as Date || new Date(),
            status: parsed.status as 'active' | 'suspended',
          }
        })

      // Also fetch user details for each membership
      const membershipsWithUsers = await Promise.all(
        memberships.map(async (membership) => {
          try {
            const userResponse = await fetch(`${FIRESTORE_BASE_URL}/users/${membership.userId}`, {
              headers: { 'Authorization': `Bearer ${user.token}` },
            })
            if (userResponse.ok) {
              const userData = await userResponse.json()
              if (userData.fields) {
                const userParsed = parseFirestoreFields(userData.fields)
                return {
                  membership,
                  user: {
                    email: userParsed.email as string || '',
                    displayName: userParsed.displayName as string || '',
                    avatarUrl: userParsed.avatarUrl as string | undefined,
                  },
                }
              }
            }
          } catch {
            // Ignore errors fetching user data
          }
          return {
            membership,
            user: {
              email: '',
              displayName: '',
            },
          }
        })
      )

      return NextResponse.json({ members: membershipsWithUsers })
    }

    return NextResponse.json(
      { error: 'companyId er påkrevd' },
      { status: 400 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke hente medlemskap' },
      { status: 500 }
    )
  }
}

// POST - Create a new membership
export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { userId, companyId, role, permissions, invitedBy, status } = body

    if (companyId) {
      const access = await requireCompanyAccess(user.uid, companyId, user.token)
      if (!access) return forbiddenResponse()
    }

    if (!userId || !companyId || !role) {
      return NextResponse.json(
        { error: 'userId, companyId og role er påkrevd' },
        { status: 400 }
      )
    }

    const now = new Date()

    const response = await fetch(`${FIRESTORE_BASE_URL}/memberships`, {
      method: 'POST',
      headers: firestoreHeaders(user.token),
      body: JSON.stringify({
        fields: {
          userId: toFirestoreValue(userId),
          companyId: toFirestoreValue(companyId),
          role: toFirestoreValue(role),
          permissions: toFirestoreValue(permissions || {}),
          invitedBy: toFirestoreValue(invitedBy || userId),
          joinedAt: toFirestoreValue(now),
          status: toFirestoreValue(status || 'active'),
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create membership')
    }

    const createdDoc = await response.json()
    const docId = createdDoc.name.split('/').pop()

    return NextResponse.json({
      success: true,
      membershipId: docId,
    })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke opprette medlemskap' },
      { status: 500 }
    )
  }
}

// PATCH - Update a membership
export async function PATCH(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { membershipId, updates } = body

    if (!membershipId) {
      return NextResponse.json(
        { error: 'membershipId er påkrevd' },
        { status: 400 }
      )
    }

    const fields: Record<string, unknown> = {}
    const fieldPaths: string[] = []

    if (updates.role !== undefined) {
      fields.role = toFirestoreValue(updates.role)
      fieldPaths.push('role')
    }
    if (updates.permissions !== undefined) {
      fields.permissions = toFirestoreValue(updates.permissions)
      fieldPaths.push('permissions')
    }
    if (updates.status !== undefined) {
      fields.status = toFirestoreValue(updates.status)
      fieldPaths.push('status')
    }

    if (fieldPaths.length === 0) {
      return NextResponse.json({ success: true })
    }

    const updateMask = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&')

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/memberships/${membershipId}?${updateMask}`,
      {
        method: 'PATCH',
        headers: firestoreHeaders(user.token),
        body: JSON.stringify({ fields }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to update membership')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere medlemskap' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a membership
export async function DELETE(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const membershipId = searchParams.get('membershipId')

    if (!membershipId) {
      return NextResponse.json(
        { error: 'membershipId er påkrevd' },
        { status: 400 }
      )
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}/memberships/${membershipId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${user.token}` },
    })

    if (!response.ok) {
      throw new Error('Failed to delete membership')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke fjerne medlemskap' },
      { status: 500 }
    )
  }
}
