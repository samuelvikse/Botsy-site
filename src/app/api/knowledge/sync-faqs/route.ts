import { NextRequest, NextResponse } from 'next/server'
import {
  getKnowledgeDocuments,
  getFAQs,
  saveFAQs,
  getDismissedFAQs,
} from '@/lib/firestore'
import type { FAQ } from '@/types'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID mangler' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId)
    if (!access) return forbiddenResponse()

    // Get all knowledge documents
    const documents = await getKnowledgeDocuments(companyId)

    // Get existing FAQs
    const existingFAQs = await getFAQs(companyId)

    // Get dismissed FAQs (deleted by user, should not be re-added)
    const dismissedFAQs = await getDismissedFAQs(companyId)

    // Track new FAQs to add
    const newFAQs: FAQ[] = []

    // Go through each document and extract FAQs
    for (const doc of documents) {
      if (doc.status !== 'ready' || !doc.analyzedData?.faqs) continue

      for (const faq of doc.analyzedData.faqs) {
        const normalizedQuestion = faq.question.toLowerCase().trim()

        // Check if FAQ already exists (by question similarity)
        const exists = existingFAQs.some(
          (existing) =>
            existing.question.toLowerCase().trim() === normalizedQuestion
        )

        // Check if FAQ was previously dismissed/deleted by user
        const isDismissed = dismissedFAQs.some(
          (dismissed) =>
            dismissed.toLowerCase().trim() === normalizedQuestion
        )

        // Also check if already added in this sync
        const alreadyAdded = newFAQs.some(
          (added) =>
            added.question.toLowerCase().trim() === normalizedQuestion
        )

        if (!exists && !isDismissed && !alreadyAdded) {
          newFAQs.push({
            id: `doc-${doc.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            question: faq.question,
            answer: faq.answer,
            source: 'extracted',
            confirmed: false,
          })
        }
      }
    }

    // Save new FAQs if any were found
    if (newFAQs.length > 0) {
      await saveFAQs(companyId, [...existingFAQs, ...newFAQs])
    }

    return NextResponse.json({
      success: true,
      added: newFAQs.length,
      total: existingFAQs.length + newFAQs.length,
      message: newFAQs.length > 0
        ? `${newFAQs.length} nye FAQs ble lagt til fra dokumenter`
        : 'Ingen nye FAQs funnet i dokumenter',
    })
  } catch (error) {
    console.error('Error syncing FAQs:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke synkronisere FAQs' },
      { status: 500 }
    )
  }
}
