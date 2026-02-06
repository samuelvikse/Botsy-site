/**
 * Firebase REST API utilities
 * Used when Firebase Admin SDK is not available (no service account key)
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1'
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

export interface VerifiedUser {
  uid: string
  email: string | null
}

/**
 * Verify a Firebase ID token using the REST API
 * Returns user info if valid, null if invalid
 */
export async function verifyIdTokenRest(idToken: string): Promise<VerifiedUser | null> {
  if (!API_KEY) {
    console.error('[Firebase REST] No API key configured')
    return null
  }

  try {
    // Use the getAccountInfo endpoint to verify the token and get user info
    const response = await fetch(`${AUTH_BASE_URL}/accounts:lookup?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Firebase REST] Token verification failed:', error)
      return null
    }

    const data = await response.json()
    const user = data.users?.[0]

    if (!user) {
      return null
    }

    return {
      uid: user.localId,
      email: user.email || null,
    }
  } catch (error) {
    console.error('[Firebase REST] Token verification error:', error)
    return null
  }
}

/**
 * Get a document from Firestore using REST API
 */
export async function getDocumentRest(collection: string, docId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${docId}`)

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to get document: ${response.status}`)
    }

    const data = await response.json()
    return parseFirestoreDocument(data.fields || {})
  } catch (error) {
    console.error('[Firebase REST] Get document error:', error)
    return null
  }
}

/**
 * Update a document in Firestore using REST API
 */
export async function updateDocumentRest(
  collection: string,
  docId: string,
  fields: Record<string, unknown>,
  updateMask?: string[]
): Promise<boolean> {
  try {
    let url = `${FIRESTORE_BASE_URL}/${collection}/${docId}`

    if (updateMask && updateMask.length > 0) {
      const maskParams = updateMask.map(f => `updateMask.fieldPaths=${f}`).join('&')
      url += `?${maskParams}`
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(fields) }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Firebase REST] Update document error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Firebase REST] Update document error:', error)
    return false
  }
}

/**
 * Query documents from Firestore using REST API
 */
export async function queryDocumentsRest(
  collection: string,
  fieldPath: string,
  operator: 'EQUAL' | 'LESS_THAN' | 'GREATER_THAN',
  value: unknown,
  limit?: number
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: operator,
              value: toFirestoreValue(value),
            },
          },
          limit: limit || 100,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Firebase REST] Query error:', error)
      return []
    }

    const results = await response.json()
    return results
      .filter((r: { document?: unknown }) => r.document)
      .map((r: { document: { name: string; fields: Record<string, unknown> } }) => ({
        id: r.document.name.split('/').pop() || '',
        data: parseFirestoreDocument(r.document.fields || {}),
      }))
  } catch (error) {
    console.error('[Firebase REST] Query error:', error)
    return []
  }
}

/**
 * Add a document to a subcollection
 */
export async function addDocumentRest(
  collection: string,
  docId: string,
  subcollection: string,
  data: Record<string, unknown>
): Promise<string | null> {
  try {
    const response = await fetch(
      `${FIRESTORE_BASE_URL}/${collection}/${docId}/${subcollection}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(data) }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[Firebase REST] Add document error:', error)
      return null
    }

    const result = await response.json()
    return result.name?.split('/').pop() || null
  } catch (error) {
    console.error('[Firebase REST] Add document error:', error)
    return null
  }
}

/**
 * Delete a document from Firestore using REST API
 */
export async function deleteDocumentRest(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/${path}`, {
      method: 'DELETE',
    })

    return response.ok || response.status === 404
  } catch (error) {
    console.error('[Firebase REST] Delete document error:', error)
    return false
  }
}

/**
 * List documents in a collection/subcollection
 */
export async function listDocumentsRest(
  path: string,
  limit = 500
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/${path}?pageSize=${limit}`)

    if (!response.ok) {
      if (response.status === 404) return []
      return []
    }

    const data = await response.json()
    const documents = data.documents || []

    return documents.map((doc: { name: string; fields: Record<string, unknown> }) => ({
      id: doc.name.split('/').pop() || '',
      data: parseFirestoreDocument(doc.fields || {}),
    }))
  } catch (error) {
    console.error('[Firebase REST] List documents error:', error)
    return []
  }
}

/**
 * Delete a Firebase Auth user account via REST API (using user's own ID token)
 */
export async function deleteAuthUserRest(idToken: string): Promise<boolean> {
  if (!API_KEY) return false

  try {
    const response = await fetch(`${AUTH_BASE_URL}/accounts:delete?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })

    return response.ok
  } catch (error) {
    console.error('[Firebase REST] Delete auth user error:', error)
    return false
  }
}

// Helper functions for Firestore data conversion
function parseFirestoreDocument(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value as Record<string, unknown>)
  }
  return result
}

function parseFirestoreValue(value: Record<string, unknown>): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return parseInt(value.integerValue as string)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return new Date(value.timestampValue as string)
  if ('nullValue' in value) return null
  if ('mapValue' in value) {
    const mapValue = value.mapValue as { fields?: Record<string, unknown> }
    return parseFirestoreDocument(mapValue.fields || {})
  }
  if ('arrayValue' in value) {
    const arrayValue = value.arrayValue as { values?: Array<Record<string, unknown>> }
    return (arrayValue.values || []).map(parseFirestoreValue)
  }
  return null
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = toFirestoreValue(value)
  }
  return result
}

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: value.toString() }
    return { doubleValue: value }
  }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } }
  if (typeof value === 'object') return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } }
  return { nullValue: null }
}
