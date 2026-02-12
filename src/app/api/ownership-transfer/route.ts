import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'
import crypto from 'crypto'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function firestoreHeaders(token: string) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// GET - Get pending ownership transfer for a company
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function GET(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'ownershipTransfers' }],
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
      },
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: firestoreHeaders(user.token),
      body: JSON.stringify(queryBody),
    })

    if (!response.ok) {
      return NextResponse.json({ transfer: null })
    }

    const data = await response.json()

    if (!data || data.length === 0 || !data[0].document) {
      return NextResponse.json({ transfer: null })
    }

    const doc = data[0].document
    const parsed = parseFirestoreFields(doc.fields)
    const docId = doc.name.split('/').pop()

    // Don't expose tokens
    return NextResponse.json({
      transfer: {
        id: docId,
        companyId: parsed.companyId,
        fromUserId: parsed.fromUserId,
        toUserId: parsed.toUserId,
        createdAt: parsed.createdAt,
        expiresAt: parsed.expiresAt,
        fromUserConfirmed: parsed.fromUserConfirmed,
        toUserConfirmed: parsed.toUserConfirmed,
        status: parsed.status,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke hente overføring' },
      { status: 500 }
    )
  }
}

// POST - Create a new ownership transfer
export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { companyId, fromUserId, toUserId } = body

    if (!companyId || !fromUserId || !toUserId) {
      return NextResponse.json(
        { error: 'companyId, fromUserId og toUserId er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    // Verify the fromUser is the current owner
    const companyResponse = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}`, {
      headers: { 'Authorization': `Bearer ${user.token}` },
    })
    if (!companyResponse.ok) {
      return NextResponse.json(
        { error: 'Bedriften finnes ikke' },
        { status: 404 }
      )
    }

    const companyData = await companyResponse.json()
    const companyParsed = parseFirestoreFields(companyData.fields || {})

    if (companyParsed.ownerId !== fromUserId) {
      return NextResponse.json(
        { error: 'Kun nåværende eier kan overføre eierskap' },
        { status: 403 }
      )
    }

    // Check if toUser exists and is a member
    const membershipQuery = {
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
                  value: { stringValue: toUserId },
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

    const membershipResponse = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: firestoreHeaders(user.token),
      body: JSON.stringify(membershipQuery),
    })

    if (membershipResponse.ok) {
      const membershipData = await membershipResponse.json()
      if (!membershipData || membershipData.length === 0 || !membershipData[0].document) {
        return NextResponse.json(
          { error: 'Mottakeren må være medlem av bedriften' },
          { status: 400 }
        )
      }
    }

    // Cancel any existing pending transfers
    const existingQuery = {
      structuredQuery: {
        from: [{ collectionId: 'ownershipTransfers' }],
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
      },
    }

    const existingResponse = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: firestoreHeaders(user.token),
      body: JSON.stringify(existingQuery),
    })

    if (existingResponse.ok) {
      const existingData = await existingResponse.json()
      for (const item of existingData) {
        if (item.document) {
          const existingId = item.document.name.split('/').pop()
          await fetch(
            `${FIRESTORE_BASE_URL}/ownershipTransfers/${existingId}?updateMask.fieldPaths=status`,
            {
              method: 'PATCH',
              headers: firestoreHeaders(user.token),
              body: JSON.stringify({
                fields: { status: toFirestoreValue('cancelled') },
              }),
            }
          )
        }
      }
    }

    // Create new transfer
    const fromUserToken = generateToken()
    const toUserToken = generateToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    const createResponse = await fetch(`${FIRESTORE_BASE_URL}/ownershipTransfers`, {
      method: 'POST',
      headers: firestoreHeaders(user.token),
      body: JSON.stringify({
        fields: {
          companyId: toFirestoreValue(companyId),
          fromUserId: toFirestoreValue(fromUserId),
          toUserId: toFirestoreValue(toUserId),
          createdAt: toFirestoreValue(now),
          expiresAt: toFirestoreValue(expiresAt),
          fromUserConfirmed: toFirestoreValue(false),
          toUserConfirmed: toFirestoreValue(false),
          fromUserToken: toFirestoreValue(fromUserToken),
          toUserToken: toFirestoreValue(toUserToken),
          status: toFirestoreValue('pending'),
        },
      }),
    })

    if (!createResponse.ok) {
      throw new Error('Failed to create transfer')
    }

    const createdDoc = await createResponse.json()
    const docId = createdDoc.name.split('/').pop()

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botsy.no'

    return NextResponse.json({
      success: true,
      transferId: docId,
      fromUserUrl: `${baseUrl}/transfer/${fromUserToken}?type=from`,
      toUserUrl: `${baseUrl}/transfer/${toUserToken}?type=to`,
      expiresAt,
    })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke opprette overføring' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel an ownership transfer
export async function DELETE(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const transferId = searchParams.get('transferId')

    if (!transferId) {
      return NextResponse.json(
        { error: 'transferId er påkrevd' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/ownershipTransfers/${transferId}?updateMask.fieldPaths=status`,
      {
        method: 'PATCH',
        headers: firestoreHeaders(user.token),
        body: JSON.stringify({
          fields: { status: toFirestoreValue('cancelled') },
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to cancel transfer')
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke kansellere overføring' },
      { status: 500 }
    )
  }
}
