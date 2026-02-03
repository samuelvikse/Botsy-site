import * as cheerio from 'cheerio'
import type { ScrapedContent } from '@/types'

// Scrape a website and extract relevant content
export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Botsy/1.0; +https://botsy.no)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'no,nb,nn,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Kunne ikke hente nettsiden: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  // Extract title
  const title = $('title').text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    ''

  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    ''

  // Extract footer content BEFORE removing it
  let footerContent = ''
  $('footer, .footer, #footer, [role="contentinfo"]').each((_, el) => {
    footerContent += $(el).text().trim() + ' '
  })
  footerContent = cleanText(footerContent)

  // Extract FAQ content specifically
  const { faqContent, rawFaqs } = extractFAQs($)

  // Now remove unwanted elements for main content extraction
  $('script, style, noscript, iframe, .cookie, .popup, .modal, .ad, .advertisement').remove()

  // Extract headings
  const headings: string[] = []
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text)
    }
  })

  // Extract main content
  let mainContent = ''
  const contentSelectors = [
    'main',
    '[role="main"]',
    'article',
    '.content',
    '.main-content',
    '#content',
    '#main',
    '.page-content',
    'body',
  ]

  for (const selector of contentSelectors) {
    const element = $(selector)
    if (element.length > 0) {
      mainContent = element.text().trim()
      if (mainContent.length > 100) {
        break
      }
    }
  }

  mainContent = cleanText(mainContent)

  // Extract links (for potential further scraping)
  const links: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const absoluteUrl = new URL(href, url).href
        if (absoluteUrl.startsWith(new URL(url).origin)) {
          links.push(absoluteUrl)
        }
      } catch {
        // Invalid URL, skip
      }
    }
  })

  const uniqueLinks = [...new Set(links)].slice(0, 30)

  return {
    url,
    title,
    metaDescription,
    headings: headings.slice(0, 25),
    mainContent: mainContent.slice(0, 15000),
    links: uniqueLinks,
    footerContent: footerContent.slice(0, 3000),
    faqContent: faqContent.slice(0, 5000),
    rawFaqs,
  }
}

