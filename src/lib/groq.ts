import Groq from 'groq-sdk'
import type { BusinessProfile, Instruction, OwnerChatMessage, FAQ, ToneConfig } from '@/types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const MODEL = 'llama-3.3-70b-versatile'

// Deep research prompt for website analysis
const WEBSITE_ANALYSIS_PROMPT = `Du er en ekspert merkevare-analytiker og research-spesialist. Din oppgave er å gjøre en GRUNDIG analyse av en bedrifts nettside og finne ALL viktig informasjon som kunder trenger.

ANALYSER FØLGENDE ASPEKTER (I PRIORITERT REKKEFØLGE):

1. **KONTAKTINFORMASJON** (KRITISK VIKTIG!)
   - E-postadresse(r) - søk grundig etter alle e-poster
   - Telefonnummer - alle numre (hovednummer, mobil, kundeservice)
   - Fysisk adresse - gateadresse, postnummer, by
   - Åpningstider hvis oppgitt
   - ALDRI gjett eller finn på kontaktinfo - kun det som faktisk står på siden!

2. **PRISER OG PRISLISTE** (SVÆRT VIKTIG!)
   - Let GRUNDIG etter ALL prisinformasjon på nettsiden
   - Søk i menyer, undersider, footer, "Priser"-seksjoner
   - Inkluder priser for produkter, tjenester, abonnementer, pakker
   - Inkluder timepris, fastpris, fra-priser, kampanjepriser
   - Inkluder valuta (kr, NOK, EUR, etc.)
   - Strukturer prisene tydelig med navn og pris
   - Dette er KRITISK informasjon som kunder ofte spør om!

3. **ANSATTE OG TEAM**
   - Navn på ansatte/teammedlemmer hvis oppgitt
   - Roller/stillinger
   - Spesialområder eller ekspertise
   - Dette hjelper kunder å vite hvem de kan kontakte

4. **Merkevareidentitet**
   - Hva er bedriftens kjerneverdi og unike salgsargument?
   - Hvilken bransje/sektor opererer de i?
   - Hva er deres viktigste produkter/tjenester?

5. **Kommunikasjonstone**
   Analyser språkbruken på nettsiden og avgjør:
   - Er språket formelt, vennlig, eller uformelt?
   - Gi en kort begrunnelse

6. **Målgruppe**
   - Hvem er primærmålgruppen?
   - Er det B2B, B2C, eller begge?

7. **Bransjeterminologi**
   - Hvilke faguttrykk og bransjespesifikke ord brukes?

8. **FAQ og vanlige spørsmål**
   - Identifiser alle spørsmål og svar du finner
   - Strukturer dem som klare Q&A-par

9. **Språk**
   - Identifiser hovedspråket på nettsiden
   - Bruk ISO 639-1 koder (no, en, sv, da, de, fr, es, etc.)

Returner ALLTID gyldig JSON med denne strukturen:
{
  "businessName": "Bedriftens navn",
  "industry": "Bransje/sektor",
  "contactInfo": {
    "email": "epost@bedrift.no (eller null hvis ikke funnet)",
    "phone": "+47 12345678 (eller null hvis ikke funnet)",
    "address": "Gateadresse 1, 0000 By (eller null hvis ikke funnet)",
    "openingHours": "Man-Fre 09-17 (eller null hvis ikke funnet)"
  },
  "pricing": [
    {"item": "Produkt/tjeneste navn", "price": "Pris med valuta (f.eks. '299 kr', 'fra 599 kr/mnd')"},
    {"item": "Annet produkt", "price": "Pris"}
  ],
  "staff": [
    {"name": "Ansatt navn", "role": "Stilling/rolle", "specialty": "Spesialområde (valgfritt)"}
  ],
  "tone": "formal" | "friendly" | "casual",
  "toneReason": "Begrunnelse på 1-2 setninger for hvorfor denne tonen passer",
  "language": "ISO 639-1 språkkode (f.eks. 'no', 'en', 'sv')",
  "languageName": "Menneskelesbart språknavn (f.eks. 'Norsk', 'English', 'Svenska')",
  "targetAudience": "Beskrivelse av målgruppen",
  "brandPersonality": "2-3 adjektiver som beskriver merkevaren",
  "services": ["tjeneste1", "tjeneste2"],
  "products": ["produkt1", "produkt2"],
  "terminology": ["faguttrykk1", "faguttrykk2"],
  "description": "2-3 setninger som oppsummerer bedriften",
  "faqs": [
    {"question": "Spørsmål 1?", "answer": "Svar 1"},
    {"question": "Spørsmål 2?", "answer": "Svar 2"}
  ]
}

VIKTIG:
- Svar KUN med gyldig JSON, ingen annen tekst
- Bruk norsk språk i alle verdier (unntatt e-poster/tlf/adresser - behold nøyaktig)
- Hvis du ikke finner informasjon, bruk tomme arrays [] eller null
- ALDRI gjett eller finn på kontaktinfo, priser, eller ansatte!
- Inkluder ALLE FAQs du finner på nettsiden
- Let GRUNDIG etter priser - dette er det kundene spør mest om!`

