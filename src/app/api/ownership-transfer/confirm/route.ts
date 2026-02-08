import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// POST - Confirm ownership transfer
export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await verifyAuth(request)
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { token, userType } = body

    if (!token || !userType) {
      return NextResponse.json(
        { error: 'token og userType er påkrevd' },
        { status: 400 }
      )
    }

    if (userType !== 'from' && userType !== 'to') {
      return NextResponse.json(
        { error: 'userType må være "from" eller "to"' },
        { status: 400 }
      )
    }

    // Find transfer by token
    const tokenField = userType === 'from' ? 'fromUserToken' : 'toUserToken'
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'ownershipTransfers' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: tokenField },
                  op: 'EQUAL',
                  value: { stringValue: token },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Overføringen finnes ikke' },
        { status: 404 }
      )
    }

    const data = await response.json()

    if (!data || data.length === 0 || !data[0].document) {
      return NextResponse.json(
        { error: 'Overføringen finnes ikke' },
        { status: 404 }
      )
    }

    const doc = data[0].document
    const parsed = parseFirestoreFields(doc.fields)
    const docId = doc.name.split('/').pop()

    // Verify the authenticated user matches the expected user for this confirmation
    const expectedUserId = userType === 'from' ? parsed.fromUserId : parsed.toUserId
    if (user.uid !== expectedUserId) {
      return NextResponse.json(
        { error: 'Du har ikke tilgang til å bekrefte denne overføringen' },
        { status: 403 }
      )
    }

    // Check expiration
    const expiresAt = new Date(parsed.expiresAt as string)
    if (new Date() > expiresAt) {
      await fetch(
        `${FIRESTORE_BASE_URL}/ownershipTransfers/${docId}?updateMask.fieldPaths=status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: { status: toFirestoreValue('expired') },
          }),
        }
      )
      return NextResponse.json(
        { error: 'Overføringen har utløpt' },
        { status: 410 }
      )
    }

    // Update confirmation
    const confirmField = userType === 'from' ? 'fromUserConfirmed' : 'toUserConfirmed'
    await fetch(
      `${FIRESTORE_BASE_URL}/ownershipTransfers/${docId}?updateMask.fieldPaths=${confirmField}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { [confirmField]: toFirestoreValue(true) },
        }),
      }
    )

    // Check if both have confirmed
    const otherConfirmed = userType === 'from' ? parsed.toUserConfirmed : parsed.fromUserConfirmed

    if (otherConfirmed) {
      // Complete the transfer
      await completeOwnershipTransfer(
        docId as string,
        parsed.companyId as string,
        parsed.fromUserId as string,
        parsed.toUserId as string
      )
      return NextResponse.json({ success: true, completed: true })
    }

    return NextResponse.json({ success: true, completed: false })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke bekrefte overføring' },
      { status: 500 }
    )
  }
}

async function completeOwnershipTransfer(
  transferId: string,
  companyId: string,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  // Update transfer status
  await fetch(
    `${FIRESTORE_BASE_URL}/ownershipTransfers/${transferId}?updateMask.fieldPaths=status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { status: toFirestoreValue('completed') },
      }),
    }
  )

  // Find and update old owner's membership
  const oldOwnerQuery = {
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
                value: { stringValue: fromUserId },
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

  const oldOwnerResponse = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(oldOwnerQuery),
  })

  if (oldOwnerResponse.ok) {
    const oldOwnerData = await oldOwnerResponse.json()
    if (oldOwnerData && oldOwnerData.length > 0 && oldOwnerData[0].document) {
      const oldOwnerMembershipId = oldOwnerData[0].document.name.split('/').pop()
      // Change old owner to admin
      await fetch(
        `${FIRESTORE_BASE_URL}/memberships/${oldOwnerMembershipId}?updateMask.fieldPaths=role&updateMask.fieldPaths=permissions`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              role: toFirestoreValue('admin'),
              permissions: toFirestoreValue({ channels: true }),
            },
          }),
        }
      )
    }
  }

  // Find and update new owner's membership
  const newOwnerQuery = {
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

  const newOwnerResponse = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newOwnerQuery),
  })

  if (newOwnerResponse.ok) {
    const newOwnerData = await newOwnerResponse.json()
    if (newOwnerData && newOwnerData.length > 0 && newOwnerData[0].document) {
      const newOwnerMembershipId = newOwnerData[0].document.name.split('/').pop()
      // Change new owner to owner role
      await fetch(
        `${FIRESTORE_BASE_URL}/memberships/${newOwnerMembershipId}?updateMask.fieldPaths=role&updateMask.fieldPaths=permissions`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              role: toFirestoreValue('owner'),
              permissions: toFirestoreValue({}),
            },
          }),
        }
      )
    }
  }

  // Update company ownerId
  await fetch(
    `${FIRESTORE_BASE_URL}/companies/${companyId}?updateMask.fieldPaths=ownerId`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { ownerId: toFirestoreValue(toUserId) },
      }),
    }
  )

  // Update user roles
  await fetch(
    `${FIRESTORE_BASE_URL}/users/${fromUserId}?updateMask.fieldPaths=role`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { role: toFirestoreValue('admin') },
      }),
    }
  )

  await fetch(
    `${FIRESTORE_BASE_URL}/users/${toUserId}?updateMask.fieldPaths=role`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { role: toFirestoreValue('owner') },
      }),
    }
  )
}
