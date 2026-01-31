import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  BusinessProfile,
  FAQ,
  Instruction,
  OwnerChatMessage,
  InstructionDoc,
  OwnerChatDoc,
} from '@/types'

// ============================================
// Business Profile Functions
// ============================================

export async function saveBusinessProfile(
  companyId: string,
  profile: BusinessProfile
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)

  await setDoc(
    docRef,
    {
      businessProfile: {
        ...profile,
        lastAnalyzed: Timestamp.fromDate(
          profile.lastAnalyzed instanceof Date
            ? profile.lastAnalyzed
            : new Date(profile.lastAnalyzed)
        ),
        faqs: profile.faqs.map((faq) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          source: faq.source,
          confirmed: faq.confirmed,
        })),
        toneConfig: profile.toneConfig || null,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function getBusinessProfile(
  companyId: string
): Promise<BusinessProfile | null> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  if (!data.businessProfile) return null

  const profile = data.businessProfile
  return {
    ...profile,
    lastAnalyzed:
      profile.lastAnalyzed instanceof Timestamp
        ? profile.lastAnalyzed.toDate()
        : new Date(profile.lastAnalyzed),
    faqs: profile.faqs || [],
    toneConfig: profile.toneConfig || undefined,
  }
}

// ============================================
// FAQ Functions
// ============================================

export async function saveFAQs(companyId: string, faqs: FAQ[]): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)

  await updateDoc(docRef, {
    'businessProfile.faqs': faqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      source: faq.source,
      confirmed: faq.confirmed,
    })),
    updatedAt: serverTimestamp(),
  })
}

export async function getFAQs(companyId: string): Promise<FAQ[]> {
  const profile = await getBusinessProfile(companyId)
  return profile?.faqs || []
}

export async function addFAQ(companyId: string, faq: FAQ): Promise<void> {
  const faqs = await getFAQs(companyId)
  faqs.push(faq)
  await saveFAQs(companyId, faqs)
}

export async function updateFAQ(
  companyId: string,
  faqId: string,
  updates: Partial<FAQ>
): Promise<void> {
  const faqs = await getFAQs(companyId)
  const index = faqs.findIndex((f) => f.id === faqId)
  if (index !== -1) {
    faqs[index] = { ...faqs[index], ...updates }
    await saveFAQs(companyId, faqs)
  }
}

export async function deleteFAQ(
  companyId: string,
  faqId: string
): Promise<void> {
  const faqs = await getFAQs(companyId)
  const filtered = faqs.filter((f) => f.id !== faqId)
  await saveFAQs(companyId, filtered)
}

// ============================================
// Tone Configuration Functions
// ============================================

export async function saveToneConfig(
  companyId: string,
  toneConfig: {
    customInstructions?: string
    personality?: string
    avoidPhrases?: string[]
    preferredPhrases?: string[]
    exampleResponses?: string[]
  }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)

  await updateDoc(docRef, {
    'businessProfile.toneConfig': toneConfig,
    updatedAt: serverTimestamp(),
  })
}

// ============================================
// Instruction Functions
// ============================================

export async function saveInstruction(
  companyId: string,
  instruction: Omit<Instruction, 'id'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const instructionsRef = collection(db, 'companies', companyId, 'instructions')

  const docData: InstructionDoc = {
    content: instruction.content,
    category: instruction.category,
    priority: instruction.priority,
    isActive: instruction.isActive,
    startsAt: instruction.startsAt
      ? Timestamp.fromDate(new Date(instruction.startsAt))
      : null,
    expiresAt: instruction.expiresAt
      ? Timestamp.fromDate(new Date(instruction.expiresAt))
      : null,
    createdAt: Timestamp.fromDate(new Date(instruction.createdAt)),
    createdBy: instruction.createdBy,
  }

  const docRef = await addDoc(instructionsRef, docData)
  return docRef.id
}