// Extract FAQ content from the page
function extractFAQs($: cheerio.CheerioAPI): { faqContent: string; rawFaqs: Array<{ question: string; answer: string }> } {
  const rawFaqs: Array<{ question: string; answer: string }> = []
  let faqContent = ''

  // Common FAQ selectors
  const faqSelectors = [
    '.faq',
    '#faq',
    '.faqs',
    '#faqs',
    '.frequently-asked-questions',
    '[class*="faq"]',
    '[id*="faq"]',
    '.accordion',
    '[class*="accordion"]',
    '.questions',
    '.qa',
    '[itemtype*="FAQPage"]',
    '[itemtype*="Question"]',
  ]

  // Try to find FAQ sections
  for (const selector of faqSelectors) {
    $(selector).each((_, section) => {
      faqContent += $(section).text().trim() + '\n\n'
    })
  }

  // Look for structured FAQ data (Schema.org)
  $('[itemtype*="Question"]').each((_, el) => {
    const question = $(el).find('[itemprop="name"]').text().trim()
    const answer = $(el).find('[itemprop="acceptedAnswer"], [itemprop="text"]').text().trim()
    if (question && answer) {
      rawFaqs.push({ question, answer: cleanText(answer) })
    }
  })

  // Look for common Q&A patterns
  // Pattern 1: dt/dd lists
  $('dl').each((_, dl) => {
    $(dl).find('dt').each((i, dt) => {
      const question = $(dt).text().trim()
      const answer = $(dl).find('dd').eq(i).text().trim()
      if (question && answer && question.length < 200) {
        rawFaqs.push({ question, answer: cleanText(answer) })
      }
    })
  })

  // Pattern 2: Accordion items
  $('.accordion-item, .accordion__item, [class*="accordion-item"]').each((_, item) => {
    const question = $(item).find('.accordion-header, .accordion-title, button, h3, h4').first().text().trim()
    const answer = $(item).find('.accordion-body, .accordion-content, .accordion-panel, [class*="content"], [class*="body"]').first().text().trim()
    if (question && answer && question.length < 200) {
      rawFaqs.push({ question, answer: cleanText(answer) })
    }
  })

  // Pattern 3: Questions with ? in headings followed by content
  $('h2, h3, h4, h5').each((_, heading) => {
    const text = $(heading).text().trim()
    if (text.includes('?') && text.length < 150) {
      const nextContent = $(heading).next('p, div').text().trim()
      if (nextContent && nextContent.length > 20) {
        rawFaqs.push({ question: text, answer: cleanText(nextContent) })
      }
    }
  })

  // Deduplicate FAQs
  const seen = new Set<string>()
  const uniqueFaqs = rawFaqs.filter(faq => {
    const key = faq.question.toLowerCase().slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    faqContent: cleanText(faqContent),
    rawFaqs: uniqueFaqs.slice(0, 20),
  }
}

// Clean and normalize text content
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Format scraped content for AI analysis
export function formatForAnalysis(content: ScrapedContent): string {
  let formatted = ''

  if (content.title) {
    formatted += `Tittel: ${content.title}\n\n`
  }

  if (content.metaDescription) {
    formatted += `Meta-beskrivelse: ${content.metaDescription}\n\n`
  }

  if (content.headings.length > 0) {
    formatted += `Overskrifter på siden:\n${content.headings.map(h => `- ${h}`).join('\n')}\n\n`
  }

  if (content.mainContent) {
    formatted += `Hovedinnhold:\n${content.mainContent}\n\n`
  }

  if (content.footerContent) {
    formatted += `Footer/bunntekst:\n${content.footerContent}\n\n`
  }

  if (content.faqContent) {
    formatted += `FAQ-seksjoner funnet:\n${content.faqContent}\n\n`
  }

  if (content.rawFaqs && content.rawFaqs.length > 0) {
    formatted += `Ekstraherte spørsmål og svar:\n`
    content.rawFaqs.forEach((faq, i) => {
      formatted += `${i + 1}. Spørsmål: ${faq.question}\n   Svar: ${faq.answer}\n\n`
    })
  }

  return formatted.trim()
}

// Scrape multiple pages for comprehensive analysis
export async function scrapeWithFAQPage(baseUrl: string): Promise<{
  mainContent: ScrapedContent
  faqPage?: ScrapedContent
  aboutPage?: ScrapedContent
  servicesPage?: ScrapedContent
  contactPage?: ScrapedContent
  pricingPage?: ScrapedContent
}> {
  // Ensure URL has protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl
  }

  const origin = new URL(baseUrl).origin

  // Scrape main page first
  const mainContent = await scrapeWebsite(baseUrl)

  // Helper to find page by paths or links
  const findPage = async (
    paths: string[],
    linkKeywords: string[],
    minLength = 200
  ): Promise<ScrapedContent | undefined> => {
    // Try direct paths first
    for (const path of paths) {
      try {
        const url = origin + path
        const page = await scrapeWebsite(url)
        if (page.mainContent.length > minLength || (page.rawFaqs && page.rawFaqs.length > 0)) {
          return page
        }
      } catch {
        // Page doesn't exist at this path
      }
    }

    // Check links from main page
    for (const link of mainContent.links) {
      const lowerLink = link.toLowerCase()
      if (linkKeywords.some(kw => lowerLink.includes(kw))) {
        try {
          const page = await scrapeWebsite(link)
          if (page.mainContent.length > minLength || (page.rawFaqs && page.rawFaqs.length > 0)) {
            return page
          }
        } catch {
          // Skip
        }
      }
    }

    return undefined
  }

  // Scrape all relevant pages in parallel for speed
  const [faqPage, aboutPage, servicesPage, contactPage, pricingPage] = await Promise.all([
    // FAQ page
    findPage(
      ['/faq', '/ofte-stilte-sporsmal', '/sporsmal-og-svar', '/hjelp', '/help', '/support', '/kundeservice'],
      ['faq', 'sporsmal', 'hjelp', 'help', 'support']
    ),
    // About page
    findPage(
      ['/om-oss', '/about', '/about-us', '/om', '/hvem-er-vi', '/historie', '/var-historie'],
      ['om-oss', 'about', 'hvem', 'historie']
    ),
    // Services page
    findPage(
      ['/tjenester', '/services', '/hva-vi-gjor', '/losninger', '/solutions', '/tilbud'],
      ['tjeneste', 'service', 'losning', 'solution', 'tilbud']
    ),
    // Contact page
    findPage(
      ['/kontakt', '/contact', '/kontakt-oss', '/contact-us', '/finn-oss'],
      ['kontakt', 'contact', 'finn-oss']
    ),
    // Pricing page
    findPage(
      ['/priser', '/pricing', '/prisliste', '/prices', '/pakker', '/abonnement', '/plans'],
      ['pris', 'price', 'pakke', 'abonnement', 'plan', 'cost', 'kost']
    ),
  ])

  return { mainContent, faqPage, aboutPage, servicesPage, contactPage, pricingPage }
}
