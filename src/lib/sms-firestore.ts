import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { encryptCredentials, decryptCredentials, isEncrypted } from './encryption'
import type {
  SMSChannel,
  SMSMessage,
  SMSChannelDoc,
  SMSMessageDoc,
  SMSProvider,
  SMSCredentials,
} from '@/types'

// ============================================
// SMS Channel Functions
// ============================================

export async function getSMSChannel(companyId: string): Promise<SMSChannel | null> {
  if (!db) throw new Error('Firestore not initialized')

  const channelRef = doc(db, 'companies', companyId, 'channels', 'sms')
  const channelSnap = await getDoc(channelRef)

  if (!channelSnap.exists()) return null

  const data = channelSnap.data() as SMSChannelDoc

  // Decrypt credentials if they are encrypted
  let credentials = data.credentials
  if (typeof data.credentials === 'string' && isEncrypted(data.credentials)) {
    credentials = decryptCredentials(data.credentials) as SMSCredentials
  } else if (typeof data.credentials === 'object') {
    credentials = data.credentials
  }

  return {
    id: channelSnap.id,
    provider: data.provider,
    phoneNumber: data.phoneNumber,
    isActive: data.isActive,
    isVerified: data.isVerified,
    credentials,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  }
}

export async function saveSMSChannel(
  companyId: string,
  channel: Omit<SMSChannel, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const channelRef = doc(db, 'companies', companyId, 'channels', 'sms')
  const existingChannel = await getDoc(channelRef)

  // Encrypt credentials before saving
  const encryptedCredentials = encryptCredentials(
    channel.credentials as Record<string, string | undefined>
  )

  const channelData = {
    provider: channel.provider,
    phoneNumber: channel.phoneNumber,
    isActive: channel.isActive,
    isVerified: channel.isVerified,
    credentials: encryptedCredentials,
    createdAt: existingChannel.exists()
      ? existingChannel.data().createdAt
      : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(channelRef, channelData)
}

export async function updateSMSChannel(
  companyId: string,
  updates: Partial<Omit<SMSChannel, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const channelRef = doc(db, 'companies', companyId, 'channels', 'sms')

  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (updates.provider !== undefined) updateData.provider = updates.provider
  if (updates.phoneNumber !== undefined) updateData.phoneNumber = updates.phoneNumber
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive
  if (updates.isVerified !== undefined) updateData.isVerified = updates.isVerified
  if (updates.credentials !== undefined) {
    // Encrypt credentials before saving
    updateData.credentials = encryptCredentials(
      updates.credentials as Record<string, string | undefined>
    )
  }

  await updateDoc(channelRef, updateData)
}

export async function deleteSMSChannel(companyId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const channelRef = doc(db, 'companies', companyId, 'channels', 'sms')

  // Instead of deleting, we deactivate it
  await updateDoc(channelRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  })
}

// ============================================
// Find Company by Phone Number
// ============================================

export async function findCompanyByPhone(phoneNumber: string): Promise<string | null> {
  if (!db) throw new Error('Firestore not initialized')

  // Query all companies for matching phone number
  const companiesRef = collection(db, 'companies')
  const companiesSnap = await getDocs(companiesRef)

  for (const companyDoc of companiesSnap.docs) {
    const channelRef = doc(db, 'companies', companyDoc.id, 'channels', 'sms')
    const channelSnap = await getDoc(channelRef)

    if (channelSnap.exists()) {
      const channelData = channelSnap.data() as SMSChannelDoc
      if (
        channelData.phoneNumber === phoneNumber &&
        channelData.isActive
      ) {
        return companyDoc.id
      }
    }
  }

  return null
}

// ============================================
// SMS Message Functions
// ============================================

export async function saveSMSMessage(
  companyId: string,
  customerPhone: string,
  message: Omit<SMSMessage, 'id'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  // Create/update the SMS chat document
  const chatRef = doc(db, 'companies', companyId, 'smsChats', customerPhone)
  const chatSnap = await getDoc(chatRef)

  const messageData: SMSMessageDoc = {
    direction: message.direction,
    from: message.from,
    to: message.to,
    body: message.body,
    status: message.status,
    providerMessageId: message.providerMessageId,
    timestamp: Timestamp.fromDate(message.timestamp),
  }

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  if (chatSnap.exists()) {
    const existingData = chatSnap.data()
    const messages = existingData.messages || []

    await updateDoc(chatRef, {
      messages: [...messages, { id: messageId, ...messageData }],
      lastMessageAt: serverTimestamp(),
    })
  } else {
    await setDoc(chatRef, {
      customerPhone,
      messages: [{ id: messageId, ...messageData }],
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })
  }

  return messageId
}

export async function getSMSHistory(
  companyId: string,
  customerPhone: string,
  limitCount = 50
): Promise<SMSMessage[]> {
  if (!db) throw new Error('Firestore not initialized')

  const chatRef = doc(db, 'companies', companyId, 'smsChats', customerPhone)
  const chatSnap = await getDoc(chatRef)

  if (!chatSnap.exists()) return []

  const data = chatSnap.data()
  const messages = (data.messages || []).map((msg: SMSMessageDoc & { id: string }) => ({
    id: msg.id,
    direction: msg.direction,
    from: msg.from,
    to: msg.to,
    body: msg.body,
    status: msg.status,
    providerMessageId: msg.providerMessageId,
    timestamp: (msg.timestamp as Timestamp).toDate(),
  })) as SMSMessage[]

  // Return last N messages
  return messages.slice(-limitCount)
}

