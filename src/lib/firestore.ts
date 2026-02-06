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
  const faqToDelete = faqs.find((f) => f.id === faqId)
  const filtered = faqs.filter((f) => f.id !== faqId)
  await saveFAQs(companyId, filtered)

  // Add the question to dismissed list so it won't be re-synced from documents
  if (faqToDelete && faqToDelete.source === 'extracted') {
    await addDismissedFAQ(companyId, faqToDelete.question)
  }
}

// Track dismissed FAQs so they don't get re-synced from documents
export async function getDismissedFAQs(companyId: string): Promise<string[]> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return docSnap.data().dismissedFAQs || []
  }
  return []
}

export async function addDismissedFAQ(companyId: string, question: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const dismissed = await getDismissedFAQs(companyId)
  const normalizedQuestion = question.toLowerCase().trim()

  // Don't add duplicates
  if (dismissed.some(q => q.toLowerCase().trim() === normalizedQuestion)) {
    return
  }

  const docRef = doc(db, 'companies', companyId)
  await updateDoc(docRef, {
    dismissedFAQs: [...dismissed, question],
    updatedAt: serverTimestamp(),
  })
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
    tone?: 'formal' | 'friendly' | 'casual'
    greeting?: string
    useEmojis?: boolean
    humorLevel?: 'none' | 'subtle' | 'moderate' | 'playful'
    responseLength?: 'short' | 'balanced' | 'detailed'
    language?: string
    languageName?: string
  }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)

  // Extract fields that should be saved at businessProfile level (not inside toneConfig)
  const { language, languageName, tone, ...restToneConfig } = toneConfig

  const updateData: Record<string, unknown> = {
    'businessProfile.toneConfig': restToneConfig,
    updatedAt: serverTimestamp(),
  }

  // Save tone at businessProfile level (not inside toneConfig)
  if (tone) {
    updateData['businessProfile.tone'] = tone
  }

  // Save language at businessProfile level (not inside toneConfig)
  if (language) {
    updateData['businessProfile.language'] = language
  }
  if (languageName) {
    updateData['businessProfile.languageName'] = languageName
  }

  await updateDoc(docRef, updateData)
}

// ============================================
// Knowledge Document Functions
// ============================================

import type { KnowledgeDocument, KnowledgeDocumentDoc } from '@/types'

export async function saveKnowledgeDocument(
  companyId: string,
  document: Omit<KnowledgeDocument, 'id'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const docsRef = collection(db, 'companies', companyId, 'knowledgeDocs')

  // Build document data, excluding undefined values (Firestore doesn't accept undefined)
  const docData: Record<string, unknown> = {
    fileName: document.fileName,
    fileUrl: document.fileUrl,
    fileType: document.fileType,
    fileSize: document.fileSize,
    extractedContent: document.extractedContent,
    analyzedData: document.analyzedData,
    status: document.status,
    uploadedAt: Timestamp.fromDate(
      document.uploadedAt instanceof Date
        ? document.uploadedAt
        : new Date(document.uploadedAt)
    ),
    processedAt: document.processedAt
      ? Timestamp.fromDate(
          document.processedAt instanceof Date
            ? document.processedAt
            : new Date(document.processedAt)
        )
      : null,
    uploadedBy: document.uploadedBy,
  }

  // Only add errorMessage if it has a value
  if (document.errorMessage) {
    docData.errorMessage = document.errorMessage
  }

  const docRef = await addDoc(docsRef, docData)
  return docRef.id
}

export async function updateKnowledgeDocument(
  companyId: string,
  documentId: string,
  updates: Partial<KnowledgeDocument>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId, 'knowledgeDocs', documentId)

  const updateData: Record<string, unknown> = {}

  if (updates.extractedContent !== undefined) updateData.extractedContent = updates.extractedContent
  if (updates.analyzedData !== undefined) updateData.analyzedData = updates.analyzedData
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage || null
  if (updates.processedAt !== undefined) {
    updateData.processedAt = updates.processedAt
      ? Timestamp.fromDate(new Date(updates.processedAt))
      : null
  }

  await updateDoc(docRef, updateData)
}

export async function getKnowledgeDocuments(companyId: string): Promise<KnowledgeDocument[]> {
  if (!db) throw new Error('Firestore not initialized')

  const docsRef = collection(db, 'companies', companyId, 'knowledgeDocs')
  const q = query(docsRef, orderBy('uploadedAt', 'desc'))
  const snapshot = await getDocs(q)

  const documents: KnowledgeDocument[] = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as KnowledgeDocumentDoc
    documents.push({
      id: docSnap.id,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: data.fileSize,
      extractedContent: data.extractedContent,
      analyzedData: data.analyzedData,
      status: data.status,
      errorMessage: data.errorMessage,
      uploadedAt: (data.uploadedAt as Timestamp).toDate(),
      processedAt: data.processedAt
        ? (data.processedAt as Timestamp).toDate()
        : undefined,
      uploadedBy: data.uploadedBy,
    })
  })

  return documents
}

