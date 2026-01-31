import { NextRequest, NextResponse } from 'next/server'
import { scrapeWithFAQPage, formatForAnalysis } from '@/lib/scraper'
import { analyzeWebsiteContent, generateAnalysisSummary } from '@/lib/groq'
import type { BusinessProfile, FAQ, AnalyzeWebsiteResponse } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeWebsiteResponse & { summary?: string }>> {
  try {
    const body = await request.json()
    const { url, businessName } = body

    // Validate input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL er påkrevd' },
        { status: 400 }
      )
    }

    if (!businessName || typeof businessName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bedriftsnavn er påkrevd' },
        { status: 400 }
      )
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI-tjenesten er ikke konfigurert. Legg til GROQ_API_KEY i miljøvariabler.' },
        { status: 500 }
      )
    }

    // Scrape the website including FAQ and about pages
    let scrapedData
    try {
      scrapedData = await scrapeWithFAQPage(url)
    } catch (scrapeError) {
      const message = scrapeError instanceof Error ? scrapeError.message : 'Ukjent feil ved henting av nettside'
      return NextResponse.json(
        { success: false, error: `Kunne ikke hente nettsiden: ${message}` },
        { status: 400 }
      )
    }

    // Format all content for analysis
    let formattedContent = formatForAnalysis(scrapedData.mainContent)

    if (scrapedData.faqPage) {
      formattedContent += '\n\n--- FAQ-SIDE ---\n' + formatForAnalysis(scrapedData.faqPage)
    }

    if (scrapedData.aboutPage) {
      formattedContent += '\n\n--- OM OSS-SIDE ---\n' + formatForAnalysis(scrapedData.aboutPage)
    }

    if (!formattedContent || formattedContent.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Kunne ikke finne nok innhold på nettsiden for analyse' },
        { status: 400 }
      )
    }

    // Analyze with Groq AI (deep research)
    const analysisResult = await analyzeWebsiteContent(formattedContent, businessName)

    // Combine FAQs from scraper and AI analysis
    const allFaqs: FAQ[] = []
    const seenQuestions = new Set<string>()

    // Add FAQs extracted directly from HTML
    if (scrapedData.mainContent.rawFaqs) {
      for (const faq of scrapedData.mainContent.rawFaqs) {
        const key = faq.question.toLowerCase().slice(0, 50)
        if (!seenQuestions.has(key)) {
          seenQuestions.add(key)
          allFaqs.push({
            id: `scraped-${Date.now()}-${allFaqs.length}`,
            question: faq.question,
            answer: faq.answer,
            source: 'extracted',
            confirmed: false,
          })
        }
      }
    }

    // Add FAQs from FAQ page if found
    if (scrapedData.faqPage?.rawFaqs) {
      for (const faq of scrapedData.faqPage.rawFaqs) {
        const key = faq.question.toLowerCase().slice(0, 50)
        if (!seenQuestions.has(key)) {
          seenQuestions.add(key)
          allFaqs.push({
            id: `faqpage-${Date.now()}-${allFaqs.length}`,
            question: faq.question,
            answer: faq.answer,
            source: 'extracted',
            confirmed: false,
          })
        }
      }
    }

    // Add FAQs from AI analysis
    if (analysisResult.faqs) {
      for (const faq of analysisResult.faqs) {
        const key = faq.question.toLowerCase().slice(0, 50)
        if (!seenQuestions.has(key)) {
          seenQuestions.add(key)
          allFaqs.push({
            id: `ai-${Date.now()}-${allFaqs.length}`,
            question: faq.question,
            answer: faq.answer,
            source: 'generated',
            confirmed: false,
          })
        }
      }
    }

    // Build the business profile
    const profile: BusinessProfile = {
      websiteUrl: url,
      businessName: analysisResult.businessName,
      industry: analysisResult.industry,
      tone: analysisResult.tone,
      toneReason: analysisResult.toneReason,
      targetAudience: analysisResult.targetAudience,
      brandPersonality: analysisResult.brandPersonality,
      services: analysisResult.services,
      products: analysisResult.products,
      terminology: analysisResult.terminology,
      description: analysisResult.description,
      faqs: allFaqs,
      lastAnalyzed: new Date(),
    }

    // Generate a friendly summary for Botsy to say
    const summary = await generateAnalysisSummary(analysisResult, allFaqs.length)

    // Store the scraped content for FAQ lookups later
    const websiteContent = formattedContent

    return NextResponse.json({
      success: true,
      profile,
      summary,
      websiteContent, // Include for later FAQ lookups
    } as AnalyzeWebsiteResponse & { summary: string; websiteContent: string })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'En ukjent feil oppstod'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
