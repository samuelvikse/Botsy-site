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
  token: string
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

  return { uid: user.uid, email: user.email, token }
}

/**
 * Check if a user has access to a specific company.
 * First checks the memberships collection, then falls back to the users document
 * (company owners don't always have a membership document).
 */
export async function requireCompanyAccess(
  userId: string,
  companyId: string,
  idToken?: string
): Promise<CompanyAccess | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`
    }

    // 1. Check memberships collection
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
      headers,
      body: JSON.stringify(queryBody),
    })

    if (response.ok) {
      const data = await response.json()
      if (data && data.length > 0 && data[0].document) {
        const doc = data[0].document
        const fields = doc.fields || {}
        const role = fields.role?.stringValue as 'owner' | 'admin' | 'employee'
        const status = fields.status?.stringValue || 'active'
        const membershipId = doc.name.split('/').pop() || ''

        if (status === 'suspended') return null
        return { role, membershipId, status }
      }
    }

    // 2. Fallback: check users/{userId} document for legacy owners
    // Company owners created during signup don't get a membership document.
    // Their role and companyId are stored directly in the users document.
    const userDocUrl = `${FIRESTORE_BASE_URL}/users/${userId}`
    const userResponse = await fetch(userDocUrl, { headers })

    if (!userResponse.ok) return null

    const userDoc = await userResponse.json()
    const userFields = userDoc.fields || {}
    const userCompanyId = userFields.companyId?.stringValue
    const userRole = userFields.role?.stringValue

    if (userCompanyId === companyId && userRole) {
      const role = (userRole === 'pending' ? 'employee' : userRole) as 'owner' | 'admin' | 'employee'
      return { role, membershipId: 'legacy', status: 'active' }
    }

    return null
  } catch (error) {
    console.error('[requireCompanyAccess] Exception:', error)
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

/**
 * Check if the authenticated user is a platform admin (developer).
 */
const ADMIN_EMAILS = ['hei@botsy.no']

export function isAdmin(email: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}