export async function deleteKnowledgeDocument(
  companyId: string,
  documentId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId, 'knowledgeDocs', documentId)
  await deleteDoc(docRef)
}

export async function getReadyKnowledgeDocuments(companyId: string): Promise<KnowledgeDocument[]> {
  if (!db) throw new Error('Firestore not initialized')

  const docsRef = collection(db, 'companies', companyId, 'knowledgeDocs')
  const q = query(docsRef, where('status', '==', 'ready'))
  const snapshot = await getDocs(q)

  const documents: KnowledgeDocument[] = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as KnowledgeDocumentDoc
    documents.push({
      id: docSnap.id,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: data.fileSize,
      extractedContent: data.extractedContent,
      analyzedData: data.analyzedData,
      status: data.status,
      uploadedAt: (data.uploadedAt as Timestamp).toDate(),
      processedAt: data.processedAt
        ? (data.processedAt as Timestamp).toDate()
        : undefined,
      uploadedBy: data.uploadedBy,
    })
  })

  return documents
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
      widgetSize: 'medium',
    },
  })
}

export async function getCompany(companyId: string): Promise<{
  ownerId: string
  businessName: string
  businessProfile: BusinessProfile | null
  widgetSettings: {
    primaryColor: string
    secondaryColor?: string
    position: string
    greeting: string
    isEnabled: boolean
    logoUrl?: string | null
    widgetSize?: 'small' | 'medium' | 'large'
    animationStyle?: 'scale' | 'slide' | 'fade' | 'bounce' | 'flip'
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
      secondaryColor: data.widgetSettings?.secondaryColor || '#1A1A2E',
      position: data.widgetSettings?.position || 'bottom-right',
      greeting: data.widgetSettings?.greeting || 'Hei! Hvordan kan jeg hjelpe deg?',
      isEnabled: data.widgetSettings?.isEnabled ?? true,
      logoUrl: data.widgetSettings?.logoUrl || null,
      widgetSize: data.widgetSettings?.widgetSize || 'medium',
      animationStyle: data.widgetSettings?.animationStyle || 'scale',
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
    widgetSize: 'small' | 'medium' | 'large'
    animationStyle: 'scale' | 'slide' | 'fade' | 'bounce' | 'flip'
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
    isManual?: boolean
  }>
  lastMessageAt: Date
  messageCount: number
  createdAt: Date
  isManualMode?: boolean
}

export async function getAllWidgetChats(companyId: string): Promise<WidgetChatSummary[]> {
  if (!db) throw new Error('Firestore not initialized')

  const chatsRef = collection(db, 'companies', companyId, 'customerChats')
  const q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(50))

  const snapshot = await getDocs(q)
  const chats: WidgetChatSummary[] = []

  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    const messages = (data.messages || []).map((msg: { role: 'user' | 'assistant'; content: string; timestamp?: { toDate?: () => Date }; isManual?: boolean }) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp?.toDate?.() || new Date(),
      isManual: msg.isManual || false,
    }))

    if (messages.length > 0) {
      chats.push({
        sessionId: docSnap.id,
        messages,
        lastMessageAt: data.updatedAt?.toDate?.() || new Date(),
        messageCount: messages.length,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        isManualMode: data.isManualMode || false,
      })
    }
  })

  return chats
}

export async function getWidgetChatHistory(
  companyId: string,
  sessionId: string
): Promise<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date; isManual?: boolean }>> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) return []

  const data = sessionSnap.data()
  return (data.messages || []).map(
    (msg: { role: 'user' | 'assistant'; content: string; timestamp?: { toDate?: () => Date }; isManual?: boolean }) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp?.toDate?.() || new Date(),
      isManual: msg.isManual || false,
    })
  )
}

// ============================================
// Manual Takeover Functions
// ============================================

export async function setChatManualMode(
  companyId: string,
  sessionId: string,
  isManual: boolean
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
  await updateDoc(sessionRef, {
    isManualMode: isManual,
    manualModeUpdatedAt: serverTimestamp(),
  })
}

export async function getChatManualMode(
  companyId: string,
  sessionId: string
): Promise<boolean> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) return false

  return sessionSnap.data()?.isManualMode || false
}

export async function addManualMessage(
  companyId: string,
  sessionId: string,
  content: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) {
    throw new Error('Chat session not found')
  }

  const existingData = sessionSnap.data()
  await updateDoc(sessionRef, {
    messages: [
      ...(existingData?.messages || []),
      {
        role: 'assistant',
        content,
        timestamp: new Date(),
        isManual: true,
      },
    ],
    updatedAt: serverTimestamp(),
  })
}

/**
 * Clear the manual mode flag on a widget chat session
 * Called when an employee handles the conversation
 */