export async function getInstructions(
  companyId: string,
  activeOnly = true
): Promise<Instruction[]> {
  if (!db) throw new Error('Firestore not initialized')

  const instructionsRef = collection(db, 'companies', companyId, 'instructions')

  let q
  if (activeOnly) {
    q = query(
      instructionsRef,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )
  } else {
    q = query(instructionsRef, orderBy('createdAt', 'desc'))
  }

  const snapshot = await getDocs(q)

  const now = new Date()
  const instructions: Instruction[] = []

  snapshot.forEach((doc) => {
    const data = doc.data() as InstructionDoc

    // Check if instruction has expired
    const expiresAt = data.expiresAt
      ? (data.expiresAt as Timestamp).toDate()
      : null
    const startsAt = data.startsAt
      ? (data.startsAt as Timestamp).toDate()
      : null

    // Skip if expired
    if (expiresAt && expiresAt < now) return

    // Skip if not started yet
    if (startsAt && startsAt > now) return

    instructions.push({
      id: doc.id,
      content: data.content,
      category: data.category,
      priority: data.priority,
      isActive: data.isActive,
      startsAt: startsAt,
      expiresAt: expiresAt,
      createdAt: (data.createdAt as Timestamp).toDate(),
      createdBy: data.createdBy,
    })
  })

  return instructions
}

export async function updateInstruction(
  companyId: string,
  instructionId: string,
  updates: Partial<Instruction>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId, 'instructions', instructionId)

  const updateData: Record<string, unknown> = {}

  if (updates.content !== undefined) updateData.content = updates.content
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive
  if (updates.startsAt !== undefined) {
    updateData.startsAt = updates.startsAt
      ? Timestamp.fromDate(new Date(updates.startsAt))
      : null
  }
  if (updates.expiresAt !== undefined) {
    updateData.expiresAt = updates.expiresAt
      ? Timestamp.fromDate(new Date(updates.expiresAt))
      : null
  }

  await updateDoc(docRef, updateData)
}

export async function deleteInstruction(
  companyId: string,
  instructionId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId, 'instructions', instructionId)
  await deleteDoc(docRef)
}

// ============================================
// Owner Chat Functions
// ============================================

export async function saveOwnerChatMessage(
  companyId: string,
  message: Omit<OwnerChatMessage, 'id'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const chatRef = collection(db, 'companies', companyId, 'ownerChat')

  const docData: OwnerChatDoc = {
    role: message.role,
    content: message.content,
    timestamp: Timestamp.fromDate(
      message.timestamp instanceof Date
        ? message.timestamp
        : new Date(message.timestamp)
    ),
    instructionCreated: message.instructionCreated,
  }

  const docRef = await addDoc(chatRef, docData)
  return docRef.id
}

export async function getOwnerChatHistory(
  companyId: string,
  limitCount = 50
): Promise<OwnerChatMessage[]> {
  if (!db) throw new Error('Firestore not initialized')

  const chatRef = collection(db, 'companies', companyId, 'ownerChat')
  const q = query(chatRef, orderBy('timestamp', 'desc'), limit(limitCount))

  const snapshot = await getDocs(q)

  const messages: OwnerChatMessage[] = []

  snapshot.forEach((doc) => {
    const data = doc.data() as OwnerChatDoc
    messages.push({
      id: doc.id,
      role: data.role,
      content: data.content,
      timestamp: (data.timestamp as Timestamp).toDate(),
      instructionCreated: data.instructionCreated,
    })
  })

  // Reverse to get chronological order
  return messages.reverse()
}

// ============================================
// Company Setup Functions
// ============================================

export async function createCompany(
  companyId: string,
  ownerId: string,
  businessName: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)

  await setDoc(docRef, {
    ownerId,
    businessName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    businessProfile: null,
    widgetSettings: {
      primaryColor: '#CCFF00',
      position: 'bottom-right',
      greeting: 'Hei! Hvordan kan jeg hjelpe deg?',
      isEnabled: true,
    },
  })
}

