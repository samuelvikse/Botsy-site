/**
 * Firestore operations for Email integration
 * Uses Firebase REST API (no Admin SDK / service account needed)
 */

import { parseFirestoreFields, toFirestoreValue } from './firestore-utils'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export interface EmailChannel {
  provider: 'sendgrid' | 'mailgun' | 'smtp' | 'gmail'
  emailAddress: string
  isActive: boolean
  isVerified: boolean
  credentials: {
    apiKey?: string
    domain?: string
    smtpHost?: string
    smtpPort?: string
    smtpUser?: string
    smtpPass?: string
    // Gmail OAuth
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
  processedGmailMessageIds?: string[]
  lastGmailCheckAt?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Get Email channel configuration for a company
 */
export async function getEmailChannel(companyId: string): Promise<EmailChannel | null> {
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
    const email = channels?.email as Record<string, unknown> | undefined

    if (!email) return null

    const credentials = email.credentials as Record<string, unknown> | undefined

    return {
      provider: email.provider as 'sendgrid' | 'mailgun' | 'smtp' | 'gmail',
      emailAddress: email.emailAddress as string,
      isActive: email.isActive as boolean ?? false,
      isVerified: email.isVerified as boolean ?? false,
      credentials: {
        apiKey: credentials?.apiKey as string | undefined,
        domain: credentials?.domain as string | undefined,
        smtpHost: credentials?.smtpHost as string | undefined,
        smtpPort: credentials?.smtpPort as string | undefined,
        smtpUser: credentials?.smtpUser as string | undefined,
        smtpPass: credentials?.smtpPass as string | undefined,
        accessToken: credentials?.accessToken as string | undefined,
        refreshToken: credentials?.refreshToken as string | undefined,
        expiresAt: credentials?.expiresAt as number | undefined,
      },
      processedGmailMessageIds: email.processedGmailMessageIds as string[] | undefined,
      lastGmailCheckAt: email.lastGmailCheckAt as string | undefined,
      createdAt: email.createdAt as Date | undefined,
      updatedAt: email.updatedAt as Date | undefined,
    }
  } catch (error) {
    console.error('[Email Firestore] Error getting channel:', error)
    return null
  }
}

/**
 * Find company by email address
 */
export async function findCompanyByEmail(emailAddress: string): Promise<string | null> {
  try {
    const normalizedEmail = emailAddress.toLowerCase().trim()

    const query = {
      structuredQuery: {
        from: [{ collectionId: 'companies' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'channels.email.emailAddress' },
                  op: 'EQUAL',
                  value: { stringValue: normalizedEmail }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'channels.email.isActive' },
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
      console.error('[Email Firestore] Query error:', response.status)
      return null
    }

    const results = await response.json()

    if (!results || results.length === 0 || !results[0].document) {
      return null
    }

    const docName = results[0].document.name as string
    const companyId = docName.split('/').pop()

    return companyId || null
  } catch (error) {
    console.error('[Email Firestore] Error finding company:', error)
    return null
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
    console.error('[Email Firestore] Error getting business profile:', error)
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
    console.error('[Email Firestore] Error getting FAQs:', error)
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
    console.error('[Email Firestore] Error getting instructions:', error)
    return []
  }
}

/**
 * Email message interface
 */
export interface EmailMessage {
  id: string
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  subject: string
  body: string
  timestamp: Date
}

/**
 * Save an email message to the conversation
 */
export async function saveEmailMessage(
  companyId: string,
  customerEmail: string,
  message: Omit<EmailMessage, 'id'>
): Promise<string> {
  try {
    const normalizedEmail = customerEmail.toLowerCase().trim().replace(/[.#$[\]]/g, '_')
    const chatPath = `companies/${companyId}/emailChats/${normalizedEmail}`
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // First, try to get existing chat
    const chatResponse = await fetch(`${FIRESTORE_BASE_URL}/${chatPath}`)

    const messageData = {
      id: messageId,
      direction: message.direction,
      from: message.from,
      to: message.to,
      subject: message.subject,
      body: message.body,
      timestamp: message.timestamp.toISOString(),
    }

    if (chatResponse.ok) {
      // Chat exists, update it
      const existingDoc = await chatResponse.json()
      const existingData = existingDoc.fields ? parseFirestoreFields(existingDoc.fields) : {}
      const existingMessages = (existingData.messages as Array<Record<string, unknown>>) || []

      await fetch(`${FIRESTORE_BASE_URL}/${chatPath}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            customerEmail: toFirestoreValue(customerEmail.toLowerCase().trim()),
            messages: toFirestoreValue([...existingMessages, messageData]),
            lastMessageAt: toFirestoreValue(new Date().toISOString()),
            lastSubject: toFirestoreValue(message.subject),
          }
        })
      })
    } else {
      // Create new chat
      await fetch(`${FIRESTORE_BASE_URL}/${chatPath}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            customerEmail: toFirestoreValue(customerEmail.toLowerCase().trim()),
            messages: toFirestoreValue([messageData]),
            lastMessageAt: toFirestoreValue(new Date().toISOString()),
            lastSubject: toFirestoreValue(message.subject),
            createdAt: toFirestoreValue(new Date().toISOString()),
          }
        })
      })
    }

    return messageId
  } catch (error) {
    console.error('[Email Firestore] Error saving message:', error)
    throw error
  }
}

/**
 * Get email conversation history
 */