export async function getAllSMSChats(
  companyId: string
): Promise<Array<{
  customerPhone: string
  lastMessage: SMSMessage | null
  lastMessageAt: Date
  messageCount: number
}>> {
  if (!db) throw new Error('Firestore not initialized')

  const chatsRef = collection(db, 'companies', companyId, 'smsChats')
  const chatsSnap = await getDocs(chatsRef)

  const chats: Array<{
    customerPhone: string
    lastMessage: SMSMessage | null
    lastMessageAt: Date
    messageCount: number
  }> = []

  chatsSnap.forEach((doc) => {
    const data = doc.data()
    const messages = data.messages || []
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null

    chats.push({
      customerPhone: data.customerPhone || doc.id,
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            direction: lastMsg.direction,
            from: lastMsg.from,
            to: lastMsg.to,
            body: lastMsg.body,
            status: lastMsg.status,
            providerMessageId: lastMsg.providerMessageId,
            timestamp: (lastMsg.timestamp as Timestamp).toDate(),
          }
        : null,
      lastMessageAt: data.lastMessageAt
        ? (data.lastMessageAt as Timestamp).toDate()
        : new Date(),
      messageCount: messages.length,
    })
  })

  // Sort by last message time, most recent first
  chats.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

  return chats
}

export async function updateSMSMessageStatus(
  companyId: string,
  customerPhone: string,
  messageId: string,
  status: SMSMessage['status']
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const chatRef = doc(db, 'companies', companyId, 'smsChats', customerPhone)
  const chatSnap = await getDoc(chatRef)

  if (!chatSnap.exists()) return

  const data = chatSnap.data()
  const messages = (data.messages || []).map((msg: SMSMessageDoc & { id: string }) => {
    if (msg.id === messageId) {
      return { ...msg, status }
    }
    return msg
  })

  await updateDoc(chatRef, { messages })
}

// ============================================
// Dashboard Statistics
// ============================================

export interface DashboardStats {
  totalConversations: number
  conversationsToday: number
  smsCount: number
  widgetCount: number
  emailCount: number
  totalMessages: number
  recentConversations: Array<{
    id: string
    name: string
    phone?: string
    email?: string
    channel: 'sms' | 'widget' | 'email'
    lastMessage: string
    lastMessageAt: Date
  }>
}

export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  if (!db) throw new Error('Firestore not initialized')

  const stats: DashboardStats = {
    totalConversations: 0,
    conversationsToday: 0,
    smsCount: 0,
    widgetCount: 0,
    emailCount: 0,
    totalMessages: 0,
    recentConversations: [],
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get SMS chats
  const smsChatsRef = collection(db, 'companies', companyId, 'smsChats')
  const smsChatsSnap = await getDocs(smsChatsRef)

  smsChatsSnap.forEach((doc) => {
    const data = doc.data()
    const messages = data.messages || []
    const messageCount = messages.length

    stats.smsCount++
    stats.totalConversations++
    stats.totalMessages += messageCount

    const lastMessageAt = data.lastMessageAt
      ? (data.lastMessageAt as Timestamp).toDate()
      : new Date()

    if (lastMessageAt >= today) {
      stats.conversationsToday++
    }

    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null

    stats.recentConversations.push({
      id: `sms-${doc.id}`,
      name: formatPhoneDisplay(data.customerPhone || doc.id),
      phone: data.customerPhone || doc.id,
      channel: 'sms',
      lastMessage: lastMsg?.body || 'Ingen meldinger',
      lastMessageAt,
    })
  })

  // Get widget chats
  const widgetChatsRef = collection(db, 'companies', companyId, 'customerChats')
  const widgetChatsSnap = await getDocs(widgetChatsRef)

  widgetChatsSnap.forEach((doc) => {
    const data = doc.data()
    const messages = data.messages || []
    const messageCount = messages.length

    stats.widgetCount++
    stats.totalConversations++
    stats.totalMessages += messageCount

    const lastMessageAt = data.updatedAt
      ? (data.updatedAt as Timestamp).toDate()
      : new Date()

    if (lastMessageAt >= today) {
      stats.conversationsToday++
    }

    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null

    stats.recentConversations.push({
      id: `widget-${doc.id}`,
      name: `Besøkende ${doc.id.slice(0, 6)}`,
      channel: 'widget',
      lastMessage: lastMsg?.content || 'Ingen meldinger',
      lastMessageAt,
    })
  })

  // Get email chats
  const emailChatsRef = collection(db, 'companies', companyId, 'emailChats')
  const emailChatsSnap = await getDocs(emailChatsRef)

  emailChatsSnap.forEach((doc) => {
    const data = doc.data()
    const messages = data.messages || []
    const messageCount = messages.length

    stats.emailCount++
    stats.totalConversations++
    stats.totalMessages += messageCount

    const lastMessageAt = data.lastMessageAt
      ? new Date(data.lastMessageAt)
      : new Date()

    if (lastMessageAt >= today) {
      stats.conversationsToday++
    }

    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null

    stats.recentConversations.push({
      id: `email-${doc.id}`,
      name: data.customerEmail || doc.id,
      email: data.customerEmail || doc.id,
      channel: 'email',
      lastMessage: lastMsg?.body?.slice(0, 50) || data.lastSubject || 'Ingen meldinger',
      lastMessageAt,
    })
  })

  // Sort recent conversations by last message time
  stats.recentConversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

  // Keep only the 10 most recent
  stats.recentConversations = stats.recentConversations.slice(0, 10)

  return stats
}

function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith('+47')) {
    const number = phone.slice(3)
    return `+47 ${number.slice(0, 3)} ${number.slice(3, 5)} ${number.slice(5)}`
  }
  return phone
}
