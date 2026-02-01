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
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Membership,
  MembershipDoc,
  Invitation,
  InvitationDoc,
  OwnershipTransfer,
  OwnershipTransferDoc,
  MembershipPermissions,
  EmployeePermissions,
  AdminPermissions,
  TeamMember,
} from '@/types'
import crypto from 'crypto'

// ============================================
// Membership Functions
// ============================================

/**
 * Get a user's membership for a specific company
 */
export async function getMembership(
  userId: string,
  companyId: string
): Promise<Membership | null> {
  if (!db) throw new Error('Firebase not initialized')

  const membershipsRef = collection(db, 'memberships')
  const q = query(
    membershipsRef,
    where('userId', '==', userId),
    where('companyId', '==', companyId)
  )

  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data() as MembershipDoc

  return {
    id: doc.id,
    ...data,
    joinedAt: (data.joinedAt as Timestamp)?.toDate() || new Date(),
  }
}

/**
 * Get all memberships for a company
 */
export async function getMembershipsByCompany(companyId: string): Promise<Membership[]> {
  if (!db) throw new Error('Firebase not initialized')

  const membershipsRef = collection(db, 'memberships')
  const q = query(membershipsRef, where('companyId', '==', companyId))

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data() as MembershipDoc
    return {
      id: doc.id,
      ...data,
      joinedAt: (data.joinedAt as Timestamp)?.toDate() || new Date(),
    }
  })
}

/**
 * Get all team members with user details for a company
 */
export async function getTeamMembers(companyId: string): Promise<TeamMember[]> {
  if (!db) throw new Error('Firebase not initialized')

  const memberships = await getMembershipsByCompany(companyId)
  const teamMembers: TeamMember[] = []

  for (const membership of memberships) {
    const userDoc = await getDoc(doc(db, 'users', membership.userId))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      teamMembers.push({
        membership,
        user: {
          email: userData.email || '',
          displayName: userData.displayName || '',
          avatarUrl: userData.avatarUrl,
        },
      })
    }
  }

  return teamMembers
}

/**
 * Create a new membership
 */
export async function createMembership(
  membership: Omit<Membership, 'id' | 'joinedAt'>
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized')

  const membershipsRef = collection(db, 'memberships')
  const newDocRef = doc(membershipsRef)

  const membershipDoc: MembershipDoc = {
    userId: membership.userId,
    companyId: membership.companyId,
    role: membership.role,
    permissions: membership.permissions,
    invitedBy: membership.invitedBy,
    joinedAt: serverTimestamp(),
    status: membership.status,
  }

  await setDoc(newDocRef, membershipDoc)
  return newDocRef.id
}

/**
 * Update a membership
 */
export async function updateMembership(
  membershipId: string,
  updates: Partial<{
    role: 'admin' | 'employee'
    permissions: MembershipPermissions
    status: 'active' | 'suspended'
  }>
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized')

  const membershipRef = doc(db, 'memberships', membershipId)
  await updateDoc(membershipRef, updates)
}

/**
 * Delete a membership
 */
export async function deleteMembership(membershipId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized')

  const membershipRef = doc(db, 'memberships', membershipId)
  await deleteDoc(membershipRef)
}

// ============================================
// Invitation Functions
// ============================================

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Get an invitation by token
 */
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  if (!db) throw new Error('Firebase not initialized')

  const invitationsRef = collection(db, 'invitations')
  const q = query(invitationsRef, where('token', '==', token))

  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const invDoc = snapshot.docs[0]
  const data = invDoc.data() as InvitationDoc

  return {
    id: invDoc.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    expiresAt: (data.expiresAt as Timestamp)?.toDate() || new Date(),
  }
}

/**
 * Get all pending invitations for a company
 */
