import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { verifyIdToken } from '@/lib/auth-server'

/**
 * DELETE - Delete user account and all associated data
 * GDPR: Right to be forgotten (Rett til sletting)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    console.log(`[Account Delete] Starting account deletion for user: ${userId} (${userEmail})`)

    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get user document to find their company
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const companyId = userData?.companyId

    // Check if user is the owner of the company
    if (companyId) {
      const companyDoc = await adminDb.collection('companies').doc(companyId).get()
      const companyData = companyDoc.data()

      if (companyData?.ownerId === userId) {
        // Check if there are other members
        const membershipsSnapshot = await adminDb
          .collection('companies')
          .doc(companyId)
          .collection('memberships')
          .where('status', '==', 'active')
          .get()

        const activeMembers = membershipsSnapshot.docs.filter(doc => doc.id !== userId)

        if (activeMembers.length > 0) {
          return NextResponse.json(
            {
              error: 'Du er eier av en bedrift med andre medlemmer. Overfør eierskapet til en annen bruker først, eller fjern alle andre medlemmer.',
              code: 'OWNER_WITH_MEMBERS'
            },
            { status: 400 }
          )
        }

        // User is sole owner, delete the entire company and all data
        console.log(`[Account Delete] User is sole owner, deleting company: ${companyId}`)
        await deleteCompanyData(companyId)
      } else {
        // User is not owner, just remove their membership
        console.log(`[Account Delete] Removing user membership from company: ${companyId}`)
        await adminDb
          .collection('companies')
          .doc(companyId)
          .collection('memberships')
          .doc(userId)
          .delete()
      }
    }

    // Delete user document
    console.log(`[Account Delete] Deleting user document`)
    await adminDb.collection('users').doc(userId).delete()

    // Delete user's notification preferences
    try {
      await adminDb.collection('userNotificationPreferences').doc(userId).delete()
    } catch {
      // May not exist
    }

    // Delete user's push subscriptions
    try {
      const pushSubscriptions = await adminDb
        .collection('pushSubscriptions')
        .where('userId', '==', userId)
        .get()

      const batch = adminDb.batch()
      pushSubscriptions.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()
    } catch {
      // May not exist
    }

    // Finally, delete the Firebase Auth user
    console.log(`[Account Delete] Deleting Firebase Auth user`)
    await adminAuth.deleteUser(userId)

    console.log(`[Account Delete] Successfully deleted account for user: ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Kontoen din og alle tilknyttede data er slettet.',
    })
  } catch (error) {
    console.error('[Account Delete] Error:', error)
    return NextResponse.json(
      { error: 'Kunne ikke slette kontoen. Prøv igjen senere.' },
      { status: 500 }
    )
  }
}

/**
 * Delete all company data including subcollections
 */
async function deleteCompanyData(companyId: string) {
  if (!adminDb) return

  const batch = adminDb.batch()

  // Delete subcollections
  const subcollections = [
    'faqs',
    'chats',
    'messengerChats',
    'instagramChats',
    'smsChats',
    'emailChats',
    'escalations',
    'memberships',
    'syncConfig',
    'syncJobs',
    'conflicts',
    'documents',
    'channels',
  ]

  for (const subcollection of subcollections) {
    try {
      const snapshot = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection(subcollection)
        .limit(500)
        .get()

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
    } catch {
      // Subcollection may not exist
    }
  }

  // Delete the company document itself
  batch.delete(adminDb.collection('companies').doc(companyId))

  await batch.commit()

  console.log(`[Account Delete] Deleted company and all subcollections: ${companyId}`)
}

/**
 * GET - Get data export for GDPR (Dataportabilitet)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Collect all user data
    const userData: Record<string, unknown> = {}

    // User document
    const userDoc = await adminDb.collection('users').doc(userId).get()
    userData.profile = userDoc.data() || {}

    // Notification preferences
    try {
      const notifDoc = await adminDb.collection('userNotificationPreferences').doc(userId).get()
      userData.notificationPreferences = notifDoc.data() || {}
    } catch {
      userData.notificationPreferences = {}
    }

    // Company data if they have one
    const companyId = (userData.profile as Record<string, unknown>)?.companyId as string | undefined
    if (companyId) {
      const companyDoc = await adminDb.collection('companies').doc(companyId).get()
      userData.company = companyDoc.data() || {}

      // Membership
      const membershipDoc = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('memberships')
        .doc(userId)
        .get()
      userData.membership = membershipDoc.data() || {}
    }

    return NextResponse.json({
      success: true,
      exportDate: new Date().toISOString(),
      data: userData,
    })
  } catch (error) {
    console.error('[Account Export] Error:', error)
    return NextResponse.json(
      { error: 'Kunne ikke eksportere data. Prøv igjen senere.' },
      { status: 500 }
    )
  }
}
