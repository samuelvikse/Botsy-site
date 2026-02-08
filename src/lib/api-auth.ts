/**
 * Server-side API authentication middleware
 * Verifies Firebase ID tokens and checks company membership
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdTokenRest, type VerifiedUser } from './firebase-rest'
import { adminCorsHeaders } from './cors'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export interface AuthResult {
  uid: string
  email: string | null
}

export interface CompanyAccess {
  role: 'owner' | 'admin' | 'employee'
  membershipId: string
  status: string
}

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the authenticated user or null if invalid/missing.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split('Bearer ')[1]
  if (!token) return null

  const user = await verifyIdTokenRest(token)
  if (!user) return null

  return { uid: user.uid, email: user.email }
}

/**
 * Check if a user has access to a specific company via the memberships collection.
 * Returns the membership info or null if no access.
 */
export async function requireCompanyAccess(
  userId: string,
  companyId: string
): Promise<CompanyAccess | null> {
  try {
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
        limit: 1,
      },
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data || data.length === 0 || !data[0].document) return null

    const doc = data[0].document
    const fields = doc.fields || {}
    const role = fields.role?.stringValue as 'owner' | 'admin' | 'employee'
    const status = fields.status?.stringValue || 'active'
    const membershipId = doc.name.split('/').pop() || ''

    // Suspended users have no access
    if (status === 'suspended') return null

    return { role, membershipId, status }
  } catch {
    return null
  }
}

/**
 * Convenience: verify auth and return 401 response if invalid.
 * Use in route handlers for clean error handling.
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: adminCorsHeaders })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: adminCorsHeaders })
}