export async function getInvitationsByCompany(companyId: string): Promise<Invitation[]> {
  if (!db) throw new Error('Firebase not initialized')

  const invitationsRef = collection(db, 'invitations')
  const q = query(
    invitationsRef,
    where('companyId', '==', companyId),
    where('status', '==', 'pending')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((invDoc) => {
    const data = invDoc.data() as InvitationDoc
    return {
      id: invDoc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      expiresAt: (data.expiresAt as Timestamp)?.toDate() || new Date(),
    }
  })
}

/**
 * Create a new invitation
 */
export async function createInvitation(
  invitation: Omit<Invitation, 'id' | 'createdAt' | 'expiresAt' | 'status' | 'token'>
): Promise<{ id: string; token: string }> {
  if (!db) throw new Error('Firebase not initialized')

  const token = generateToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitationsRef = collection(db, 'invitations')
  const newDocRef = doc(invitationsRef)

  const invitationDoc: InvitationDoc = {
    companyId: invitation.companyId,
    email: invitation.email.toLowerCase(),
    role: invitation.role,
    permissions: invitation.permissions,
    invitedBy: invitation.invitedBy,
    inviterName: invitation.inviterName,
    companyName: invitation.companyName,
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: 'pending',
    token,
  }

  await setDoc(newDocRef, invitationDoc)
  return { id: newDocRef.id, token }
}

/**
 * Update invitation status
 */
export async function updateInvitationStatus(
  invitationId: string,
  status: 'accepted' | 'expired' | 'cancelled'
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized')

  const invitationRef = doc(db, 'invitations', invitationId)
  await updateDoc(invitationRef, { status })
}

/**
 * Accept an invitation and create membership
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!db) throw new Error('Firebase not initialized')

  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    return { success: false, error: 'Invitasjonen finnes ikke' }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: 'Invitasjonen er ikke lenger gyldig' }
  }

  if (new Date() > invitation.expiresAt) {
    await updateInvitationStatus(invitation.id, 'expired')
    return { success: false, error: 'Invitasjonen har utløpt' }
  }

  // Check if user already has a membership for this company
  const existingMembership = await getMembership(userId, invitation.companyId)
  if (existingMembership) {
    return { success: false, error: 'Du er allerede medlem av denne bedriften' }
  }

  // Create the membership
  await createMembership({
    userId,
    companyId: invitation.companyId,
    role: invitation.role,
    permissions: invitation.permissions,
    invitedBy: invitation.invitedBy,
    status: 'active',
  })

  // Update user's companyId
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, { companyId: invitation.companyId })

  // Mark invitation as accepted
  await updateInvitationStatus(invitation.id, 'accepted')

  return { success: true }
}

// ============================================
// Ownership Transfer Functions
// ============================================

/**
 * Get a pending ownership transfer for a company
 */
export async function getOwnershipTransfer(
  companyId: string
): Promise<OwnershipTransfer | null> {
  if (!db) throw new Error('Firebase not initialized')

  const transfersRef = collection(db, 'ownershipTransfers')
  const q = query(
    transfersRef,
    where('companyId', '==', companyId),
    where('status', '==', 'pending')
  )

  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const transferDoc = snapshot.docs[0]
  const data = transferDoc.data() as OwnershipTransferDoc

  return {
    id: transferDoc.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    expiresAt: (data.expiresAt as Timestamp)?.toDate() || new Date(),
  }
}

/**
 * Get ownership transfer by token
 */
export async function getOwnershipTransferByToken(
  token: string,
  userType: 'from' | 'to'
): Promise<OwnershipTransfer | null> {
  if (!db) throw new Error('Firebase not initialized')

  const transfersRef = collection(db, 'ownershipTransfers')
  const tokenField = userType === 'from' ? 'fromUserToken' : 'toUserToken'
  const q = query(
    transfersRef,
    where(tokenField, '==', token),
    where('status', '==', 'pending')
  )

  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const transferDoc = snapshot.docs[0]
  const data = transferDoc.data() as OwnershipTransferDoc

  return {
    id: transferDoc.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    expiresAt: (data.expiresAt as Timestamp)?.toDate() || new Date(),
  }
}

/**
 * Create a new ownership transfer
 */
export async function createOwnershipTransfer(
  companyId: string,
  fromUserId: string,
  toUserId: string
): Promise<{ id: string; fromUserToken: string; toUserToken: string }> {
  if (!db) throw new Error('Firebase not initialized')

  // Cancel any existing pending transfers
  const existingTransfer = await getOwnershipTransfer(companyId)
  if (existingTransfer) {
    await updateDoc(doc(db, 'ownershipTransfers', existingTransfer.id), {
      status: 'cancelled',
    })
  }

  const fromUserToken = generateToken()
  const toUserToken = generateToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  const transfersRef = collection(db, 'ownershipTransfers')
  const newDocRef = doc(transfersRef)

  const transferDoc: OwnershipTransferDoc = {
    companyId,
    fromUserId,
    toUserId,
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    fromUserConfirmed: false,
    toUserConfirmed: false,
    fromUserToken,
    toUserToken,
    status: 'pending',
  }

  await setDoc(newDocRef, transferDoc)
  return { id: newDocRef.id, fromUserToken, toUserToken }
}

/**
 * Confirm ownership transfer
 */
export async function confirmOwnershipTransfer(
  transferId: string,
  userType: 'from' | 'to',
  token: string
): Promise<{ success: boolean; completed: boolean; error?: string }> {
  if (!db) throw new Error('Firebase not initialized')

  const transferRef = doc(db, 'ownershipTransfers', transferId)
  const transferDoc = await getDoc(transferRef)

  if (!transferDoc.exists()) {
    return { success: false, completed: false, error: 'Overføringen finnes ikke' }
  }

  const transfer = transferDoc.data() as OwnershipTransferDoc

  if (transfer.status !== 'pending') {
    return { success: false, completed: false, error: 'Overføringen er ikke lenger gyldig' }
  }

  const expiresAt = (transfer.expiresAt as Timestamp).toDate()
  if (new Date() > expiresAt) {
    await updateDoc(transferRef, { status: 'expired' })
    return { success: false, completed: false, error: 'Overføringen har utløpt' }
  }

  // Verify token
  const expectedToken = userType === 'from' ? transfer.fromUserToken : transfer.toUserToken
  if (token !== expectedToken) {
    return { success: false, completed: false, error: 'Ugyldig bekreftelseslenke' }
  }

  // Update confirmation
  const updateField = userType === 'from' ? 'fromUserConfirmed' : 'toUserConfirmed'
  await updateDoc(transferRef, { [updateField]: true })

  // Check if both have confirmed
  const otherConfirmed = userType === 'from' ? transfer.toUserConfirmed : transfer.fromUserConfirmed

  if (otherConfirmed) {
    // Complete the transfer
    await completeOwnershipTransfer(transfer)
    await updateDoc(transferRef, { status: 'completed' })
    return { success: true, completed: true }
  }

  return { success: true, completed: false }
}

/**
 * Complete the ownership transfer - update memberships
 */
async function completeOwnershipTransfer(transfer: OwnershipTransferDoc): Promise<void> {
  if (!db) throw new Error('Firebase not initialized')

  // Get the old owner's membership
  const oldOwnerMembership = await getMembership(transfer.fromUserId, transfer.companyId)
  if (oldOwnerMembership) {
    // Change old owner to admin
    await updateMembership(oldOwnerMembership.id, {
      role: 'admin',
      permissions: { channels: true },
    })
  }

  // Get the new owner's membership
  const newOwnerMembership = await getMembership(transfer.toUserId, transfer.companyId)
  if (newOwnerMembership) {
    // Change new owner to owner role
    await updateMembership(newOwnerMembership.id, {
      role: 'admin', // This will be changed to 'owner' below
      permissions: {},
    })
    // Delete and recreate with owner role (since owner can't be set via updateMembership)
    await deleteMembership(newOwnerMembership.id)
    await createMembership({
      userId: transfer.toUserId,
      companyId: transfer.companyId,
      role: 'owner',
      permissions: {},
      invitedBy: transfer.fromUserId,
      status: 'active',
    })
  }

  // Update company ownerId
  const companyRef = doc(db, 'companies', transfer.companyId)
  await updateDoc(companyRef, { ownerId: transfer.toUserId })

  // Update user roles
  const fromUserRef = doc(db, 'users', transfer.fromUserId)
  await updateDoc(fromUserRef, { role: 'admin' })

  const toUserRef = doc(db, 'users', transfer.toUserId)
  await updateDoc(toUserRef, { role: 'owner' })
}

/**
 * Cancel an ownership transfer
 */
export async function cancelOwnershipTransfer(transferId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized')

  const transferRef = doc(db, 'ownershipTransfers', transferId)
  await updateDoc(transferRef, { status: 'cancelled' })
}

// ============================================
// User Functions
// ============================================

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<{
    displayName: string
    avatarUrl: string
    phone: string
  }>
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized')

  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, updates)
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<{
  id: string
  email: string
  displayName: string
  companyId?: string
} | null> {
  if (!db) throw new Error('Firebase not initialized')

  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('email', '==', email.toLowerCase()))

  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const userDoc = snapshot.docs[0]
  const data = userDoc.data()

  return {
    id: userDoc.id,
    email: data.email,
    displayName: data.displayName,
    companyId: data.companyId,
  }
}
