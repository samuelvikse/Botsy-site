import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  PushSubscription,
  PushSubscriptionDoc,
  Escalation,
  EscalationDoc,
} from '@/types'

// ============================================
// Push Subscription Functions
// ============================================

export async function savePushSubscription(
  userId: string,
  companyId: string,
  subscription: PushSubscriptionJSON
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const subscriptionId = `${userId}-${Date.now()}`
  const subscriptionRef = doc(db, 'pushSubscriptions', subscriptionId)

  await setDoc(subscriptionRef, {
    userId,
    companyId,
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
    },
    createdAt: serverTimestamp(),
    isActive: true,
  })

  return subscriptionId
}

export async function getPushSubscriptionByUser(
  userId: string
): Promise<PushSubscription | null> {
  if (!db) throw new Error('Firestore not initialized')

  const subscriptionsRef = collection(db, 'pushSubscriptions')
  const q = query(
    subscriptionsRef,
    where('userId', '==', userId),
    where('isActive', '==', true)
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data() as PushSubscriptionDoc

  return {
    id: doc.id,
    userId: data.userId,
    companyId: data.companyId,
    endpoint: data.endpoint,
    keys: data.keys,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    isActive: data.isActive,
  }
}

export async function getActiveSubscriptionsByCompany(
  companyId: string
): Promise<PushSubscription[]> {
  if (!db) throw new Error('Firestore not initialized')

  const subscriptionsRef = collection(db, 'pushSubscriptions')
  const q = query(
    subscriptionsRef,
    where('companyId', '==', companyId),
    where('isActive', '==', true)
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data() as PushSubscriptionDoc
    return {
      id: doc.id,
      userId: data.userId,
      companyId: data.companyId,
      endpoint: data.endpoint,
      keys: data.keys,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      isActive: data.isActive,
    }
  })
}

export async function deactivatePushSubscription(userId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const subscriptionsRef = collection(db, 'pushSubscriptions')
  const q = query(
    subscriptionsRef,
    where('userId', '==', userId),
    where('isActive', '==', true)
  )
  const snapshot = await getDocs(q)

  for (const docSnap of snapshot.docs) {
    await updateDoc(docSnap.ref, { isActive: false })
  }
}

// ============================================
// Escalation Functions
// ============================================

export async function createEscalation(
  escalation: Omit<Escalation, 'id' | 'createdAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized')

  const escalationId = `esc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const escalationRef = doc(db, 'escalations', escalationId)

  await setDoc(escalationRef, {
    companyId: escalation.companyId,
    conversationId: escalation.conversationId,
    channel: escalation.channel,
    customerIdentifier: escalation.customerIdentifier,
    customerMessage: escalation.customerMessage,
    status: 'pending',
    createdAt: serverTimestamp(),
  })

  return escalationId
}

export async function getPendingEscalations(
  companyId: string
): Promise<Escalation[]> {
  if (!db) throw new Error('Firestore not initialized')

  const escalationsRef = collection(db, 'escalations')
  const q = query(
    escalationsRef,
    where('companyId', '==', companyId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data() as EscalationDoc
    return {
      id: doc.id,
      companyId: data.companyId,
      conversationId: data.conversationId,
      channel: data.channel,
      customerIdentifier: data.customerIdentifier,
      customerMessage: data.customerMessage,
      status: data.status,
      claimedBy: data.claimedBy,
      claimedAt: data.claimedAt ? (data.claimedAt as Timestamp).toDate() : undefined,
      resolvedAt: data.resolvedAt ? (data.resolvedAt as Timestamp).toDate() : undefined,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    }
  })
}

export async function claimEscalation(
  escalationId: string,
  userId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const escalationRef = doc(db, 'escalations', escalationId)
  await updateDoc(escalationRef, {
    status: 'claimed',
    claimedBy: userId,
    claimedAt: serverTimestamp(),
  })
}

export async function getEscalation(escalationId: string): Promise<Escalation | null> {
  if (!db) throw new Error('Firestore not initialized')

  const escalationRef = doc(db, 'escalations', escalationId)
  const docSnap = await getDoc(escalationRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data() as EscalationDoc
  return {
    id: docSnap.id,
    companyId: data.companyId,
    conversationId: data.conversationId,
    channel: data.channel,
    customerIdentifier: data.customerIdentifier,
    customerMessage: data.customerMessage,
    status: data.status,
    claimedBy: data.claimedBy,
    claimedAt: data.claimedAt ? (data.claimedAt as Timestamp).toDate() : undefined,
    resolvedAt: data.resolvedAt ? (data.resolvedAt as Timestamp).toDate() : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
  }
}

export async function resolveEscalation(escalationId: string): Promise<Escalation | null> {
  if (!db) throw new Error('Firestore not initialized')

  const escalationRef = doc(db, 'escalations', escalationId)

  // Get the escalation first to return it
  const docSnap = await getDoc(escalationRef)
  if (!docSnap.exists()) return null

  const data = docSnap.data() as EscalationDoc

  await updateDoc(escalationRef, {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
  })

  return {
    id: docSnap.id,
    companyId: data.companyId,
    conversationId: data.conversationId,
    channel: data.channel,
    customerIdentifier: data.customerIdentifier,
    customerMessage: data.customerMessage,
    status: 'resolved',
    claimedBy: data.claimedBy,
    claimedAt: data.claimedAt ? (data.claimedAt as Timestamp).toDate() : undefined,
    resolvedAt: new Date(),
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
  }
}

export async function deleteEscalation(escalationId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')

  const escalationRef = doc(db, 'escalations', escalationId)
  await deleteDoc(escalationRef)
}

/**
 * Resolve all pending escalations for a specific conversation
 * Used when an employee opens/views an escalated conversation
 */
export async function resolveEscalationsByConversation(
  companyId: string,
  conversationId: string
): Promise<number> {
  if (!db) throw new Error('Firestore not initialized')

  const escalationsRef = collection(db, 'escalations')
  const q = query(
    escalationsRef,
    where('companyId', '==', companyId),
    where('conversationId', '==', conversationId),
    where('status', '==', 'pending')
  )

  const snapshot = await getDocs(q)
  let resolvedCount = 0

  for (const docSnap of snapshot.docs) {
    await updateDoc(doc(db, 'escalations', docSnap.id), {
      status: 'resolved',
      resolvedAt: serverTimestamp(),
    })
    resolvedCount++
  }

  return resolvedCount
}