// System prompt for owner chat
const OWNER_CHAT_PROMPT = `Du er Botsy, en hjelpsom digital assistent som hjelper bedriftseiere med å sette opp kundeservice.

DU KAN GJØRE DISSE TINGENE FOR EIEREN:

1. **LEGGE TIL FAQs I KUNNSKAPSBASEN**
   Når eieren vil legge til informasjon som kunder ofte spør om:
   - "Legg til en FAQ om..."
   - "Husk at vi tilbyr..."
   - "Kunder bør vite at..."
   - Informasjon om produkter, tjenester, priser, åpningstider, etc.

   Svar med JSON-markør: [FAQ:{"question":"Spørsmålet","answer":"Svaret"}]
   Etterfulgt av: "Skal jeg legge dette til i kunnskapsbasen din?"

2. **LEGGE TIL INSTRUKSJONER**
   Når eieren gir tidsbegrensede eller spesielle instrukser:
   - "Vi er stengt i morgen"
   - "Vi har 20% rabatt denne uken"
   - "Kampanje: ..."

   Svar med JSON-markør: [INSTRUCTION:{"content":"Innholdet","category":"promotion|availability|policy|general"}]
   Etterfulgt av: "Skal jeg legge dette til i instruksjoner så det blir delt med alle som spør Botsy?"

3. **SYNKRONISERE FAQs FRA DOKUMENTER**
   Når eieren spør om å overføre/synkronisere FAQs fra dokumenter:
   - "Overfør FAQs fra dokumenter"
   - "Synkroniser kunnskapsbasen"
   - "Hent FAQs fra opplastede dokumenter"

   Svar med: [SYNC_FAQS]
   Etterfulgt av: "Skal jeg synkronisere alle FAQs fra dine opplastede dokumenter til kunnskapsbasen?"

4. **EKSPORTERE DATA TIL EXCEL**
   Når eieren ber om å laste ned eller eksportere data:
   - "Last ned analysedata", "Eksporter statistikk", "Gi meg analyseskjema" → Svar med: [EXPORT:analytics]
   - "Last ned kontaktliste", "Eksporter kontakter", "Hvem har kontaktet oss" → Svar med: [EXPORT:contacts]

   For eksport: Ikke spør om bekreftelse, bare start nedlastingen med en gang!

5. **BEKREFTELSE**
   Når eieren svarer "ja", "ok", "gjør det", "bekreft", etc. på en av handlingene over (unntatt eksport),
   inkluder [CONFIRMED] i starten av svaret ditt.

VIKTIG:
- Svar alltid vennlig og naturlig på norsk
- Hold svarene korte og konsise
- Spør om bekreftelse for FAQ, instruksjoner og synkronisering
- For eksport: Start nedlastingen direkte uten å spørre
- Bruk riktig JSON-format for handlinger`

// Prompt for finding answers to FAQ questions
const FAQ_ANSWER_PROMPT = `Du er en ekspert på å finne svar i nettside-innhold.

Gitt følgende innhold fra en nettside, finn svaret på brukerens spørsmål.
Hvis svaret finnes i innholdet, gi et klart og konsist svar.
Hvis svaret IKKE finnes, si tydelig "Jeg fant ikke svaret på dette spørsmålet på nettsiden."

Formater svaret naturlig og vennlig, som om du svarer en kunde.
Svar på norsk.`

// Prompt for reformulating user answers
const REFORMULATE_PROMPT = `Du er en ekspert på kundeservice-kommunikasjon.

Ta brukerens svar og omformuler det slik at det:
1. Er skrevet i en vennlig, profesjonell tone
2. Er klart og lett å forstå
3. Passer som et kundeservice-svar

Behold all faktisk informasjon, men gjør språket bedre.
Svar KUN med det omformulerte svaret, ingen annen tekst.
Svar på norsk.`

export interface ContactInfo {
  email: string | null
  phone: string | null
  address: string | null
  openingHours: string | null
}

