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
 * Convert JavaScript value to Firestore field format
 */
function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { nullValue: null }
  }
  if (typeof value === 'string') {
    return { stringValue: value }
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) }
    }
    return { doubleValue: value }
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value }
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() }
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    }
  }
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(value) }
}

/**
 * Save Messenger message to conversation history
 */
export async function saveMessengerMessage(
  companyId: string,
  senderId: string,
  message: Omit<MessengerChatMessage, 'id'>
): Promise<void> {
  try {
    // Get existing chat or create new one
    const chatDocPath = `${FIRESTORE_BASE_URL}/companies/${companyId}/messengerChats/${senderId}`
    const response = await fetch(chatDocPath)

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const messageData = {
      id: messageId,
      direction: message.direction,
      senderId: message.senderId,
      text: message.text,
      timestamp: message.timestamp.toISOString(),
      messageId: message.messageId || '',
    }

    if (response.ok) {
      // Chat exists, get existing messages and append
      const doc = await response.json()
      const existingData = doc.fields ? parseFirestoreFields(doc.fields) : {}
      const existingMessages = (existingData.messages as unknown[]) || []

      // Build update
      const updateData = {
        fields: {
          senderId: toFirestoreValue(senderId),
          messages: toFirestoreValue([...existingMessages.map(m => {
            const msg = m as Record<string, unknown>
            return {
              id: msg.id,
              direction: msg.direction,
              senderId: msg.senderId,
              text: msg.text,
              timestamp: msg.timestamp,
              messageId: msg.messageId,
            }
          }), messageData]),
          lastMessageAt: toFirestoreValue(new Date()),
          updatedAt: toFirestoreValue(new Date()),
        }
      }

      await fetch(chatDocPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
    } else {
      // Create new chat document
      const newChatData = {
        fields: {
          senderId: toFirestoreValue(senderId),
          messages: toFirestoreValue([messageData]),
          lastMessageAt: toFirestoreValue(new Date()),
          createdAt: toFirestoreValue(new Date()),
          updatedAt: toFirestoreValue(new Date()),
        }
      }

      await fetch(chatDocPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChatData),
      })
    }

    console.log('[Messenger] Message saved:', { companyId, senderId, direction: message.direction })
  } catch (error) {
    console.error('[Messenger Firestore] Error saving message:', error)
  }
}

/**
 * Get Messenger conversation history
 */
export async function getMessengerHistory(
  companyId: string,
  senderId: string,
  limitCount: number = 10
): Promise<MessengerChatMessage[]> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}/messengerChats/${senderId}`)

    if (!response.ok) return []

    const doc = await response.json()
    if (!doc.fields) return []

    const data = parseFirestoreFields(doc.fields)
    const messages = (data.messages as unknown[]) || []

    return messages.slice(-limitCount).map((m) => {
      const msg = m as Record<string, unknown>
      return {
        id: msg.id as string,
        direction: msg.direction as 'inbound' | 'outbound',
        senderId: msg.senderId as string,
        text: msg.text as string,
        timestamp: new Date(msg.timestamp as string),
        messageId: msg.messageId as string | undefined,
      }
    })
  } catch (error) {
    console.error('[Messenger Firestore] Error getting history:', error)
    return []
  }
}

/**
 * Get all Messenger chats for a company
 */
export async function getAllMessengerChats(
  companyId: string
): Promise<Array<{
  senderId: string
  lastMessage: MessengerChatMessage | null
  lastMessageAt: Date
  messageCount: number
}>> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}/messengerChats`)

    if (!response.ok) return []

    const data = await response.json()
    if (!data.documents) return []

    const chats: Array<{
      senderId: string
      lastMessage: MessengerChatMessage | null
      lastMessageAt: Date
      messageCount: number
    }> = []

    for (const doc of data.documents) {
      if (!doc.fields) continue

      const chatData = parseFirestoreFields(doc.fields)
      const messages = (chatData.messages as unknown[]) || []
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] as Record<string, unknown> : null

      chats.push({
        senderId: chatData.senderId as string || doc.name.split('/').pop() || '',
        lastMessage: lastMsg ? {
          id: lastMsg.id as string,
          direction: lastMsg.direction as 'inbound' | 'outbound',
          senderId: lastMsg.senderId as string,
          text: lastMsg.text as string,
          timestamp: new Date(lastMsg.timestamp as string),
          messageId: lastMsg.messageId as string | undefined,
        } : null,
        lastMessageAt: chatData.lastMessageAt
          ? new Date(chatData.lastMessageAt as string)
          : new Date(),
        messageCount: messages.length,
      })
    }

    // Sort by last message time
    chats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

    return chats
  } catch (error) {
    console.error('[Messenger Firestore] Error getting all chats:', error)
    return []
  }
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
