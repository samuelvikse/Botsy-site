import { NextRequest, NextResponse } from 'next/server'
import { getKnowledgeDocuments } from '@/lib/messenger-firestore'

/**
 * Debug endpoint to verify knowledge documents are being fetched correctly
 * GET /api/debug/knowledge-docs?companyId=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json({ error: 'companyId parameter required' }, { status: 400 })
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
