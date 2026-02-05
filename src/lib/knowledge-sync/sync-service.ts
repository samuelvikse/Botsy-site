/**
 * Knowledge Sync Service
 *
 * Handles automatic synchronization of knowledge base with website content
 */

import { scrapeWithFAQPage, formatForAnalysis } from '@/lib/scraper'
import {
  getSyncConfig,
  saveSyncConfig,
  createSyncJob,
  updateSyncJob,
  createConflict,
  createFAQFromWebsite,
  getFAQsWithSyncInfo,
  updateFAQSyncFields,
} from './firestore'
import type {
  ExtractedFAQInfo,
  WebsiteAnalysisResult,
  SyncResultSummary,
  ExtendedFAQ,
  FAQSource,
} from './types'
import crypto from 'crypto'

// ============================================
// Main Sync Function
// ============================================

export async function runWebsiteSync(companyId: string): Promise<SyncResultSummary> {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Get sync configuration
  let config = await getSyncConfig(companyId)

  // If no sync config exists, try to get websiteUrl from company document
  if (!config || !config.enabled || !config.websiteUrl) {
    // Try to get websiteUrl from company document
    const { doc, getDoc } = await import('firebase/firestore')
    const { db } = await import('@/lib/firebase')
    
    if (!db) {
      return {
        success: false,
        jobId: '',
        totalFaqsOnWebsite: 0,
        newFaqsCreated: 0,
        conflictsCreated: 0,
        faqsUpdated: 0,
        faqsMarkedOutdated: 0,
        contentChanged: false,
        errors: ['Database not initialized'],
        warnings: [],
      }
    }

    const companyRef = doc(db, 'companies', companyId)
    const companyDoc = await getDoc(companyRef)
    
    if (!companyDoc.exists()) {
      return {
        success: false,
        jobId: '',
        totalFaqsOnWebsite: 0,
        newFaqsCreated: 0,
        conflictsCreated: 0,
        faqsUpdated: 0,
        faqsMarkedOutdated: 0,
        contentChanged: false,
        errors: ['Company not found'],
        warnings: [],
      }
    }

    const companyData = companyDoc.data()
    const websiteUrl = companyData?.websiteUrl || companyData?.profile?.websiteUrl
    
    if (!websiteUrl) {
      return {
        success: false,
        jobId: '',
        totalFaqsOnWebsite: 0,
        newFaqsCreated: 0,
        conflictsCreated: 0,
        faqsUpdated: 0,
        faqsMarkedOutdated: 0,
        contentChanged: false,
        errors: ['No website URL configured for this company'],
        warnings: [],
      }
    }

    // Create a temporary config for this sync
    config = {
      companyId,
      websiteUrl: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
      enabled: true,
      syncIntervalHours: 1,
      autoApproveWebsiteFaqs: true, // Auto-approve since this is admin-triggered
      notifyOnConflicts: false,
      notifyOnNewFaqs: false,
      additionalUrls: [],
      excludedPaths: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    console.log(`[Sync] Using company websiteUrl: ${config.websiteUrl}`)
  }

  // 2. Create sync job
  const jobId = await createSyncJob(companyId, config.websiteUrl)
  await updateSyncJob(companyId, jobId, { status: 'running' })

  try {
    // 3. Scrape website
    console.log(`[Sync] Scraping website: ${config.websiteUrl}`)
    const scrapedContent = await scrapeWithFAQPage(config.websiteUrl)

    // 4. Generate content hash for change detection
    const contentForHash = formatForAnalysis(scrapedContent.mainContent)
    const contentHash = crypto.createHash('md5').update(contentForHash).digest('hex')

    // Check if content changed
    const contentChanged = contentHash !== config.lastSyncJobId

    // 5. Extract FAQs using AI
    console.log('[Sync] Analyzing content with AI...')
    const analysisResult = await analyzeContentWithAI(scrapedContent, config.websiteUrl)

    // 6. Get existing FAQs
    const existingFaqs = await getFAQsWithSyncInfo(companyId)

    // 7. Process extracted FAQs
    let newFaqsCreated = 0
    let conflictsCreated = 0
    let faqsUpdated = 0
    const seenFaqIds = new Set<string>()

    for (const extracted of analysisResult.faqs) {
      const match = await findSemanticMatch(extracted, existingFaqs)

      if (!match) {
        // NEW INFO - create pending FAQ
        console.log(`[Sync] New FAQ found: ${extracted.question.slice(0, 50)}...`)
        await createFAQFromWebsite(companyId, {
          question: extracted.question,
          answer: extracted.answer,
          websiteUrl: extracted.sourceUrl,
          autoApprove: config.autoApproveWebsiteFaqs,
        })
        newFaqsCreated++
      } else {
        seenFaqIds.add(match.id)

        // Check if content differs
        const contentDiffers = !isSimilarContent(match.answer, extracted.answer)

        if (contentDiffers) {
          if (match.source === 'manual') {
            // CONFLICT WITH MANUAL - create conflict record
            console.log(`[Sync] Conflict detected for FAQ: ${match.question.slice(0, 50)}...`)
            await createConflict(companyId, {
              faqId: match.id,
              currentQuestion: match.question,
              currentAnswer: match.answer,
              currentSource: match.source,
              websiteQuestion: extracted.question,
              websiteAnswer: extracted.answer,
              websiteUrl: extracted.sourceUrl,
              similarityScore: extracted.confidence,
              status: 'pending',
            })
            conflictsCreated++
          } else {
            // UPDATE website-sourced FAQ
            console.log(`[Sync] Updating FAQ: ${match.question.slice(0, 50)}...`)
            await updateFAQSyncFields(companyId, match.id, {
              websiteLastSeen: new Date(),
              possiblyOutdated: false,
            })
            faqsUpdated++
          }
        } else {
          // Content same, just update last seen
          await updateFAQSyncFields(companyId, match.id, {
            websiteLastSeen: new Date(),
            possiblyOutdated: false,
          })
        }
      }
    }

    // 8. Find FAQs that weren't seen on website (possibly outdated)
    let faqsMarkedOutdated = 0
    for (const faq of existingFaqs) {
      if (
        (faq.source === 'website' || faq.source === 'website_auto') &&
        !seenFaqIds.has(faq.id)
      ) {
        console.log(`[Sync] Marking FAQ as possibly outdated: ${faq.question.slice(0, 50)}...`)
        await updateFAQSyncFields(companyId, faq.id, {
          possiblyOutdated: true,
        })
        faqsMarkedOutdated++
      }
    }

    // 9. Update sync job with results
    const completedAt = new Date()
    await updateSyncJob(companyId, jobId, {
      status: 'completed',
      newFaqsFound: newFaqsCreated,
      conflictsFound: conflictsCreated,
      faqsUpdated,
      faqsMarkedOutdated,
      completedAt,
      duration: completedAt.getTime() - Date.now(),
      contentHash,
    })

    // 10. Update sync config
    await saveSyncConfig(companyId, {
      lastSyncAt: completedAt,
      lastSyncJobId: jobId,
    })

    return {
      success: true,
      jobId,
      totalFaqsOnWebsite: analysisResult.faqs.length,
      newFaqsCreated,
      conflictsCreated,
      faqsUpdated,
      faqsMarkedOutdated,
      contentChanged,
      errors,
      warnings,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Sync] Error:', errorMessage)

    await updateSyncJob(companyId, jobId, {
      status: 'failed',
      error: errorMessage,
      completedAt: new Date(),
    })

    return {
      success: false,
      jobId,
      totalFaqsOnWebsite: 0,
      newFaqsCreated: 0,
      conflictsCreated: 0,
      faqsUpdated: 0,
      faqsMarkedOutdated: 0,
      contentChanged: false,
      errors: [errorMessage],
      warnings,
    }
  }
}

// ============================================
// AI Analysis
// ============================================

async function analyzeContentWithAI(
  scrapedContent: Awaited<ReturnType<typeof scrapeWithFAQPage>>,
  baseUrl: string
): Promise<WebsiteAnalysisResult> {
  const formattedContent = formatForAnalysis(scrapedContent.mainContent)

  // Combine content from all scraped pages
  let allContent = formattedContent
  if (scrapedContent.faqPage) {
    allContent += '\n\n--- FAQ-SIDE ---\n' + formatForAnalysis(scrapedContent.faqPage)
  }
  if (scrapedContent.aboutPage) {
    allContent += '\n\n--- OM OSS-SIDE ---\n' + formatForAnalysis(scrapedContent.aboutPage)
  }

  // Start with raw FAQs if found
  const faqs: ExtractedFAQInfo[] = []

  // Add raw FAQs from scraper
  if (scrapedContent.mainContent.rawFaqs) {
    for (const rawFaq of scrapedContent.mainContent.rawFaqs) {
      faqs.push({
        question: rawFaq.question,
        answer: rawFaq.answer,
        sourceUrl: baseUrl,
        confidence: 0.9,
      })
    }
  }
  if (scrapedContent.faqPage?.rawFaqs) {
    for (const rawFaq of scrapedContent.faqPage.rawFaqs) {
      faqs.push({
        question: rawFaq.question,
        answer: rawFaq.answer,
        sourceUrl: scrapedContent.faqPage.url,
        confidence: 0.95,
      })
    }
  }

  // Use AI to extract additional FAQs from content
  try {
    const aiExtractedFaqs = await extractFAQsWithAI(allContent, baseUrl)

    // Deduplicate: don't add AI-extracted FAQs if similar to raw FAQs
    for (const aiFaq of aiExtractedFaqs) {
      const isDuplicate = faqs.some(
        existing => calculateSimilarity(existing.question, aiFaq.question) > 0.7
      )
      if (!isDuplicate) {
        faqs.push(aiFaq)
      }
    }
  } catch (error) {
    console.error('[Sync] AI extraction failed:', error)
    // Continue with raw FAQs only
  }

  // Generate content hash
  const contentHash = crypto.createHash('md5').update(allContent).digest('hex')

  return {
    faqs,
    contentHash,
    scrapedAt: new Date(),
  }
}

async function extractFAQsWithAI(
  content: string,
  sourceUrl: string
): Promise<ExtractedFAQInfo[]> {
  const { generateAIResponse } = await import('@/lib/ai-providers')

  const systemPrompt = `Du er en ekspert på å analysere nettsideinnhold og ekstrahere FAQ-informasjon.

Din oppgave er å analysere innholdet og finne informasjon som kan formuleres som spørsmål og svar (FAQs).

REGLER:
1. Ekstraher BARE informasjon som faktisk finnes i innholdet - ALDRI finn på noe
2. Formuler naturlige spørsmål som kunder typisk ville stille
3. Svarene skal være konsise men komplette
4. Ignorer navigasjon, menyer, og generisk tekst
5. Fokuser på: åpningstider, priser, tjenester, kontaktinfo, policies, etc.
6. Maksimalt 15 FAQs

Svar i JSON-format:
{
  "faqs": [
    {
      "question": "Spørsmålet",
      "answer": "Svaret",
      "confidence": 0.9
    }
  ]
}`

  const userMessage = `Analyser dette innholdet og ekstraher FAQs:\n\n${content.slice(0, 8000)}`

  const result = await generateAIResponse(
    systemPrompt,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    { maxTokens: 2000, temperature: 0.3 }
  )

  if (!result.success) {
    throw new Error('AI extraction failed')
  }

  try {
    // Parse JSON from response
    const jsonMatch = result.response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return []
    }

    const parsed = JSON.parse(jsonMatch[0])
    return (parsed.faqs || []).map((faq: { question: string; answer: string; confidence?: number }) => ({
      question: faq.question,
      answer: faq.answer,
      sourceUrl,
      confidence: faq.confidence || 0.7,
    }))
  } catch {
    console.error('[Sync] Failed to parse AI response')
    return []
  }
}

