/**
 * Firestore operations for Messenger integration
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

// Initialize Firebase Admin
function getAdminDb() {
  if (getApps().length === 0) {
    // Check if we have service account credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
      } catch {
        // Fall back to default initialization
        initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
      }
    } else {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    }
  }
  return getFirestore()
}

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
  messageId?: string // Facebook's message ID
}

/**
 * Get Messenger channel configuration for a company
 */
export async function getMessengerChannel(companyId: string): Promise<MessengerChannel | null> {
  const db = getAdminDb()
  const doc = await db.collection('companies').doc(companyId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()
  const messenger = data?.channels?.messenger

  if (!messenger) {
    return null
  }

  return {
    pageId: messenger.pageId,
    pageName: messenger.pageName,
    isActive: messenger.isActive ?? false,
    isVerified: messenger.isVerified ?? false,
    credentials: messenger.credentials || {},
    createdAt: messenger.createdAt?.toDate(),
    updatedAt: messenger.updatedAt?.toDate(),
  }
}

/**
 * Find company by Facebook Page ID
 */
export async function findCompanyByPageId(pageId: string): Promise<string | null> {
  const db = getAdminDb()

  // Query companies where channels.messenger.pageId matches
  const snapshot = await db
    .collection('companies')
    .where('channels.messenger.pageId', '==', pageId)
    .where('channels.messenger.isActive', '==', true)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return snapshot.docs[0].id
}

/**
 * Save Messenger message to conversation history
 */
export async function saveMessengerMessage(
  companyId: string,
  senderId: string,
  message: Omit<MessengerChatMessage, 'id'>
): Promise<void> {
  const db = getAdminDb()
  const chatRef = db
    .collection('companies')
    .doc(companyId)
    .collection('messengerChats')
    .doc(senderId)

  const messageData = {
    ...message,
    timestamp: Timestamp.fromDate(message.timestamp),
  }

  // Check if chat document exists
  const chatDoc = await chatRef.get()

  if (!chatDoc.exists) {
    // Create new chat document
    await chatRef.set({
      senderId,
      createdAt: Timestamp.now(),
      lastMessageAt: Timestamp.fromDate(message.timestamp),
      messages: [messageData],
    })
  } else {
    // Add message to existing chat
    await chatRef.update({
      lastMessageAt: Timestamp.fromDate(message.timestamp),
      messages: FieldValue.arrayUnion(messageData),
    })
  }
}

/**
 * Get Messenger conversation history
 */
export async function getMessengerHistory(
  companyId: string,
  senderId: string,
  limit: number = 10
): Promise<MessengerChatMessage[]> {
  const db = getAdminDb()
  const chatRef = db
    .collection('companies')
    .doc(companyId)
    .collection('messengerChats')
    .doc(senderId)

  const chatDoc = await chatRef.get()

  if (!chatDoc.exists) {
    return []
  }

  const data = chatDoc.data()
  const messages = data?.messages || []

  // Return last N messages
  return messages
    .slice(-limit)
    .map((msg: { direction: string; senderId: string; text: string; timestamp: { toDate: () => Date }; messageId?: string }, index: number) => ({
      id: `msg-${index}`,
      direction: msg.direction as 'inbound' | 'outbound',
      senderId: msg.senderId,
      text: msg.text,
      timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(),
      messageId: msg.messageId,
    }))
}

/**
 * Get business profile for AI context
 */
export async function getBusinessProfile(companyId: string) {
  const db = getAdminDb()
  const doc = await db.collection('companies').doc(companyId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()
  return data?.businessProfile || null
}

/**
 * Get FAQs for AI context
 */
export async function getFAQs(companyId: string) {
  const db = getAdminDb()
  const snapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('faqs')
    .where('confirmed', '==', true)
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Get active instructions for AI context
 */
export async function getActiveInstructions(companyId: string) {
  const db = getAdminDb()
  const now = Timestamp.now()

  const snapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('instructions')
    .where('isActive', '==', true)
    .get()

  return snapshot.docs
    .map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        content: data.content,
        priority: data.priority || 'medium',
        startsAt: data.startsAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
      }
    })
    .filter(instruction => {
      // Filter by date range if specified
      if (instruction.startsAt && instruction.startsAt > now.toDate()) {
        return false
      }
      if (instruction.expiresAt && instruction.expiresAt < now.toDate()) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) -
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 1)
    })
}
