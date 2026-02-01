import { NextRequest, NextResponse } from 'next/server'
import { getKnowledgeDocuments } from '@/lib/messenger-firestore'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

/**
 * Debug endpoint to verify knowledge documents are being fetched correctly
 * GET /api/debug/knowledge-docs - List all companies
 * GET /api/debug/knowledge-docs?companyId=xxx - Get docs for specific company
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')

  // If no companyId, list all companies with Messenger enabled
  if (!companyId) {
    try {
      const response = await fetch(`${FIRESTORE_BASE_URL}/companies`)
      if (!response.ok) {
        return NextResponse.json({ error: 'Could not fetch companies' }, { status: 500 })
      }
      const data = await response.json()

      const companies = (data.documents || []).map((doc: { name: string; fields?: Record<string, unknown> }) => {
        const id = doc.name.split('/').pop()
        const fields = doc.fields || {}

        // Try to get business name
        const businessProfile = fields.businessProfile as { mapValue?: { fields?: { businessName?: { stringValue?: string } } } } | undefined
        const businessName = businessProfile?.mapValue?.fields?.businessName?.stringValue || 'Ukjent'

        // Check if messenger is configured
        const channels = fields.channels as { mapValue?: { fields?: { messenger?: { mapValue?: { fields?: { pageId?: { stringValue?: string } } } } } } } | undefined
        const messengerPageId = channels?.mapValue?.fields?.messenger?.mapValue?.fields?.pageId?.stringValue

        return {
          companyId: id,
          businessName,
          hasMessenger: !!messengerPageId,
          messengerPageId: messengerPageId || null
        }
      })

      return NextResponse.json({
        message: 'Bruk ?companyId=xxx for å se knowledge docs',
        companies: companies.filter((c: { hasMessenger: boolean }) => c.hasMessenger)
      })
    } catch (error) {
      return NextResponse.json({ error: 'Error listing companies' }, { status: 500 })
    }
  }

  try {
    console.log('[Debug] Fetching knowledge docs for company:', companyId)
    const docs = await getKnowledgeDocuments(companyId)

    return NextResponse.json({
      success: true,
      companyId,
      documentCount: docs.length,
      documents: docs.map((doc, index) => ({
        index,
        faqCount: doc.faqs.length,
        rulesCount: doc.rules.length,
        policiesCount: doc.policies.length,
        importantInfoCount: doc.importantInfo.length,
        // Show first few items as preview
        faqsPreview: doc.faqs.slice(0, 3),
        importantInfoPreview: doc.importantInfo.slice(0, 5),
      }))
    })
  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