export async function getCompany(companyId: string): Promise<{
  ownerId: string
  businessName: string
  businessProfile: BusinessProfile | null
  widgetSettings: {
    primaryColor: string
    position: string
    greeting: string
    isEnabled: boolean
    logoUrl?: string | null
  }
} | null> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()

  let businessProfile = null
  if (data.businessProfile) {
    businessProfile = {
      ...data.businessProfile,
      lastAnalyzed:
        data.businessProfile.lastAnalyzed instanceof Timestamp
          ? data.businessProfile.lastAnalyzed.toDate()
          : new Date(data.businessProfile.lastAnalyzed),
      faqs: data.businessProfile.faqs || [],
    }
  }

  return {
    ownerId: data.ownerId,
    businessName: data.businessName,
    businessProfile,
    widgetSettings: {
      primaryColor: data.widgetSettings?.primaryColor || '#CCFF00',
      position: data.widgetSettings?.position || 'bottom-right',
      greeting: data.widgetSettings?.greeting || 'Hei! Hvordan kan jeg hjelpe deg?',
      isEnabled: data.widgetSettings?.isEnabled ?? true,
      logoUrl: data.widgetSettings?.logoUrl || null,
    },
  }
}

export async function updateWidgetSettings(
  companyId: string,
  settings: Partial<{
    primaryColor: string
    position: string
    greeting: string
    isEnabled: boolean
    logoUrl: string | null
  }>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)

  const updateData: Record<string, unknown> = {}
  Object.entries(settings).forEach(([key, value]) => {
    updateData[`widgetSettings.${key}`] = value
  })

  await updateDoc(docRef, updateData)
}

// ============================================
// Customer Chat Session Functions
// ============================================

export async function saveCustomerMessage(
  companyId: string,
  sessionId: string,
  message: { role: 'user' | 'assistant'; content: string }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(
    db,
    'companies',
    companyId,
    'customerChats',
    sessionId
  )

  // Get existing messages or create new session
  const sessionSnap = await getDoc(sessionRef)

  if (sessionSnap.exists()) {
    const data = sessionSnap.data()
    await updateDoc(sessionRef, {
      messages: [
        ...data.messages,
        {
          role: message.role,
          content: message.content,
          timestamp: Timestamp.now(),
        },
      ],
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(sessionRef, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [
        {
          role: message.role,
          content: message.content,
          timestamp: Timestamp.now(),
        },
      ],
    })
  }
}

export async function getCustomerChatSession(
  companyId: string,
  sessionId: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(
    db,
    'companies',
    companyId,
    'customerChats',
    sessionId
  )

  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) return []

  const data = sessionSnap.data()
  return (data.messages || []).map(
    (msg: { role: 'user' | 'assistant'; content: string }) => ({
      role: msg.role,
      content: msg.content,
    })
  )
}

// ============================================
// Widget Chat Functions for Conversations View
// ============================================

interface WidgetChatSummary {
  sessionId: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  lastMessageAt: Date
  messageCount: number
  createdAt: Date
}

export async function getAllWidgetChats(companyId: string): Promise<WidgetChatSummary[]> {
  if (!db) throw new Error('Firestore not initialized')

  const chatsRef = collection(db, 'companies', companyId, 'customerChats')
  const q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(50))

  const snapshot = await getDocs(q)
  const chats: WidgetChatSummary[] = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const messages = (data.messages || []).map((msg: { role: 'user' | 'assistant'; content: string; timestamp?: { toDate?: () => Date } }) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp?.toDate?.() || new Date(),
    }))

    if (messages.length > 0) {
      chats.push({
        sessionId: docSnap.id,
        messages,
        lastMessageAt: data.updatedAt?.toDate?.() || new Date(),
        messageCount: messages.length,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      })
    }
  })

  return chats
}

export async function getWidgetChatHistory(
  companyId: string,
  sessionId: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) return []

  const data = sessionSnap.data()
  return (data.messages || []).map(
    (msg: { role: 'user' | 'assistant'; content: string; timestamp?: { toDate?: () => Date } }) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp?.toDate?.() || new Date(),
    })
  )
}