export async function clearWidgetChatManualMode(
  companyId: string,
  sessionId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (sessionSnap.exists()) {
    await updateDoc(sessionRef, {
      isManualMode: false,
      updatedAt: serverTimestamp(),
    })
  }
}

// ============================================
// General Settings Functions
// ============================================

export interface GeneralSettings {
  botName: string
  tone: string
  greeting: string
  useEmojis: boolean
  emailNotifications: boolean
  dailySummary: boolean
  allowEscalation?: boolean
  autoEmailReply?: boolean
}

export async function saveGeneralSettings(
  companyId: string,
  settings: Partial<GeneralSettings>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)

  const updateData: Record<string, unknown> = {}
  Object.entries(settings).forEach(([key, value]) => {
    updateData[`generalSettings.${key}`] = value
  })
  updateData['updatedAt'] = serverTimestamp()

  await updateDoc(docRef, updateData)
}

export async function getGeneralSettings(
  companyId: string
): Promise<GeneralSettings> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId)
  const docSnap = await getDoc(docRef)

  const defaults: GeneralSettings = {
    botName: 'Botsy',
    tone: 'Vennlig og uformell',
    greeting: 'Hei! Jeg er Botsy, din digitale assistent. Hvordan kan jeg hjelpe deg i dag?',
    useEmojis: true,
    emailNotifications: true,
    dailySummary: false,
    allowEscalation: true,
    autoEmailReply: true,
  }

  if (!docSnap.exists()) return defaults

  const data = docSnap.data()
  const stored = data.generalSettings || {}

  return {
    botName: stored.botName ?? defaults.botName,
    tone: stored.tone ?? defaults.tone,
    greeting: stored.greeting ?? defaults.greeting,
    useEmojis: stored.useEmojis ?? defaults.useEmojis,
    emailNotifications: stored.emailNotifications ?? defaults.emailNotifications,
    dailySummary: stored.dailySummary ?? defaults.dailySummary,
    allowEscalation: stored.allowEscalation ?? defaults.allowEscalation,
    autoEmailReply: stored.autoEmailReply ?? defaults.autoEmailReply,
  }
}

// ============================================
// User Notification Preferences
// ============================================

export interface UserNotificationPreferences {
  emailNotifications: boolean
  dailySummary: boolean
  email?: string // The email to send notifications to
}

export async function saveUserNotificationPreferences(
  userId: string,
  preferences: Partial<UserNotificationPreferences>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'users', userId)

  const updateData: Record<string, unknown> = {}
  Object.entries(preferences).forEach(([key, value]) => {
    updateData[`notificationPreferences.${key}`] = value
  })
  updateData['updatedAt'] = serverTimestamp()

  await updateDoc(docRef, updateData)
}

export async function getUserNotificationPreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  if (!db) throw new Error('Firestore not initialized')

  const defaults: UserNotificationPreferences = {
    emailNotifications: true,
    dailySummary: false,
  }

  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return defaults

  const data = docSnap.data()
  const stored = data.notificationPreferences || {}
  const userEmail = data.email

  return {
    emailNotifications: stored.emailNotifications ?? defaults.emailNotifications,
    dailySummary: stored.dailySummary ?? defaults.dailySummary,
    email: stored.email || userEmail,
  }
}

/**
 * Get all users who have daily summary enabled for a company
 */
export async function getUsersWithDailySummaryEnabled(
  companyId: string
): Promise<Array<{ userId: string; email: string; displayName: string }>> {
  if (!db) throw new Error('Firestore not initialized')

  const usersWithDailySummary: Array<{ userId: string; email: string; displayName: string }> = []
  const processedUserIds = new Set<string>()

  // Helper function to check user and add if daily summary enabled
  const checkAndAddUser = async (userId: string) => {
    if (!db || processedUserIds.has(userId)) return
    processedUserIds.add(userId)

    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      const userData = userDoc.data()
      const prefs = userData.notificationPreferences || {}

      // Check if daily summary is enabled
      if (prefs.dailySummary === true) {
        usersWithDailySummary.push({
          userId,
          email: prefs.email || userData.email,
          displayName: userData.displayName || userData.email,
        })
      }
    }
  }

  // First, check the company owner (companyId is often the owner's userId)
  await checkAndAddUser(companyId)

  // Also check the company document for owner field
  const companyDocRef = doc(db, 'companies', companyId)
  const companyDoc = await getDoc(companyDocRef)
  if (companyDoc.exists()) {
    const companyData = companyDoc.data()
    if (companyData.ownerId && companyData.ownerId !== companyId) {
      await checkAndAddUser(companyData.ownerId)
    }
  }

  // Get all memberships for this company
  const membershipsRef = collection(db, 'memberships')
  const q = query(membershipsRef, where('companyId', '==', companyId))
  const membershipsSnapshot = await getDocs(q)

  for (const membershipDoc of membershipsSnapshot.docs) {
    const membership = membershipDoc.data()
    await checkAndAddUser(membership.userId)
  }

  return usersWithDailySummary
}