// ============================================
// Semantic Matching
// ============================================

async function findSemanticMatch(
  extracted: ExtractedFAQInfo,
  existingFaqs: ExtendedFAQ[]
): Promise<ExtendedFAQ | null> {
  // First, try simple similarity matching
  let bestMatch: ExtendedFAQ | null = null
  let bestScore = 0

  for (const faq of existingFaqs) {
    const similarity = calculateSimilarity(extracted.question, faq.question)

    if (similarity > bestScore && similarity > 0.5) {
      bestScore = similarity
      bestMatch = faq
    }
  }

  // If we found a good match with simple similarity, return it
  if (bestMatch && bestScore > 0.7) {
    return bestMatch
  }

  // For borderline cases, use AI for semantic matching
  if (bestMatch && bestScore > 0.4) {
    const isMatch = await checkSemanticMatchWithAI(extracted.question, bestMatch.question)
    if (isMatch) {
      return bestMatch
    }
  }

  // Try AI matching for all FAQs if no good simple match
  if (!bestMatch) {
    for (const faq of existingFaqs) {
      const isMatch = await checkSemanticMatchWithAI(extracted.question, faq.question)
      if (isMatch) {
        return faq
      }
    }
  }

  return bestMatch
}

async function checkSemanticMatchWithAI(
  question1: string,
  question2: string
): Promise<boolean> {
  const { generateAIResponse } = await import('@/lib/ai-providers')

  const systemPrompt = `Du skal avgjøre om to spørsmål handler om det SAMME temaet.
Svar BARE med "JA" eller "NEI".

Eksempler:
- "Hva er åpningstidene?" og "Når har dere åpent?" = JA (samme tema)
- "Hva koster det?" og "Har dere prisliste?" = JA (samme tema)
- "Hvor ligger dere?" og "Hva er åpningstidene?" = NEI (forskjellige temaer)`

  const userMessage = `Spørsmål 1: "${question1}"
Spørsmål 2: "${question2}"

Handler disse om SAMME tema?`

  try {
    const result = await generateAIResponse(
      systemPrompt,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      { maxTokens: 10, temperature: 0 }
    )

    if (!result.success) return false

    return result.response.toUpperCase().includes('JA')
  } catch {
    return false
  }
}

// ============================================
// Utility Functions
// ============================================

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  // Word overlap similarity
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2))

  if (words1.size === 0 || words2.size === 0) return 0

  let overlap = 0
  words1.forEach(word => {
    if (words2.has(word)) overlap++
  })

  return overlap / Math.max(words1.size, words2.size)
}

function isSimilarContent(content1: string, content2: string): boolean {
  const similarity = calculateSimilarity(content1, content2)
  return similarity > 0.8
}

// ============================================
// Export
// ============================================

export { calculateSimilarity, isSimilarContent }
