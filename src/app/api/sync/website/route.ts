import { NextRequest, NextResponse } from 'next/server'
import { runWebsiteSync } from '@/lib/knowledge-sync/sync-service'
import { getSyncConfig, saveSyncConfig } from '@/lib/knowledge-sync/firestore'
import { scrapeWithFAQPage, formatForAnalysis } from '@/lib/scraper'
import { analyzeWebsiteContent } from '@/lib/groq'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
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
    const { companyId, websiteUrl: requestUrl } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log(`[Sync API] Starting manual sync for company: ${companyId}`)

    // First, check if company has a businessProfile
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 }
      )
    }
    
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
    const businessName = companyData?.businessName || companyData?.profile?.businessName || companyData?.name || 'Bedrift'

    // Check multiple sources for website URL: request body, company doc, profile, or sync config
    let websiteUrl = requestUrl || companyData?.websiteUrl || companyData?.profile?.websiteUrl
    let cachedSyncConfig = !websiteUrl ? await getSyncConfig(companyId) : null
    if (!websiteUrl) {
      websiteUrl = cachedSyncConfig?.websiteUrl
    }

    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: 'No website URL configured for this company' },
        { status: 400 }
      )
    }

    // Normalize URL
    const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

    // If businessProfile exists but widget is disabled, enable it
    const widgetEnabled = companyData?.widgetSettings?.isEnabled === true
    if (hasBusinessProfile && !widgetEnabled) {
      console.log(`[Sync API] Enabling widget for ${companyId}`)
      await updateDoc(companyRef, {
        'widgetSettings.isEnabled': true,
      })
    }

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
          source: 'extracted' as const,
        }))

        // Create businessProfile
        const businessProfile: BusinessProfile = {
          businessName,
          websiteUrl: normalizedUrl,
          industry: analysisResult.industry || '',
          tone: analysisResult.tone || 'friendly',
          services: analysisResult.services || [],
          products: analysisResult.products || [],
          terminology: analysisResult.terminology || [],
          description: analysisResult.description || '',
          targetAudience: analysisResult.targetAudience || '',
          faqs,
          contactInfo: {
            email: analysisResult.contactInfo?.email || null,
            phone: analysisResult.contactInfo?.phone || null,
            address: analysisResult.contactInfo?.address || null,
            openingHours: analysisResult.contactInfo?.openingHours || null,
          },
          lastAnalyzed: new Date(),
          toneConfig: {
            useEmojis: analysisResult.tone === 'casual',
            humorLevel: analysisResult.tone === 'casual' ? 'moderate' : 'none',
            responseLength: 'balanced',
          },
        }

        // Save to Firestore - also enable the widget since we now have a profile
        await updateDoc(companyRef, {
          businessProfile,
          websiteUrl: normalizedUrl, // Also update the root websiteUrl to be normalized
          'widgetSettings.isEnabled': true, // Enable widget since profile now exists
        })

        console.log(`[Sync API] Created businessProfile with ${faqs.length} FAQs for ${companyId}`)
        
        return NextResponse.json({
          success: true,
          newFaqsCreated: faqs.length,
          faqsAdded: faqs.length, // For compatibility with admin panel toast
          businessProfileCreated: true,
          widgetEnabled: true,
          message: `Opprettet bedriftsprofil med ${faqs.length} FAQs`,
        })
      } catch (profileError) {
        console.error('[Sync API] Error creating businessProfile:', profileError)
        const profileErrorMessage = profileError instanceof Error ? profileError.message : 'Failed to create profile'
        return NextResponse.json(
          { success: false, error: `Kunne ikke opprette bedriftsprofil: ${profileErrorMessage}` },
          { status: 500 }
        )
      }
    }

    // Company already has businessProfile
    // Check if there's a sync config set up - if not, just return success
    const syncConfig = cachedSyncConfig || await getSyncConfig(companyId)
    
    if (!syncConfig || !syncConfig.enabled) {
      // No sync config - widget is enabled, profile exists, we're done
      console.log(`[Sync API] Company ${companyId} has profile but no sync config`)
      return NextResponse.json({
        success: true,
        faqsAdded: 0,
        message: 'Bedriftsprofil er allerede konfigurert. Chat-widget er aktivert!',
        widgetEnabled: !widgetEnabled, // Was widget just enabled?
      })
    }

    // Company has sync config - run the normal sync process
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
