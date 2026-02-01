import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'
import type { Invitation, EmployeePermissions, AdminPermissions } from '@/types'
import crypto from 'crypto'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// GET - Fetch pending invitations for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'invitations' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'companyId' },
                  op: 'EQUAL',
                  value: { stringValue: companyId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: 'pending' },
                },
              },
            ],
          },
        },
        orderBy: [
          { field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' },
        ],
      },
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody),
    })

    if (!response.ok) {
      return NextResponse.json({ invitations: [] })
    }

    const data = await response.json()

    const invitations: Invitation[] = data
      .filter((item: { document?: unknown }) => item.document)
      .map((item: { document: { name: string; fields: Record<string, unknown> } }) => {
        const doc = item.document
        const parsed = parseFirestoreFields(doc.fields)
        const docId = doc.name.split('/').pop()

        return {
          id: docId,
          companyId: parsed.companyId as string,
          email: parsed.email as string,
          role: parsed.role as 'admin' | 'employee',
          permissions: parsed.permissions as EmployeePermissions | AdminPermissions,
          invitedBy: parsed.invitedBy as string,
          inviterName: parsed.inviterName as string,
          companyName: parsed.companyName as string,
          createdAt: parsed.createdAt as Date || new Date(),
          expiresAt: parsed.expiresAt as Date || new Date(),
          status: parsed.status as 'pending' | 'accepted' | 'expired' | 'cancelled',
          token: parsed.token as string,
        }
      })

    return NextResponse.json({ invitations })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke hente invitasjoner' },
      { status: 500 }
    )
  }
}

// POST - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, email, role, permissions, invitedBy, inviterName, companyName } = body

    if (!companyId || !email || !role) {
      return NextResponse.json(
        { error: 'companyId, email og role er påkrevd' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation for this email
    const checkQuery = {
      structuredQuery: {
        from: [{ collectionId: 'invitations' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'companyId' },
                  op: 'EQUAL',
                  value: { stringValue: companyId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'email' },
                  op: 'EQUAL',
                  value: { stringValue: email.toLowerCase() },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: 'pending' },
                },
              },
            ],
          },
        },
      },
    }

    const checkResponse = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkQuery),
    })

    if (checkResponse.ok) {
      const existingData = await checkResponse.json()
      if (existingData && existingData.length > 0 && existingData[0].document) {
        return NextResponse.json(
          { error: 'Det finnes allerede en aktiv invitasjon til denne e-postadressen' },
          { status: 400 }
        )
      }
    }

    const token = generateToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const response = await fetch(`${FIRESTORE_BASE_URL}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          companyId: toFirestoreValue(companyId),
          email: toFirestoreValue(email.toLowerCase()),
          role: toFirestoreValue(role),
          permissions: toFirestoreValue(permissions || {}),
          invitedBy: toFirestoreValue(invitedBy),
          inviterName: toFirestoreValue(inviterName || ''),
          companyName: toFirestoreValue(companyName || ''),
          createdAt: toFirestoreValue(now),
          expiresAt: toFirestoreValue(expiresAt),
          status: toFirestoreValue('pending'),
          token: toFirestoreValue(token),
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create invitation')
    }

    const createdDoc = await response.json()
    const docId = createdDoc.name.split('/').pop()

    // Get the base URL for the invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botsy.no'
    const inviteUrl = `${baseUrl}/invite/${token}`

    return NextResponse.json({
      success: true,
      invitationId: docId,
      token,
      inviteUrl,
    })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke opprette invitasjon' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel an invitation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('invitationId')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'invitationId er påkrevd' },
        { status: 400 }
      )
    }

    // Update status to cancelled instead of deleting
    const response = await fetch(
      `${FIRESTORE_BASE_URL}/invitations/${invitationId}?updateMask.fieldPaths=status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            status: toFirestoreValue('cancelled'),
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to cancel invitation')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke kansellere invitasjon' },
      { status: 500 }
    )
  }
}