export interface StaffMember {
  name: string
  role: string
  specialty?: string
}

export interface AnalysisResult {
  businessName: string
  industry: string
  contactInfo: ContactInfo
  pricing: Array<{ item: string; price: string }>
  staff: StaffMember[]
  tone: 'formal' | 'friendly' | 'casual'
  toneReason: string
  language: string
  languageName: string
  targetAudience: string
  brandPersonality: string
  services: string[]
  products: string[]
  terminology: string[]
  description: string
  faqs: Array<{ question: string; answer: string }>
}

// Analyze website content using Groq
export async function analyzeWebsiteContent(
  content: string,
  businessName: string
): Promise<AnalysisResult> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: WEBSITE_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: `Bedriftsnavn oppgitt av eier: ${businessName}

NETTSIDE-INNHOLD TIL ANALYSE:
---
${content}
---

Gjør en grundig analyse og returner JSON.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  })

  const responseText = response.choices[0]?.message?.content || '{}'

  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText
    const parsed = JSON.parse(jsonStr)

    return {
      businessName: parsed.businessName || businessName,
      industry: parsed.industry || 'Ukjent',
      contactInfo: {
        email: parsed.contactInfo?.email || null,
        phone: parsed.contactInfo?.phone || null,
        address: parsed.contactInfo?.address || null,
        openingHours: parsed.contactInfo?.openingHours || null,
      },
      pricing: parsed.pricing || [],
      staff: parsed.staff || [],
      tone: parsed.tone || 'friendly',
      toneReason: parsed.toneReason || 'Basert på innholdet virker en vennlig tone passende.',
      language: parsed.language || 'no',
      languageName: parsed.languageName || 'Norsk',
      targetAudience: parsed.targetAudience || '',
      brandPersonality: parsed.brandPersonality || '',
      services: parsed.services || [],
      products: parsed.products || [],
      terminology: parsed.terminology || [],
      description: parsed.description || '',
      faqs: parsed.faqs || [],
    }
  } catch {
    return {
      businessName,
      industry: 'Ukjent',
      contactInfo: {
        email: null,
        phone: null,
        address: null,
        openingHours: null,
      },
      pricing: [],
      staff: [],
      tone: 'friendly',
      toneReason: 'Standard vennlig tone anbefales.',
      language: 'no',
      languageName: 'Norsk',
      targetAudience: '',
      brandPersonality: '',
      services: [],
      products: [],
      terminology: [],
      description: '',
      faqs: [],
    }
  }
}

// Find answer to a FAQ question from website content
export async function findFAQAnswer(
  question: string,
  websiteContent: string
): Promise<{ found: boolean; answer: string }> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: FAQ_ANSWER_PROMPT,
      },
      {
        role: 'user',
        content: `NETTSIDE-INNHOLD:
---
${websiteContent.slice(0, 12000)}
---

SPØRSMÅL: ${question}

Finn svaret på dette spørsmålet basert på innholdet over.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  })

  const answer = response.choices[0]?.message?.content || ''
  const notFound = answer.toLowerCase().includes('fant ikke') ||
                   answer.toLowerCase().includes('ikke funnet') ||
                   answer.toLowerCase().includes('ikke svaret')

  return {
    found: !notFound,
    answer: answer.trim(),
  }
}