export async function getEmailHistory(
  companyId: string,
  customerEmail: string,
  limitCount = 20
): Promise<EmailMessage[]> {
  try {
    const normalizedEmail = customerEmail.toLowerCase().trim().replace(/[.#$[\]]/g, '_')
    const chatPath = `companies/${companyId}/emailChats/${normalizedEmail}`

    const response = await fetch(`${FIRESTORE_BASE_URL}/${chatPath}`)

    if (!response.ok) return []

    const doc = await response.json()

    if (!doc.fields) return []

    const data = parseFirestoreFields(doc.fields)
    const messages = (data.messages as Array<Record<string, unknown>>) || []

    return messages.slice(-limitCount).map((msg) => ({
      id: msg.id as string,
      direction: msg.direction as 'inbound' | 'outbound',
      from: msg.from as string,
      to: msg.to as string,
      subject: msg.subject as string,
      body: msg.body as string,
      timestamp: new Date(msg.timestamp as string),
    }))
  } catch (error) {
    console.error('[Email Firestore] Error getting history:', error)
    return []
  }
}

/**
 * Get all email conversations for a company
 */
export async function getAllEmailChats(
  companyId: string
): Promise<Array<{
  customerEmail: string
  lastSubject: string
  lastMessage: EmailMessage | null
  lastMessageAt: Date
  messageCount: number
}>> {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}/emailChats`)

    if (!response.ok) return []

    const data = await response.json()

    if (!data.documents) return []

    const chats = data.documents.map((doc: { name: string; fields?: Record<string, unknown> }) => {
      if (!doc.fields) return null

      const chatData = parseFirestoreFields(doc.fields)
      const messages = (chatData.messages as Array<Record<string, unknown>>) || []
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null

      return {
        customerEmail: chatData.customerEmail as string || '',
        lastSubject: chatData.lastSubject as string || '',
        lastMessage: lastMsg ? {
          id: lastMsg.id as string,
          direction: lastMsg.direction as 'inbound' | 'outbound',
          from: lastMsg.from as string,
          to: lastMsg.to as string,
          subject: lastMsg.subject as string,
          body: lastMsg.body as string,
          timestamp: new Date(lastMsg.timestamp as string),
        } : null,
        lastMessageAt: chatData.lastMessageAt ? new Date(chatData.lastMessageAt as string) : new Date(),
        messageCount: messages.length,
      }
    }).filter(Boolean)

    // Sort by last message time
    chats.sort((a: { lastMessageAt: Date }, b: { lastMessageAt: Date }) =>
      b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    )

    return chats
  } catch (error) {
    console.error('[Email Firestore] Error getting all chats:', error)
    return []
  }
}

/**
 * Get all companies with active Gmail email channel (for cron polling)
 */
export async function getCompaniesWithActiveGmail(): Promise<Array<{
  companyId: string
  emailAddress: string
  credentials: {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
  processedGmailMessageIds: string[]
}>> {
  try {
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'companies' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'channels.email.provider' },
                  op: 'EQUAL',
                  value: { stringValue: 'gmail' }
                }
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'channels.email.isActive' },
                  op: 'EQUAL',
                  value: { booleanValue: true }
                }
              }
            ]
          }
        },
        limit: 100
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
      console.error('[Email Firestore] Gmail query error:', response.status)
      return []
    }

    const results = await response.json()

    if (!results || results.length === 0) return []

    return results
      .filter((r: { document?: unknown }) => r.document)
      .map((r: { document: { name: string; fields: Record<string, unknown> } }) => {
        const docName = r.document.name
        const companyId = docName.split('/').pop()!
        const data = parseFirestoreFields(r.document.fields)
        const channels = data.channels as Record<string, unknown> | undefined
        const email = channels?.email as Record<string, unknown> | undefined
        const credentials = email?.credentials as Record<string, unknown> | undefined

        return {
          companyId,
          emailAddress: (email?.emailAddress as string) || '',
          credentials: {
            accessToken: credentials?.accessToken as string | undefined,
            refreshToken: credentials?.refreshToken as string | undefined,
            expiresAt: credentials?.expiresAt as number | undefined,
          },
          processedGmailMessageIds: (email?.processedGmailMessageIds as string[]) || [],
        }
      })
  } catch (error) {
    console.error('[Email Firestore] Error getting Gmail companies:', error)
    return []
  }
}

/**
 * Update Gmail check state (processed message IDs and last check time)
 */
export async function updateGmailCheckState(
  companyId: string,
  processedIds: string[],
  lastCheckAt: string
): Promise<void> {
  try {
    // Keep only last 50 IDs to prevent unbounded growth
    const trimmedIds = processedIds.slice(-50)

    await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}?updateMask.fieldPaths=channels.email.processedGmailMessageIds&updateMask.fieldPaths=channels.email.lastGmailCheckAt`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            channels: toFirestoreValue({
              email: {
                processedGmailMessageIds: trimmedIds,
                lastGmailCheckAt: lastCheckAt,
              }
            })
          }
        })
      }
    )
  } catch (error) {
    console.error('[Email Firestore] Error updating Gmail check state:', error)
  }
}

/**
 * Update Gmail access token after refresh
 */
export async function updateGmailAccessToken(
  companyId: string,
  accessToken: string,
  expiresAt: number
): Promise<void> {
  try {
    await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}?updateMask.fieldPaths=channels.email.credentials.accessToken&updateMask.fieldPaths=channels.email.credentials.expiresAt`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            channels: toFirestoreValue({
              email: {
                credentials: {
                  accessToken,
                  expiresAt,
                }
              }
            })
          }
        })
      }
    )
  } catch (error) {
    console.error('[Email Firestore] Error updating Gmail access token:', error)
  }
}
