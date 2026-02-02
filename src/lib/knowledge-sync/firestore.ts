/**
 * Firestore operations for Knowledge Sync System
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  WebsiteSyncJob,
  KnowledgeConflict,
  SyncConfiguration,
  ExtendedFAQ,
  FAQSource,
  ConflictStatus,
  SyncJobStatus,
} from './types'

// ============================================
// Sync Configuration
// ============================================

export async function getSyncConfig(companyId: string): Promise<SyncConfiguration | null> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId, 'syncConfig', 'website')
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  return {
    companyId,
    websiteUrl: data.websiteUrl || '',
    enabled: data.enabled ?? false,
    syncIntervalHours: data.syncIntervalHours ?? 1,
    lastSyncAt: data.lastSyncAt?.toDate(),
    lastSyncJobId: data.lastSyncJobId,
    autoApproveWebsiteFaqs: data.autoApproveWebsiteFaqs ?? false,
    notifyOnConflicts: data.notifyOnConflicts ?? true,
    notifyOnNewFaqs: data.notifyOnNewFaqs ?? true,
    additionalUrls: data.additionalUrls || [],
    excludedPaths: data.excludedPaths || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  }
}

export async function saveSyncConfig(
  companyId: string,
  config: Partial<SyncConfiguration>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const docRef = doc(db, 'companies', companyId, 'syncConfig', 'website')

  await setDoc(docRef, {
    ...config,
    companyId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// ============================================
// Sync Jobs
// ============================================

export async function createSyncJob(
  companyId: string,
  websiteUrl: string
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const jobId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const jobRef = doc(db, 'companies', companyId, 'syncJobs', jobId)

  const job: Omit<WebsiteSyncJob, 'id'> = {
    companyId,
    websiteUrl,
    status: 'pending',
    newFaqsFound: 0,
    conflictsFound: 0,
    faqsUpdated: 0,
    faqsMarkedOutdated: 0,
    startedAt: new Date(),
  }

  await setDoc(jobRef, {
    ...job,
    startedAt: serverTimestamp(),
  })

  return jobId
}

export async function updateSyncJob(
  companyId: string,
  jobId: string,
  updates: Partial<WebsiteSyncJob>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const jobRef = doc(db, 'companies', companyId, 'syncJobs', jobId)

  const updateData: Record<string, unknown> = { ...updates }
  if (updates.completedAt) {
    updateData.completedAt = Timestamp.fromDate(updates.completedAt)
  }

  await updateDoc(jobRef, updateData)
}

export async function getSyncJob(
  companyId: string,
  jobId: string
): Promise<WebsiteSyncJob | null> {
  if (!db) throw new Error('Firestore not initialized')

  const jobRef = doc(db, 'companies', companyId, 'syncJobs', jobId)
  const docSnap = await getDoc(jobRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  return {
    id: docSnap.id,
    companyId: data.companyId,
    websiteUrl: data.websiteUrl,
    status: data.status,
    newFaqsFound: data.newFaqsFound || 0,
    conflictsFound: data.conflictsFound || 0,
    faqsUpdated: data.faqsUpdated || 0,
    faqsMarkedOutdated: data.faqsMarkedOutdated || 0,
    startedAt: data.startedAt?.toDate() || new Date(),
    completedAt: data.completedAt?.toDate(),
    duration: data.duration,
    error: data.error,
    errorDetails: data.errorDetails,
    contentHash: data.contentHash,
    previousContentHash: data.previousContentHash,
  }
}

export async function getRecentSyncJobs(
  companyId: string,
  limitCount: number = 10
): Promise<WebsiteSyncJob[]> {
  if (!db) throw new Error('Firestore not initialized')

  const jobsRef = collection(db, 'companies', companyId, 'syncJobs')
  const q = query(jobsRef, orderBy('startedAt', 'desc'), limit(limitCount))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      companyId: data.companyId,
      websiteUrl: data.websiteUrl,
      status: data.status as SyncJobStatus,
      newFaqsFound: data.newFaqsFound || 0,
      conflictsFound: data.conflictsFound || 0,
      faqsUpdated: data.faqsUpdated || 0,
      faqsMarkedOutdated: data.faqsMarkedOutdated || 0,
      startedAt: data.startedAt?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
      duration: data.duration,
      error: data.error,
      contentHash: data.contentHash,
    }
  })
}

// ============================================
// Knowledge Conflicts
// ============================================

export async function createConflict(
  companyId: string,
  conflict: Omit<KnowledgeConflict, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const conflictRef = doc(db, 'companies', companyId, 'knowledgeConflicts', conflictId)

  await setDoc(conflictRef, {
    ...conflict,
    companyId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return conflictId
}

export async function getConflicts(
  companyId: string,
  statusFilter?: ConflictStatus
): Promise<KnowledgeConflict[]> {
  if (!db) throw new Error('Firestore not initialized')

  const conflictsRef = collection(db, 'companies', companyId, 'knowledgeConflicts')

  let q
  if (statusFilter) {
    q = query(conflictsRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
  } else {
    q = query(conflictsRef, orderBy('createdAt', 'desc'))
  }

  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      companyId: data.companyId,
      faqId: data.faqId,
      currentQuestion: data.currentQuestion,
      currentAnswer: data.currentAnswer,
      currentSource: data.currentSource as FAQSource,
      websiteQuestion: data.websiteQuestion,
      websiteAnswer: data.websiteAnswer,
      websiteUrl: data.websiteUrl,
      similarityScore: data.similarityScore,
      status: data.status as ConflictStatus,
      resolvedBy: data.resolvedBy,
      resolvedAt: data.resolvedAt?.toDate(),
      resolutionNote: data.resolutionNote,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    }
  })
}

export async function getPendingConflictsCount(companyId: string): Promise<number> {
  if (!db) throw new Error('Firestore not initialized')

  const conflictsRef = collection(db, 'companies', companyId, 'knowledgeConflicts')
  const q = query(conflictsRef, where('status', '==', 'pending'))
  const snapshot = await getDocs(q)

  return snapshot.size
}

export async function resolveConflict(
  companyId: string,
  conflictId: string,
  resolution: {
    status: ConflictStatus
    resolvedBy: string
    resolutionNote?: string
  }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const conflictRef = doc(db, 'companies', companyId, 'knowledgeConflicts', conflictId)

  await updateDoc(conflictRef, {
    status: resolution.status,
    resolvedBy: resolution.resolvedBy,
    resolvedAt: serverTimestamp(),
    resolutionNote: resolution.resolutionNote || '',
    updatedAt: serverTimestamp(),
  })
}

export async function getConflict(
  companyId: string,
  conflictId: string
): Promise<KnowledgeConflict | null> {
  if (!db) throw new Error('Firestore not initialized')

  const conflictRef = doc(db, 'companies', companyId, 'knowledgeConflicts', conflictId)
  const docSnap = await getDoc(conflictRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  return {
    id: docSnap.id,
    companyId: data.companyId,
    faqId: data.faqId,
    currentQuestion: data.currentQuestion,
    currentAnswer: data.currentAnswer,
    currentSource: data.currentSource as FAQSource,
    websiteQuestion: data.websiteQuestion,
    websiteAnswer: data.websiteAnswer,
    websiteUrl: data.websiteUrl,
    similarityScore: data.similarityScore,
    status: data.status as ConflictStatus,
    resolvedBy: data.resolvedBy,
    resolvedAt: data.resolvedAt?.toDate(),
    resolutionNote: data.resolutionNote,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  }
}

// ============================================
// Extended FAQ Operations
// ============================================

export async function updateFAQSyncFields(
  companyId: string,
  faqId: string,
  updates: {
    source?: FAQSource
    websiteLastSeen?: Date
    possiblyOutdated?: boolean
    autoGenerated?: boolean
    websiteUrl?: string
  }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const companyRef = doc(db, 'companies', companyId)
  const companySnap = await getDoc(companyRef)

  if (!companySnap.exists()) return

  const data = companySnap.data()
  // FAQs are stored in businessProfile.faqs
  const faqs = data.businessProfile?.faqs || []

  const updatedFaqs = faqs.map((faq: ExtendedFAQ) => {
    if (faq.id === faqId) {
      return {
        ...faq,
        ...updates,
        websiteLastSeen: updates.websiteLastSeen ? Timestamp.fromDate(updates.websiteLastSeen) : faq.websiteLastSeen,
        updatedAt: new Date(),
      }
    }
    return faq
  })

  await updateDoc(companyRef, { 'businessProfile.faqs': updatedFaqs })
}

export async function createFAQFromWebsite(
  companyId: string,
  faq: {
    question: string
    answer: string
    websiteUrl: string
    autoApprove?: boolean
  }
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const faqId = `faq-web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const companyRef = doc(db, 'companies', companyId)
  const companySnap = await getDoc(companyRef)

  if (!companySnap.exists()) throw new Error('Company not found')

  const data = companySnap.data()
  // FAQs are stored in businessProfile.faqs, not at root level
  const faqs = data.businessProfile?.faqs || []

  const newFaq: ExtendedFAQ = {
    id: faqId,
    question: faq.question,
    answer: faq.answer,
    source: 'website_auto',
    confirmed: faq.autoApprove ?? false,
    websiteLastSeen: new Date(),
    possiblyOutdated: false,
    autoGenerated: true,
    websiteUrl: faq.websiteUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await updateDoc(companyRef, {
    'businessProfile.faqs': [...faqs, newFaq],
  })

  return faqId
}

export async function getFAQsWithSyncInfo(companyId: string): Promise<ExtendedFAQ[]> {
  if (!db) throw new Error('Firestore not initialized')

  const companyRef = doc(db, 'companies', companyId)
  const companySnap = await getDoc(companyRef)

  if (!companySnap.exists()) return []

  const data = companySnap.data()
  // FAQs are stored in businessProfile.faqs
  const faqs = data.businessProfile?.faqs || []

  return faqs.map((faq: Record<string, unknown>) => ({
    id: faq.id as string,
    question: faq.question as string,
    answer: faq.answer as string,
    source: (faq.source as FAQSource) || 'manual',
    confirmed: faq.confirmed as boolean ?? true,
    websiteLastSeen: faq.websiteLastSeen instanceof Timestamp
      ? faq.websiteLastSeen.toDate()
      : faq.websiteLastSeen as Date | undefined,
    possiblyOutdated: faq.possiblyOutdated as boolean ?? false,
    autoGenerated: faq.autoGenerated as boolean ?? false,
    websiteUrl: faq.websiteUrl as string | undefined,
    createdAt: faq.createdAt instanceof Timestamp
      ? faq.createdAt.toDate()
      : new Date(),
    updatedAt: faq.updatedAt instanceof Timestamp
      ? faq.updatedAt.toDate()
      : new Date(),
  }))
}

export async function markFAQAsOutdated(
  companyId: string,
  faqId: string,
  isOutdated: boolean
): Promise<void> {
  await updateFAQSyncFields(companyId, faqId, { possiblyOutdated: isOutdated })
}

export async function confirmFAQDeletion(
  companyId: string,
  faqId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const companyRef = doc(db, 'companies', companyId)
  const companySnap = await getDoc(companyRef)

  if (!companySnap.exists()) return

  const data = companySnap.data()
  // FAQs are stored in businessProfile.faqs
  const faqs = data.businessProfile?.faqs || []

  const updatedFaqs = faqs.filter((faq: ExtendedFAQ) => faq.id !== faqId)

  await updateDoc(companyRef, { 'businessProfile.faqs': updatedFaqs })
}
