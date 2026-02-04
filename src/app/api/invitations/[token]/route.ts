import { NextRequest, NextResponse } from 'next/server'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'
import { sendWelcomeToTeamEmail } from '@/lib/botsy-emails'
import { logMembershipChange } from '@/lib/audit-log'
import type { Invitation, EmployeePermissions, AdminPermissions } from '@/types'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

// GET - Get invitation by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token er påkrevd' },
        { status: 400 }
      )
    }

    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'invitations' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'token' },
            op: 'EQUAL',
            value: { stringValue: token },
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
        { error: 'Invitasjonen finnes ikke' },
        { status: 404 }
      )
    }

    const data = await response.json()

    if (!data || data.length === 0 || !data[0].document) {
      return NextResponse.json(
        { error: 'Invitasjonen finnes ikke' },
        { status: 404 }
      )
    }

    const doc = data[0].document
    const parsed = parseFirestoreFields(doc.fields)
    const docId = doc.name.split('/').pop()

    const invitation: Invitation = {
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

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      // Update status to expired
      await fetch(
        `${FIRESTORE_BASE_URL}/invitations/${docId}?updateMask.fieldPaths=status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: { status: toFirestoreValue('expired') },
          }),
        }
      )
      return NextResponse.json(
        { error: 'Invitasjonen har utløpt' },
        { status: 410 }
      )
    }

    // Check if already used
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitasjonen er ikke lenger gyldig' },
        { status: 410 }
      )
    }

    // Return invitation without the token for security
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        companyId: invitation.companyId,
        email: invitation.email,
        role: invitation.role,
        inviterName: invitation.inviterName,
        companyName: invitation.companyName,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke hente invitasjon' },
      { status: 500 }
    )
  }
}

// POST - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { userId } = body

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token og userId er påkrevd' },
        { status: 400 }
      )
    }

    // Get the invitation
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'invitations' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'token' },
            op: 'EQUAL',
            value: { stringValue: token },
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
        { error: 'Invitasjonen finnes ikke' },
        { status: 404 }
      )
    }

    const data = await response.json()

    if (!data || data.length === 0 || !data[0].document) {
      return NextResponse.json(
        { error: 'Invitasjonen finnes ikke' },
        { status: 404 }
      )
    }

    const doc = data[0].document
    const parsed = parseFirestoreFields(doc.fields)
    const docId = doc.name.split('/').pop()

    // Check status
    if (parsed.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitasjonen er ikke lenger gyldig' },
        { status: 410 }
      )
    }

    // Check expiration
    const expiresAt = new Date(parsed.expiresAt as string)
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Invitasjonen har utløpt' },
        { status: 410 }
      )
    }

    // Check if user already has a membership for this company
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
                  value: { stringValue: userId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'companyId' },
                  op: 'EQUAL',
                  value: { stringValue: parsed.companyId as string },
                },
              },
            ],
          },
        },
      },
    }

    const membershipResponse = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(membershipQuery),
    })

    if (membershipResponse.ok) {
      const membershipData = await membershipResponse.json()
      if (membershipData && membershipData.length > 0 && membershipData[0].document) {
        return NextResponse.json(
          { error: 'Du er allerede medlem av denne bedriften' },
          { status: 400 }
        )
      }
    }

    // Create membership
    const now = new Date()
    const membershipCreateResponse = await fetch(`${FIRESTORE_BASE_URL}/memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          userId: toFirestoreValue(userId),
          companyId: toFirestoreValue(parsed.companyId as string),
          role: toFirestoreValue(parsed.role as string),
          permissions: toFirestoreValue(parsed.permissions || {}),
          invitedBy: toFirestoreValue(parsed.invitedBy as string),
          joinedAt: toFirestoreValue(now),
          status: toFirestoreValue('active'),
        },
      }),
    })

    if (!membershipCreateResponse.ok) {
      throw new Error('Failed to create membership')
    }

    // Update user's companyId
    await fetch(
      `${FIRESTORE_BASE_URL}/users/${userId}?updateMask.fieldPaths=companyId&updateMask.fieldPaths=role`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            companyId: toFirestoreValue(parsed.companyId as string),
            role: toFirestoreValue(parsed.role as string),
          },
        }),
      }
    )

    // Mark invitation as accepted
    await fetch(
      `${FIRESTORE_BASE_URL}/invitations/${docId}?updateMask.fieldPaths=status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { status: toFirestoreValue('accepted') },
        }),
      }
    )

    // Get user data for the email
    let userEmail = parsed.email as string
    let userName = ''
    try {
      const userResponse = await fetch(`${FIRESTORE_BASE_URL}/users/${userId}`)
      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.fields) {
          const userParsed = parseFirestoreFields(userData.fields)
          userEmail = (userParsed.email as string) || userEmail
          userName = (userParsed.displayName as string) || ''
        }
      }
    } catch {
      // Ignore errors fetching user data
    }

    // Send welcome email
    try {
      await sendWelcomeToTeamEmail({
        to: userEmail,
        memberName: userName || userEmail.split('@')[0],
        companyName: parsed.companyName as string,
        role: parsed.role as 'admin' | 'employee',
        inviterName: parsed.inviterName as string,
      })
      console.log(`[Invitation] Sent welcome email to ${userEmail}`)
    } catch (emailError) {
      console.error('[Invitation] Failed to send welcome email:', emailError)
    }

    // Log audit event
    try {
      await logMembershipChange({
        action: 'member.joined',
        actorId: userId,
        actorEmail: userEmail,
        targetId: userId,
        targetEmail: userEmail,
        companyId: parsed.companyId as string,
        newRole: parsed.role as string,
      })
    } catch (auditError) {
      console.error('[Invitation] Failed to log audit event:', auditError)
    }

    return NextResponse.json({
      success: true,
      companyId: parsed.companyId as string,
    })
  } catch {
    return NextResponse.json(
      { error: 'Kunne ikke akseptere invitasjon' },
      { status: 500 }
    )
  }
}
