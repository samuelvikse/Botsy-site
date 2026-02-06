import { NextRequest, NextResponse } from 'next/server'
import {
  verifyIdTokenRest,
  getDocumentRest,
  deleteDocumentRest,
  listDocumentsRest,
  deleteAuthUserRest,
} from '@/lib/firebase-rest'

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
    const user = await verifyIdTokenRest(token)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.uid
    const userEmail = user.email

    console.log(`[Account Delete] Starting account deletion for user: ${userId} (${userEmail})`)

    // Get user document to find their company
    const userData = await getDocumentRest('users', userId)
    const companyId = userData?.companyId as string | undefined

    // Check if user is the owner of the company
    if (companyId) {
      const companyData = await getDocumentRest('companies', companyId)

      if (companyData?.ownerId === userId) {
        // Check if there are other active members
        const memberships = await listDocumentsRest(`companies/${companyId}/memberships`)
        const activeMembers = memberships.filter(
          m => m.id !== userId && m.data.status === 'active'
        )

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
        await deleteDocumentRest(`companies/${companyId}/memberships/${userId}`)
      }
    }

    // Delete user document
    console.log(`[Account Delete] Deleting user document`)
    await deleteDocumentRest(`users/${userId}`)

    // Delete user's notification preferences
    await deleteDocumentRest(`userNotificationPreferences/${userId}`)

    // Finally, delete the Firebase Auth user
    console.log(`[Account Delete] Deleting Firebase Auth user`)
    await deleteAuthUserRest(token)

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
    'invoices',
  ]

  for (const subcollection of subcollections) {
    try {
      const docs = await listDocumentsRest(`companies/${companyId}/${subcollection}`)
      for (const doc of docs) {
        await deleteDocumentRest(`companies/${companyId}/${subcollection}/${doc.id}`)
      }
    } catch {
      // Subcollection may not exist
    }
  }

  // Delete the company document itself
  await deleteDocumentRest(`companies/${companyId}`)

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
    const user = await verifyIdTokenRest(token)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.uid

    // Collect all user data
    const exportData: Record<string, unknown> = {}

    // User document
    exportData.profile = await getDocumentRest('users', userId) || {}

    // Notification preferences
    exportData.notificationPreferences = await getDocumentRest('userNotificationPreferences', userId) || {}

    // Company data if they have one
    const companyId = (exportData.profile as Record<string, unknown>)?.companyId as string | undefined
    if (companyId) {
      exportData.company = await getDocumentRest('companies', companyId) || {}
    }

    return NextResponse.json({
      success: true,
      exportDate: new Date().toISOString(),
      data: exportData,
    })
  } catch (error) {
    console.error('[Account Export] Error:', error)
    return NextResponse.json(
      { error: 'Kunne ikke eksportere data. Prøv igjen senere.' },
      { status: 500 }
    )
  }
}
