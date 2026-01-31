/**
 * Firestore operations for Messenger integration
 * Uses Firebase REST API (no Admin SDK / service account needed)
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export interface MessengerChannel {
  pageId: string
  pageName: string
  isActive: boolean
  isVerified: boolean
  credentials: {
    pageAccessToken?: string
    appSecret?: string
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface MessengerChatMessage {
  id: string
  direction: 'inbound' | 'outbound'
  senderId: string
  text: string
  timestamp: Date
  messageId?: string
}

/**
 * Parse Firestore document fields to JavaScript object
 */
function parseFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fields)) {
    const v = value as Record<string, unknown>
    if ('stringValue' in v) result[key] = v.stringValue
    else if ('integerValue' in v) result[key] = parseInt(v.integerValue as string)
    else if ('doubleValue' in v) result[key] = v.doubleValue
    else if ('booleanValue' in v) result[key] = v.booleanValue
    else if ('timestampValue' in v) result[key] = new Date(v.timestampValue as string)
    else if ('mapValue' in v) {
      const mapValue = v.mapValue as { fields?: Record<string, unknown> }
      result[key] = mapValue.fields ? parseFirestoreFields(mapValue.fields) : {}
    }
    else if ('arrayValue' in v) {
      const arrayValue = v.arrayValue as { values?: unknown[] }
      result[key] = arrayValue.values || []
    }
    else if ('nullValue' in v) result[key] = null
  }

  return result
}

/**
 * Get Messenger channel configuration for a company
 */
export async function getMessengerChannel(companyId: string): Promise<MessengerChannel | null> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}`)

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Firestore error: ${response.status}`)
    }

    const doc = await response.json()

    if (!doc.fields) return null

    const data = parseFirestoreFields(doc.fields)
    const channels = data.channels as Record<string, unknown> | undefined
    const messenger = channels?.messenger as Record<string, unknown> | undefined

    if (!messenger) return null

    const credentials = messenger.credentials as Record<string, unknown> | undefined

    return {
      pageId: messenger.pageId as string,
      pageName: messenger.pageName as string,
      isActive: messenger.isActive as boolean ?? false,
      isVerified: messenger.isVerified as boolean ?? false,
      credentials: {
        pageAccessToken: credentials?.pageAccessToken as string | undefined,
        appSecret: credentials?.appSecret as string | undefined,
      },
      createdAt: messenger.createdAt as Date | undefined,
      updatedAt: messenger.updatedAt as Date | undefined,
    }
  } catch (error) {
    console.error('[Messenger Firestore] Error getting channel:', error)
    return null
  }
}

/**
 * Find company by Facebook Page ID
 */
export async function findCompanyByPageId(pageId: string): Promise<string | null> {
  try {
    // Use Firestore REST API to query
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'companies' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'channels.messenger.pageId' },
                  op: 'EQUAL',
                  value: { stringValue: pageId }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'channels.messenger.isActive' },
                  op: 'EQUAL',
                  value: { booleanValue: true }
                }
              }
            ]
          }
        },
        limit: 1
      }
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      }
    )

    if (!response.ok) {
      console.error('[Messenger Firestore] Query error:', response.status)
      return null
    }

    const results = await response.json()

    if (!results || results.length === 0 || !results[0].document) {
      return null
    }

    // Extract company ID from document name
    const docName = results[0].document.name as string
    const companyId = docName.split('/').pop()

    return companyId || null
  } catch (error) {
    console.error('[Messenger Firestore] Error finding company:', error)
    return null
  }
}

/**
 * Save Messenger message to conversation history
 */
export async function saveMessengerMessage(
  companyId: string,
  senderId: string,
  message: Omit<MessengerChatMessage, 'id'>
): Promise<void> {
  // For now, we'll skip saving messages since we don't have write access
  // Messages are stored in memory for the session context
  console.log('[Messenger] Message logged:', { companyId, senderId, direction: message.direction })
}

/**
 * Get Messenger conversation history
 */
export async function getMessengerHistory(
  companyId: string,
  senderId: string,
  limit: number = 10
): Promise<MessengerChatMessage[]> {
  // Without Admin SDK, we return empty history for now
  // The bot will work without history context
  return []
}

/**
 * Get business profile for AI context
 */
export async function getBusinessProfile(companyId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}`)

    if (!response.ok) return null

    const doc = await response.json()

    if (!doc.fields) return null

    const data = parseFirestoreFields(doc.fields)
    return data.businessProfile as Record<string, unknown> | null
  } catch (error) {
    console.error('[Messenger Firestore] Error getting business profile:', error)
    return null
  }
}

/**
 * Get FAQs for AI context
 */
export async function getFAQs(companyId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}/faqs`)

    if (!response.ok) return []

    const data = await response.json()

    if (!data.documents) return []

    return data.documents.map((doc: { fields?: Record<string, unknown> }) => {
      if (!doc.fields) return {}
      return parseFirestoreFields(doc.fields)
    }).filter((faq: Record<string, unknown>) => faq.confirmed === true)
  } catch (error) {
    console.error('[Messenger Firestore] Error getting FAQs:', error)
    return []
  }
}

/**
 * Get active instructions for AI context
 */
export async function getActiveInstructions(companyId: string): Promise<Array<{ content: string; priority: string }>> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}/instructions`)

    if (!response.ok) return []

    const data = await response.json()

    if (!data.documents) return []

    const now = new Date()

    return data.documents
      .map((doc: { fields?: Record<string, unknown> }) => {
        if (!doc.fields) return null
        const instruction = parseFirestoreFields(doc.fields)
        return {
          content: instruction.content as string,
          priority: instruction.priority as string || 'medium',
          isActive: instruction.isActive as boolean,
          startsAt: instruction.startsAt as Date | undefined,
          expiresAt: instruction.expiresAt as Date | undefined,
        }
      })
      .filter((inst: { isActive: boolean; startsAt?: Date; expiresAt?: Date } | null) => {
        if (!inst || !inst.isActive) return false
        if (inst.startsAt && inst.startsAt > now) return false
        if (inst.expiresAt && inst.expiresAt < now) return false
        return true
      })
      .map((inst: { content: string; priority: string }) => ({
        content: inst.content,
        priority: inst.priority,
      }))
  } catch (error) {
    console.error('[Messenger Firestore] Error getting instructions:', error)
    return []
  }
}
