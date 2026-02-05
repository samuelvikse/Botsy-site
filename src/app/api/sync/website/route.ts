import { NextRequest, NextResponse } from 'next/server'
import { runWebsiteSync } from '@/lib/knowledge-sync/sync-service'
import { getSyncConfig, saveSyncConfig } from '@/lib/knowledge-sync/firestore'
import { scrapeWithFAQPage, formatForAnalysis } from '@/lib/scraper'
import { analyzeWebsiteContent } from '@/lib/groq'
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore'
import { getFirebaseApp } from '@/lib/firebase-rest'
import type { BusinessProfile, FAQ } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds

/**
 * POST - Trigger manual website sync
 * 
 * This will:
 * 1. Run the normal sync (adds FAQs to subcollection)
 * 2. If no businessProfile exists, create one from the website
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log(`[Sync API] Starting manual sync for company: ${companyId}`)

    // First, check if company has a businessProfile
    const app = getFirebaseApp()
    const db = getFirestore(app)
    const companyRef = doc(db, 'companies', companyId)
    const companyDoc = await getDoc(companyRef)
    
    if (!companyDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      )
    }

    const companyData = companyDoc.data()
    const hasBusinessProfile = !!companyData?.businessProfile
    const websiteUrl = companyData?.websiteUrl || companyData?.profile?.websiteUrl
    const businessName = companyData?.businessName || companyData?.profile?.businessName || 'Bedrift'

    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: 'No website URL configured for this company' },
        { status: 400 }
      )
    }

    // Normalize URL
    const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

    // If no businessProfile exists, create one from the website
    if (!hasBusinessProfile) {
      console.log(`[Sync API] Creating businessProfile for ${companyId}`)
      
      try {
        // Scrape the website
        const scrapedData = await scrapeWithFAQPage(normalizedUrl)
        
        // Format content for AI analysis
        let formattedContent = formatForAnalysis(scrapedData.mainContent)
        if (scrapedData.faqPage) {
          formattedContent += '\n\n--- FAQ-SIDE ---\n' + formatForAnalysis(scrapedData.faqPage)
        }
        if (scrapedData.aboutPage) {
          formattedContent += '\n\n--- OM OSS-SIDE ---\n' + formatForAnalysis(scrapedData.aboutPage)
        }

        // Analyze with AI
        const analysisResult = await analyzeWebsiteContent(formattedContent, businessName)

        // Build FAQs array
        const faqs: FAQ[] = analysisResult.faqs.map((faq, index) => ({
          id: `faq-${index + 1}`,
          question: faq.question,
          answer: faq.answer,
          category: 'general',
          confirmed: true,
        }))

        // Create businessProfile
        const businessProfile: BusinessProfile = {
          businessName,
          websiteUrl: normalizedUrl,
          industry: analysisResult.industry || '',
          tone: analysisResult.tone || 'friendly',
          services: analysisResult.services || [],
          targetAudience: analysisResult.targetAudience || '',
          faqs,
          contactEmail: analysisResult.contactInfo?.email || '',
          contactPhone: analysisResult.contactInfo?.phone || '',
          address: analysisResult.contactInfo?.address || '',
          openingHours: analysisResult.openingHours || '',
          lastAnalyzed: new Date(),
          toneConfig: {
            useEmojis: analysisResult.tone === 'casual',
            humorLevel: analysisResult.tone === 'casual' ? 'medium' : 'minimal',
            responseLength: 'balanced',
          },
        }

        // Save to Firestore
        await updateDoc(companyRef, {
          businessProfile,
          websiteUrl: normalizedUrl, // Also update the root websiteUrl to be normalized
        })

        console.log(`[Sync API] Created businessProfile with ${faqs.length} FAQs for ${companyId}`)
        
        return NextResponse.json({
          success: true,
          newFaqsCreated: faqs.length,
          businessProfileCreated: true,
          message: `Opprettet bedriftsprofil med ${faqs.length} FAQs`,
        })
      } catch (profileError) {
        console.error('[Sync API] Error creating businessProfile:', profileError)
        // Continue with normal sync even if profile creation fails
      }
    }

    // Run the normal sync process
    const result = await runWebsiteSync(companyId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Sync API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to run sync'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update sync configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, ...config } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    await saveSyncConfig(companyId, config)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Sync API] Error updating config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get sync configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    const config = await getSyncConfig(companyId)

    return NextResponse.json({
      success: true,
      config: config || {
        enabled: false,
        websiteUrl: '',
        syncIntervalHours: 1,
        autoApproveWebsiteFaqs: false,
        notifyOnConflicts: true,
        notifyOnNewFaqs: true,
      },
    })
  } catch (error) {
    console.error('[Sync API] Error getting config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get config' },
      { status: 500 }
    )
  }
}