// Reformulate a user-provided answer to be more professional
export async function reformulateAnswer(
  question: string,
  userAnswer: string,
  tone: 'formal' | 'friendly' | 'casual'
): Promise<string> {
  const toneDescription = tone === 'formal'
    ? 'formell og profesjonell'
    : tone === 'casual'
    ? 'uformell og avslappet'
    : 'vennlig men profesjonell'

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: REFORMULATE_PROMPT,
      },
      {
        role: 'user',
        content: `SPØRSMÅL: ${question}

BRUKERENS SVAR: ${userAnswer}

ØNSKET TONE: ${toneDescription}

Omformuler svaret slik at det passer som et kundeservice-svar med ${toneDescription} tone.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content?.trim() || userAnswer
}

// Types for owner chat response
interface OwnerChatResult {
  reply: string
  shouldCreateInstruction: boolean
  suggestedInstruction?: Partial<Instruction>
  shouldCreateFAQ: boolean
  suggestedFAQ?: { question: string; answer: string }
  shouldSyncFAQs: boolean
  isConfirmation: boolean
  exportType?: 'analytics' | 'contacts'
}

// Chat with owner for instruction management
export async function chatWithOwner(
  message: string,
  history: OwnerChatMessage[],
  businessProfile: BusinessProfile | null,
  activeInstructions: Instruction[]
): Promise<OwnerChatResult> {
  let context = ''

  if (businessProfile) {
    context += `\nBedriftsprofil:
- Navn: ${businessProfile.businessName}
- Bransje: ${businessProfile.industry}
- Tone: ${businessProfile.tone}
- Beskrivelse: ${businessProfile.description}`
  }

  if (activeInstructions.length > 0) {
    context += `\n\nAktive instruksjoner (${activeInstructions.length}):`
    activeInstructions.slice(0, 5).forEach((inst, i) => {
      context += `\n${i + 1}. [${inst.category}] ${inst.content.substring(0, 100)}...`
    })
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: OWNER_CHAT_PROMPT + context,
    },
  ]

  history.slice(-10).forEach((msg) => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })
  })

  messages.push({
    role: 'user',
    content: message,
  })

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 500,
  })

  let reply = response.choices[0]?.message?.content || 'Beklager, jeg kunne ikke behandle forespørselen.'

  // Parse response for action markers
  let shouldCreateFAQ = false
  let suggestedFAQ: { question: string; answer: string } | undefined
  let shouldCreateInstruction = false
  let suggestedInstruction: Partial<Instruction> | undefined
  let shouldSyncFAQs = false
  const isConfirmation = reply.includes('[CONFIRMED]')

  // Check for FAQ marker
  const faqMatch = reply.match(/\[FAQ:(\{[^}]*\})\]/)
  if (faqMatch) {
    try {
      suggestedFAQ = JSON.parse(faqMatch[1])
      shouldCreateFAQ = true
      reply = reply.replace(faqMatch[0], '').trim()
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Check for instruction marker
  const instructionMatch = reply.match(/\[INSTRUCTION:(\{[^}]*\})\]/)
  if (instructionMatch) {
    try {
      const parsed = JSON.parse(instructionMatch[1])
      suggestedInstruction = {
        content: parsed.content,
        category: parsed.category || 'general',
        priority: 'medium',
        isActive: true,
      }
      shouldCreateInstruction = true
      reply = reply.replace(instructionMatch[0], '').trim()
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Check for sync FAQs marker
  if (reply.includes('[SYNC_FAQS]')) {
    shouldSyncFAQs = true
    reply = reply.replace('[SYNC_FAQS]', '').trim()
  }

  // Check for export markers
  let exportType: 'analytics' | 'contacts' | undefined = undefined
  const exportMatch = reply.match(/\[EXPORT:(analytics|contacts)\]/)
  if (exportMatch) {
    exportType = exportMatch[1] as 'analytics' | 'contacts'
    reply = reply.replace(exportMatch[0], '').trim()
  }

  // Clean up confirmation marker
  if (isConfirmation) {
    reply = reply.replace('[CONFIRMED]', '').trim()
  }

  return {
    reply,
    shouldCreateInstruction,
    suggestedInstruction,
    shouldCreateFAQ,
    suggestedFAQ,
    shouldSyncFAQs,
    isConfirmation,
    exportType,
  }
}

// Generate a friendly summary of the analysis
export async function generateAnalysisSummary(
  profile: AnalysisResult,
  faqCount: number
): Promise<string> {
  const toneNorsk = profile.tone === 'formal' ? 'formell' : profile.tone === 'casual' ? 'uformell' : 'vennlig'

  let summary = `Jeg har tatt en grundig kikk på ${profile.businessName}! `

  if (profile.industry && profile.industry !== 'Ukjent') {
    summary += `Dere jobber innen ${profile.industry.toLowerCase()}. `
  }

  if (profile.description) {
    summary += profile.description + ' '
  }

  summary += `\n\nJeg anbefaler at jeg bruker en ${toneNorsk} tone når jeg snakker med kundene deres`
  if (profile.toneReason) {
    summary += ` - ${profile.toneReason.toLowerCase()}`
  }

  if (faqCount > 0) {
    summary += `\n\nJeg fant ${faqCount} spørsmål og svar på nettsiden som jeg kan bruke til å hjelpe kundene deres.`
  }

  summary += '\n\nStemmer dette? Du kan justere alt hvis noe ikke er helt riktig!'

  return summary
}

// ============================================
// Customer Chatbot
// ============================================

interface KnowledgeData {
  faqs: Array<{ question: string; answer: string }>
  rules: string[]
  policies: string[]
  importantInfo: string[]
  uploadedAt?: Date
  fileName?: string
}

interface CustomerChatContext {
  businessProfile: BusinessProfile
  faqs: FAQ[]
  instructions: Instruction[]
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  knowledgeDocuments?: KnowledgeData[]
}

function buildIndustryExpertise(industry: string | undefined): string {
  // Handle undefined or empty industry
  if (!industry) {
    return `Du har generell forståelse for kundeservice og kan svare på vanlige spørsmål om:
- Tjenester og produkter
- Priser og tilgjengelighet
- Bestilling og kontakt
- Åpningstider og lokasjon`
  }

  // Generate industry-specific expertise and knowledge
  const industryExpertise: Record<string, string> = {
    'Restaurant': `Du har dyp kunnskap om restaurantbransjen, inkludert:
- Matallergier og spesialkost (gluten, laktose, nøtter, vegetarisk, vegansk)
- Reservasjonsprosesser og bordbestilling
- Åpningstider og travle perioder
- Takeaway og levering
- Menysammensetning og anbefalinger`,
    'Eiendom': `Du har dyp kunnskap om eiendomsbransjen, inkludert:
- Kjøps- og salgsprosesser
- Verdivurdering og prisestimater
- Finansiering og boliglån
- Leiekontrakter og utleie
- Boligtyper og nabolag`,
    'Helse': `Du har dyp kunnskap om helsebransjen, inkludert:
- Timebestilling og ventetider
- Henvisningsrutiner
- Forsikringsdekning (Helfo, private)
- Resepter og medisinering
- Personvern og pasientrettigheter`,
    'Teknologi': `Du har dyp kunnskap om teknologibransjen, inkludert:
- Programvare og lisenser
- Support og feilsøking
- Integrasjoner og kompatibilitet
- Sikkerhet og personvern
- Oppdateringer og vedlikehold`,
    'Butikk': `Du har dyp kunnskap om detaljhandel, inkludert:
- Lagerstatus og tilgjengelighet
- Frakt og leveringstider
- Returrett og reklamasjon
- Størrelsesguider og produktinfo
- Betalingsmuligheter`,
    'Hotell': `Du har dyp kunnskap om hotellbransjen, inkludert:
- Romtyper og fasiliteter
- Inn- og utsjekk-tider
- Avbestillingsregler
- Ekstra tjenester (frokost, parkering, spa)
- Lokal turisme og attraksjoner`,
    'Treningssenter': `Du har dyp kunnskap om treningsbransjen, inkludert:
- Medlemskap og priser
- Treningsopplegg og klasser
- Åpningstider og kapasitet
- Personlig trening
- Garderobe og fasiliteter`,
    'Frisør': `Du har dyp kunnskap om frisørbransjen, inkludert:
- Timebestilling og behandlingstid
- Prislister og tjenester
- Produktanbefalinger
- Stilrådgivning
- Allergi og produktsensitivitet`,
  }

  // Find matching industry or return generic expertise
  const matchedIndustry = Object.keys(industryExpertise).find(
    key => industry.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(industry.toLowerCase())
  )

  if (matchedIndustry) {
    return industryExpertise[matchedIndustry]
  }

  // Generic industry expertise
  return `Du har god forståelse for ${industry || 'denne'}-bransjen og kan svare på vanlige spørsmål om:
- Tjenester og produkter
- Priser og tilgjengelighet
- Bestilling og kontakt
- Åpningstider og lokasjon
- Vanlige bransjespørsmål`
}

export function buildToneConfiguration(tone: string, toneConfig?: ToneConfig): string {
  // Base tone guide
  let toneGuide = tone === 'formal'
    ? 'Bruk formelt språk, vær profesjonell og respektfull. Unngå slang og uformelle uttrykk.'
    : tone === 'casual'
    ? 'Vær avslappet og uformell, bruk hverdagslig språk. Du kan være litt humoristisk.'
    : 'Vær vennlig og imøtekommende, men fortsatt profesjonell. Bruk "du" og vær personlig.'

  // Add custom tone configuration if available
  if (toneConfig) {
    // Response length configuration
    if (toneConfig.responseLength) {
      const lengthGuide = toneConfig.responseLength === 'short'
        ? '\n\nSVARLENGDE: Hold svarene KORTE og konsise - maks 1-2 setninger. Rett på sak, ingen unødvendig informasjon.'
        : toneConfig.responseLength === 'detailed'
        ? '\n\nSVARLENGDE: Gi DETALJERTE og grundige svar. Forklar godt og inkluder relevant tilleggsinformasjon. 4-6 setninger er passende.'
        : '\n\nSVARLENGDE: Hold svarene BALANSERT - 2-3 setninger er ideelt. Gi nok informasjon uten å være for ordrik.'
      toneGuide += lengthGuide
    }

    // Humor level configuration
    if (toneConfig.humorLevel) {
      const humorGuide = toneConfig.humorLevel === 'none'
        ? '\n\nHUMOR: Vær alltid seriøs og profesjonell. Ingen humor eller morsomheter.'
        : toneConfig.humorLevel === 'subtle'
        ? '\n\nHUMOR: Du kan være lett og vennlig, men hold det subtilt. Ingen åpenbare vitser.'
        : toneConfig.humorLevel === 'moderate'
        ? '\n\nHUMOR: Bruk moderat humor når det passer. En vennlig vits eller lett kommentar er ok.'
        : '\n\nHUMOR: Vær leken og morsom! Bruk gjerne humor, emojis og morsomme kommentarer.'
      toneGuide += humorGuide
    }

    if (toneConfig.customInstructions) {
      toneGuide += `\n\nEKSTRA TONE-INSTRUKSJONER FRA EIER:\n${toneConfig.customInstructions}`
    }

    if (toneConfig.personality) {
      toneGuide += `\n\nPERSONLIGHET: Du skal være ${toneConfig.personality}.`
    }

    if (toneConfig.avoidPhrases && toneConfig.avoidPhrases.length > 0) {
      toneGuide += `\n\nUNNGÅ DISSE UTTRYKKENE:\n- ${toneConfig.avoidPhrases.join('\n- ')}`
    }

    if (toneConfig.preferredPhrases && toneConfig.preferredPhrases.length > 0) {
      toneGuide += `\n\nFORETRUKNE UTTRYKK (bruk gjerne):\n- ${toneConfig.preferredPhrases.join('\n- ')}`
    }

    if (toneConfig.exampleResponses && toneConfig.exampleResponses.length > 0) {
      toneGuide += `\n\nEKSEMPEL PÅ GOD TONE:\n${toneConfig.exampleResponses.map((ex, i) => `${i + 1}. "${ex}"`).join('\n')}`
    }
  }

  return toneGuide
}

function buildCustomerSystemPrompt(context: CustomerChatContext, userMessageCount: number): string {
  const { businessProfile, faqs, instructions, knowledgeDocuments } = context

  const toneGuide = buildToneConfiguration(businessProfile.tone, businessProfile.toneConfig)
  const industryExpertise = buildIndustryExpertise(businessProfile.industry)

  // Build contact info section
  let contactSection = ''
  if (businessProfile.contactInfo) {
    const ci = businessProfile.contactInfo
    contactSection = `\nKONTAKTINFORMASJON (bruk NØYAKTIG som oppgitt):\n`
    if (ci.email) contactSection += `- E-post: ${ci.email}\n`
    if (ci.phone) contactSection += `- Telefon: ${ci.phone}\n`
    if (ci.address) contactSection += `- Adresse: ${ci.address}\n`
    if (ci.openingHours) contactSection += `- Åpningstider: ${ci.openingHours}\n`
  }

  // Build pricing section
  let pricingSection = ''
  if (businessProfile.pricing && businessProfile.pricing.length > 0) {
    pricingSection = `\nPRISER (VIKTIG - bruk denne informasjonen når kunder spør om priser):\n`
    businessProfile.pricing.forEach((p) => {
      pricingSection += `- ${p.item}: ${p.price}\n`
    })
  }

  // Build staff section
  let staffSection = ''
  if (businessProfile.staff && businessProfile.staff.length > 0) {
    staffSection = `\nANSATTE/TEAM:\n`
    businessProfile.staff.forEach((s) => {
      staffSection += `- ${s.name}: ${s.role}${s.specialty ? ` (${s.specialty})` : ''}\n`
    })
  }

  let prompt = `Du er en kundeservice-assistent for ${businessProfile.businessName || 'bedriften'}.

BEDRIFTSINFORMASJON:
- Bransje: ${businessProfile.industry || 'Ikke spesifisert'}
- Beskrivelse: ${businessProfile.description || 'Ingen beskrivelse tilgjengelig'}
${businessProfile.services?.length > 0 ? `- Tjenester: ${businessProfile.services.join(', ')}` : ''}
${businessProfile.products?.length > 0 ? `- Produkter: ${businessProfile.products.join(', ')}` : ''}
${contactSection}${pricingSection}${staffSection}
BRANSJEKUNNSKAP:
${industryExpertise}

KOMMUNIKASJONSSTIL:
${toneGuide}

`

  // Add FAQs as knowledge base
  if (faqs?.length > 0) {
    prompt += `\nKUNNSKAPSBASE (Spørsmål og svar):
VIKTIG OM BRUK AV KUNNSKAPSBASEN:
- ALDRI kopier svarene ordrett - bruk din egen formulering
- Forstå INNHOLDET og forklar det naturlig med egne ord
- Tilpass svaret til samtalen og kundens spørsmål
- Du kan legge til kontekst, forkorte, eller utdype etter behov
- Målet er å gi samme INFORMASJON, men med naturlig, conversational tone
- Svar som om du FORSTÅR temaet, ikke som om du leser fra et skript

Tilgjengelig kunnskap:\n`
    faqs.forEach((faq, i) => {
      prompt += `${i + 1}. Tema: ${faq.question}\n   Informasjon: ${faq.answer}\n\n`
    })
  }

  // Add knowledge from uploaded documents (sorted by newest first for priority)
  if (knowledgeDocuments && knowledgeDocuments.length > 0) {
    // Sort by uploadedAt if available (newest first)
    const sortedDocs = [...knowledgeDocuments].sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
      return dateB - dateA
    })

    prompt += `\n=== BEDRIFTSDOKUMENTER (nyeste først - PRIORITER nyere info ved konflikt) ===\n`

    for (const doc of sortedDocs) {
      const dateStr = doc.uploadedAt ? new Date(doc.uploadedAt).toISOString().split('T')[0] : 'ukjent dato'
      const fileName = doc.fileName || 'Ukjent dokument'
      prompt += `\n--- Fra dokument: ${fileName} (lastet opp: ${dateStr}) ---\n`

      if (doc.faqs.length > 0) {
        prompt += 'Kunnskap fra dokument (omformuler med egne ord):\n'
        doc.faqs.forEach((faq, i) => {
          prompt += `${i + 1}. Tema: ${faq.question}\n   Info: ${faq.answer}\n`
        })
      }

      if (doc.importantInfo.length > 0) {
        prompt += 'Viktig info:\n'
        doc.importantInfo.forEach(info => {
          prompt += `- ${info}\n`
        })
      }

      if (doc.rules.length > 0) {
        prompt += 'Regler:\n'
        doc.rules.forEach(rule => {
          prompt += `- ${rule}\n`
        })
      }

      if (doc.policies.length > 0) {
        prompt += 'Retningslinjer:\n'
        doc.policies.forEach(policy => {
          prompt += `- ${policy}\n`
        })
      }
    }

    prompt += '\n=== SLUTT PÅ DOKUMENTER ===\n'
  }

  // Add active instructions
  const activeInstructions = (instructions || []).filter(i => i.isActive)
  if (activeInstructions.length > 0) {
    prompt += `\nVIKTIGE INSTRUKSJONER FRA BEDRIFTSEIER:\n`
    activeInstructions.forEach((inst, i) => {
      const priority = inst.priority === 'high' ? '(HØYT PRIORITERT)' : ''
      prompt += `${i + 1}. ${priority} ${inst.content}\n`
    })
  }

  // Get language settings
  const websiteLanguage = businessProfile.language || 'no'
  const websiteLanguageName = businessProfile.languageName || 'Norsk'

  prompt += `
SPRÅKHÅNDTERING:
- Nettsidens primærspråk er: ${websiteLanguageName} (${websiteLanguage})
- Som standard skal du svare på ${websiteLanguageName}
- VIKTIG: Hvis kunden skriver på et ANNET språk enn ${websiteLanguageName}, SKAL du automatisk bytte til kundens språk
  - Eksempel: Hvis nettsiden er norsk men kunden skriver på engelsk, svar på engelsk
  - Eksempel: Hvis nettsiden er engelsk men kunden skriver på spansk, svar på spansk
- Du må forstå og kunne svare på alle vanlige språk (norsk, engelsk, svensk, dansk, tysk, fransk, spansk, etc.)
- Tilpass også tone og uttrykk til det aktuelle språket - ikke bare oversett ordrett

REGLER:
1. Følg svarlengde-innstillingene i KOMMUNIKASJONSSTIL-seksjonen nøye
2. Hvis du ikke vet svaret, si det ærlig og tilby å sette kunden i kontakt med en person
3. Følg alltid instruksjonene fra bedriftseieren
4. Vær hjelpsom og løsningsorientert
5. Hvis kunden virker frustrert, vis empati
6. Ikke finn på informasjon - hold deg til det du vet om bedriften
7. KRITISK: ALDRI oversett eller endre følgende - de skal gjengis NØYAKTIG som de er:
   - E-postadresser (f.eks. contact@example.no skal IKKE bli kontakt@example.no)
   - Fysiske adresser (gatenavn, stedsnavn)
   - Personnavn og bedriftsnavn
   - Telefonnumre
   - URLer og nettsideadresser
   - Produktnavn og merkenavn
8. VIKTIG - SPØRSMÅL UTENFOR NISJEN: Hvis kunden spør om noe som tydelig IKKE har med ${businessProfile.businessName}, ${businessProfile.industry}-bransjen, eller bedriftens tjenester/produkter å gjøre (f.eks. oppskrifter til en bilforhandler, politiske spørsmål, generelle trivia, personlige råd osv.), skal du vennlig si at det er ikke noe du er her for å svare på, men at du gjerne hjelper med spørsmål om ${businessProfile.businessName} og deres tjenester. Vær høflig og vennlig, ikke avvisende.
9. KRITISK - DU KAN BARE SENDE TEKSTMELDINGER:
   - Du kan IKKE sende bilder, filer, dokumenter, PDF-er, eller vedlegg
   - ALDRI si "jeg sender deg...", "her kommer...", "jeg legger ved...", "se vedlagt..."
   - ALDRI lov å sende noe i en separat melding
   - Gi informasjon direkte i svaret ditt
10. EKSTREMT VIKTIG - ALDRI FINN PÅ INFORMASJON:
   - ALDRI dikter opp priser, tall, åpningstider, eller fakta som du ikke har fått oppgitt
   - Hvis du IKKE har prisinformasjon: Si "Jeg har dessverre ikke prisinformasjon tilgjengelig. Ta kontakt med oss direkte for priser."
   - Hvis du IKKE vet svaret: Si det ærlig - ALDRI GJETT eller finn på noe
   - Bruk KUN informasjon som er eksplisitt gitt til deg i PRISER-seksjonen eller dokumentene
   - Det er MYE bedre å si "jeg vet ikke" enn å gi feil informasjon
   - Feil informasjon ødelegger tilliten til bedriften!
11. PRIORITERING AV INFORMASJON:
   - Hvis det er motstridende informasjon om samme tema, BRUK ALLTID den NYESTE informasjonen
   - Dokumenter merket med nyere dato overskriver eldre dokumenter
   - Nyere instruksjoner og regler overskriver eldre
   - Ved tvil, bruk informasjonen som er oppgitt senest
12. E-POST OPPSUMMERING (tilpass språket til kundens språk):
    - Hvis kunden spør om å få samtalen/chatten på e-post, svar NØYAKTIG: "[EMAIL_REQUEST]" etterfulgt av en melding på kundens språk som ber om e-postadresse
    - ${userMessageCount >= 5 ? 'Hvis kunden sier "takk", "tusen takk", "takk for hjelpen", "det var alt", "ha det", "bye", "thanks", "thank you", eller lignende avsluttende fraser, avslutt svaret ditt med "[OFFER_EMAIL]" etterfulgt av et tilbud om e-postoppsummering på kundens språk' : 'IKKE tilby e-postoppsummering automatisk - samtalen er for kort. Du kan fortsatt svare hvis kunden eksplisitt ber om det.'}

Svar nå på kundens melding.`

  return prompt
}

export async function chatWithCustomer(
  message: string,
  context: CustomerChatContext
): Promise<string> {
  // Count user messages in conversation history (including current message)
  const userMessageCount = context.conversationHistory.filter(msg => msg.role === 'user').length + 1

  const systemPrompt = buildCustomerSystemPrompt(context, userMessageCount)

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

  // Add conversation history (last 10 messages)
  context.conversationHistory.slice(-10).forEach((msg) => {
    if (!msg.content?.trim()) return

    messages.push({
      role: msg.role,
      content: msg.content.trim(),
    })
  })

  // Add current message
  messages.push({
    role: 'user',
    content: message,
  })

  // Use Gemini (primary) with Groq fallback
  const { generateAIResponse } = await import('./ai-providers')
  const result = await generateAIResponse(systemPrompt, messages, { maxTokens: 400, temperature: 0.7 })

  if (result.success) {
    console.log(`[Chat] Response from ${result.provider}, length: ${result.response.length}`)
    return result.response.trim()
  }

  return 'Beklager, jeg kunne ikke behandle meldingen din. Prøv igjen eller kontakt oss direkte.'
}
