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
 * Parse a single Firestore value to JavaScript value
 */
function parseFirestoreValue(value: unknown): unknown {
  const v = value as Record<string, unknown>
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return parseInt(v.integerValue as string)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue // Keep as string for parsing later
  if ('mapValue' in v) {
    const mapValue = v.mapValue as { fields?: Record<string, unknown> }
    return mapValue.fields ? parseFirestoreFields(mapValue.fields) : {}
  }
  if ('arrayValue' in v) {
    const arrayValue = v.arrayValue as { values?: unknown[] }
    return (arrayValue.values || []).map(parseFirestoreValue)
  }
  if ('nullValue' in v) return null
  return null
}

/**
 * Parse Firestore document fields to JavaScript object
 */
function parseFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value)
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

      // Filter out corrupted messages (where text is undefined/null)
      // and properly format valid messages
      const validMessages = existingMessages
        .map(m => {
          const msg = m as Record<string, unknown>
          // Skip messages without valid text
          if (!msg.text || typeof msg.text !== 'string') {
            console.log('[Messenger] Skipping corrupted message:', msg)
            return null
          }
          return {
            id: msg.id as string || `msg-recovered-${Date.now()}`,
            direction: msg.direction as string || 'inbound',
            senderId: msg.senderId as string || senderId,
            text: msg.text as string,
            timestamp: msg.timestamp as string || new Date().toISOString(),
            messageId: msg.messageId as string || '',
          }
        })
        .filter((m): m is NonNullable<typeof m> => m !== null)

      // Build update
      const updateData = {
        fields: {
          senderId: toFirestoreValue(senderId),
          messages: toFirestoreValue([...validMessages, messageData]),
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

    console.log('[Messenger] Raw messages from Firestore:', JSON.stringify(messages, null, 2))

    // Filter and parse messages, skipping corrupted ones
    const validMessages = messages
      .map((m) => {
        const msg = m as Record<string, unknown>

        // Skip messages without valid text
        if (!msg.text || typeof msg.text !== 'string') {
          console.log('[Messenger] Skipping invalid message:', msg)
          return null
        }

        // Parse timestamp - handle both string and already-parsed formats
        let timestamp: Date
        if (msg.timestamp instanceof Date) {
          timestamp = msg.timestamp
        } else if (typeof msg.timestamp === 'string') {
          timestamp = new Date(msg.timestamp)
        } else {
          timestamp = new Date()
        }

        // Check if timestamp is valid
        if (isNaN(timestamp.getTime())) {
          timestamp = new Date()
        }

        return {
          id: (msg.id as string) || `msg-${Date.now()}`,
          direction: (msg.direction as 'inbound' | 'outbound') || 'inbound',
          senderId: (msg.senderId as string) || senderId,
          text: msg.text as string,
          timestamp,
          messageId: msg.messageId as string | undefined,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)

    return validMessages.slice(-limitCount)
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

    if (!response.ok) {
      console.log('[Messenger] Failed to fetch chats:', response.status)
      return []
    }

    const data = await response.json()
    if (!data.documents) {
      console.log('[Messenger] No documents in response')
      return []
    }

    console.log('[Messenger] Found', data.documents.length, 'chat documents')

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

      // Filter to only valid messages (with text)
      const validMessages = messages.filter((m) => {
        const msg = m as Record<string, unknown>
        return msg.text && typeof msg.text === 'string'
      })

      // Get the last valid message
      const lastMsg = validMessages.length > 0
        ? validMessages[validMessages.length - 1] as Record<string, unknown>
        : null

      // Parse lastMessageAt - handle both string and Date
      let lastMessageAt: Date
      if (chatData.lastMessageAt instanceof Date) {
        lastMessageAt = chatData.lastMessageAt
      } else if (typeof chatData.lastMessageAt === 'string') {
        lastMessageAt = new Date(chatData.lastMessageAt)
      } else {
        lastMessageAt = new Date()
      }

      // Ensure valid date
      if (isNaN(lastMessageAt.getTime())) {
        lastMessageAt = new Date()
      }

      // Parse last message timestamp
      let lastMsgTimestamp: Date | undefined
      if (lastMsg) {
        if (lastMsg.timestamp instanceof Date) {
          lastMsgTimestamp = lastMsg.timestamp
        } else if (typeof lastMsg.timestamp === 'string') {
          lastMsgTimestamp = new Date(lastMsg.timestamp)
        } else {
          lastMsgTimestamp = new Date()
        }
        if (isNaN(lastMsgTimestamp.getTime())) {
          lastMsgTimestamp = new Date()
        }
      }

      chats.push({
        senderId: (chatData.senderId as string) || doc.name.split('/').pop() || '',
        lastMessage: lastMsg ? {
          id: (lastMsg.id as string) || '',
          direction: (lastMsg.direction as 'inbound' | 'outbound') || 'inbound',
          senderId: (lastMsg.senderId as string) || '',
          text: (lastMsg.text as string) || '',
          timestamp: lastMsgTimestamp!,
          messageId: lastMsg.messageId as string | undefined,
        } : null,
        lastMessageAt,
        messageCount: validMessages.length,
      })
    }

    // Sort by last message time
    chats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

    console.log('[Messenger] Returning', chats.length, 'chats')

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

/**
 * Get knowledge documents for AI context
 */
export async function getKnowledgeDocuments(companyId: string): Promise<Array<{
  faqs: Array<{ question: string; answer: string }>
  rules: string[]
  policies: string[]
  importantInfo: string[]
}>> {
  try {
    // Query for documents with status 'ready'
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'knowledgeDocs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'ready' }
          }
        }
      }
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/companies/${companyId}/knowledgeDocs:runQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      }
    )

    if (!response.ok) {
      console.log('[Messenger Firestore] Knowledge docs query failed:', response.status)
      return []
    }

    const results = await response.json()
    console.log('[Messenger Firestore] Knowledge docs raw results:', JSON.stringify(results).substring(0, 500))

    if (!results || results.length === 0) {
      console.log('[Messenger Firestore] No knowledge documents found (empty results)')
      return []
    }

    // Check if the first result has a document (query might return empty skipping documents)
    if (!results[0].document && results.length === 1) {
      console.log('[Messenger Firestore] No knowledge documents found (no document in result)')
      return []
    }

    const documents: Array<{
      faqs: Array<{ question: string; answer: string }>
      rules: string[]
      policies: string[]
      importantInfo: string[]
    }> = []

    for (const result of results) {
      if (!result.document?.fields) {
        console.log('[Messenger Firestore] Skipping result without document fields')
        continue
      }

      const data = parseFirestoreFields(result.document.fields)
      console.log('[Messenger Firestore] Parsed document data keys:', Object.keys(data))

      const analyzedData = data.analyzedData as Record<string, unknown> | undefined

      if (analyzedData) {
        console.log('[Messenger Firestore] AnalyzedData keys:', Object.keys(analyzedData))
        console.log('[Messenger Firestore] FAQs count:', (analyzedData.faqs as unknown[])?.length || 0)
        console.log('[Messenger Firestore] Rules count:', (analyzedData.rules as unknown[])?.length || 0)
        console.log('[Messenger Firestore] ImportantInfo count:', (analyzedData.importantInfo as unknown[])?.length || 0)
        console.log('[Messenger Firestore] ImportantInfo content:', JSON.stringify(analyzedData.importantInfo).substring(0, 300))

        documents.push({
          faqs: (analyzedData.faqs as Array<{ question: string; answer: string }>) || [],
          rules: (analyzedData.rules as string[]) || [],
          policies: (analyzedData.policies as string[]) || [],
          importantInfo: (analyzedData.importantInfo as string[]) || [],
        })
      } else {
        console.log('[Messenger Firestore] No analyzedData in document')
      }
    }

    console.log('[Messenger Firestore] Found', documents.length, 'knowledge documents with data')
    return documents
  } catch (error) {
    console.error('[Messenger Firestore] Error getting knowledge documents:', error)
    return []
  }
}
