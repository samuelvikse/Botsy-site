import Groq from 'groq-sdk'
import type { BusinessProfile, Instruction, OwnerChatMessage, FAQ, ToneConfig } from '@/types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const MODEL = 'llama-3.3-70b-versatile'

// Deep research prompt for website analysis
const WEBSITE_ANALYSIS_PROMPT = `Du er en ekspert merkevare-analytiker og research-spesialist. Din oppgave er å gjøre en grundig analyse av en bedrifts nettside for å forstå merkevaren, tonen, målgruppen og kommunikasjonsstilen deres.

ANALYSER FØLGENDE ASPEKTER:

1. **Merkevareidentitet**
   - Hva er bedriftens kjerneverdi og unike salgsargument?
   - Hvilken bransje/sektor opererer de i?
   - Hva er deres viktigste produkter/tjenester?

2. **Kommunikasjonstone** (VIKTIG - gi en begrunnet anbefaling)
   Analyser språkbruken på nettsiden og avgjør:
   - Er språket formelt (akademisk, profesjonelt, distansert)?
   - Er språket vennlig (personlig men profesjonelt, imøtekommende)?
   - Er språket uformelt (hverdagslig, avslappet, kanskje med humor)?

   Gi en BEGRUNNELSE for anbefalingen basert på:
   - Ordvalg og setningsstruktur
   - Bruk av "du/dere" vs "vi"
   - Eventuell bruk av emojis, humor eller uformelle uttrykk
   - Bransjenormer

3. **Målgruppe**
   - Hvem ser ut til å være primærmålgruppen?
   - Er det B2B, B2C, eller begge?

4. **Bransjeterminologi**
   - Hvilke faguttrykk og bransjespesifikke ord brukes?

5. **FAQ og vanlige spørsmål**
   - Identifiser alle spørsmål og svar du finner
   - Strukturer dem som klare Q&A-par

Returner ALLTID gyldig JSON med denne strukturen:
{
  "businessName": "Bedriftens navn",
  "industry": "Bransje/sektor",
  "tone": "formal" | "friendly" | "casual",
  "toneReason": "Begrunnelse på 1-2 setninger for hvorfor denne tonen passer",
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
- Bruk norsk språk i alle verdier
- Hvis du ikke finner informasjon, bruk tomme arrays [] eller null
- Inkluder ALLE FAQs du finner på nettsiden`

// System prompt for owner chat
const OWNER_CHAT_PROMPT = `Du er Botsy, en hjelpsom digital assistent som hjelper bedriftseiere med å sette opp kundeservice.

Når eieren gir deg en instruks eller informasjon:
1. Bekreft at du har forstått
2. Spør om relevante detaljer (varighet, betingelser, unntak)
3. Foreslå å opprette en strukturert instruks

Vær vennlig, hjelpsom og snakk naturlig på norsk. Hold svarene korte.`

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

export interface AnalysisResult {
  businessName: string
  industry: string
  tone: 'formal' | 'friendly' | 'casual'
  toneReason: string
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
      tone: parsed.tone || 'friendly',
      toneReason: parsed.toneReason || 'Basert på innholdet virker en vennlig tone passende.',
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
      tone: 'friendly',
      toneReason: 'Standard vennlig tone anbefales.',
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

// Chat with owner for instruction management
export async function chatWithOwner(
  message: string,
  history: OwnerChatMessage[],
  businessProfile: BusinessProfile | null,
  activeInstructions: Instruction[]
): Promise<{ reply: string; shouldCreateInstruction: boolean; suggestedInstruction?: Partial<Instruction> }> {
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

  const reply = response.choices[0]?.message?.content || 'Beklager, jeg kunne ikke behandle forespørselen.'

  const instructionKeywords = ['rabatt', 'kampanje', 'tilbud', 'stengt', 'åpent', 'policy', 'regel', 'alltid', 'aldri', 'husk']
  const lowerMessage = message.toLowerCase()
  const shouldCreateInstruction = instructionKeywords.some(keyword => lowerMessage.includes(keyword))

  let category: Instruction['category'] = 'general'
  if (lowerMessage.includes('rabatt') || lowerMessage.includes('kampanje') || lowerMessage.includes('tilbud')) {
    category = 'promotion'
  } else if (lowerMessage.includes('stengt') || lowerMessage.includes('åpent') || lowerMessage.includes('time')) {
    category = 'availability'
  } else if (lowerMessage.includes('policy') || lowerMessage.includes('regel') || lowerMessage.includes('refusjon')) {
    category = 'policy'
  }

  return {
    reply,
    shouldCreateInstruction,
    suggestedInstruction: shouldCreateInstruction ? {
      content: message,
      category,
      priority: 'medium',
      isActive: true,
    } : undefined,
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

interface CustomerChatContext {
  businessProfile: BusinessProfile
  faqs: FAQ[]
  instructions: Instruction[]
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
}

function buildIndustryExpertise(industry: string): string {
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
  return `Du har god forståelse for ${industry}-bransjen og kan svare på vanlige spørsmål om:
- Tjenester og produkter
- Priser og tilgjengelighet
- Bestilling og kontakt
- Åpningstider og lokasjon
- Vanlige bransjespørsmål`
}

function buildToneConfiguration(tone: string, toneConfig?: ToneConfig): string {
  // Base tone guide
  let toneGuide = tone === 'formal'
    ? 'Bruk formelt språk, vær profesjonell og respektfull. Unngå slang og uformelle uttrykk.'
    : tone === 'casual'
    ? 'Vær avslappet og uformell, bruk hverdagslig språk. Du kan være litt humoristisk.'
    : 'Vær vennlig og imøtekommende, men fortsatt profesjonell. Bruk "du" og vær personlig.'

  // Add custom tone configuration if available
  if (toneConfig) {
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

function buildCustomerSystemPrompt(context: CustomerChatContext): string {
  const { businessProfile, faqs, instructions } = context

  const toneGuide = buildToneConfiguration(businessProfile.tone, businessProfile.toneConfig)
  const industryExpertise = buildIndustryExpertise(businessProfile.industry)

  let prompt = `Du er en kundeservice-assistent for ${businessProfile.businessName}.

BEDRIFTSINFORMASJON:
- Bransje: ${businessProfile.industry}
- Beskrivelse: ${businessProfile.description}
${businessProfile.services.length > 0 ? `- Tjenester: ${businessProfile.services.join(', ')}` : ''}
${businessProfile.products.length > 0 ? `- Produkter: ${businessProfile.products.join(', ')}` : ''}

BRANSJEKUNNSKAP:
${industryExpertise}

KOMMUNIKASJONSSTIL:
${toneGuide}

`

  // Add FAQs as knowledge base
  if (faqs.length > 0) {
    prompt += `\nVANLIGE SPØRSMÅL OG SVAR:\n`
    faqs.forEach((faq, i) => {
      prompt += `${i + 1}. Spørsmål: ${faq.question}\n   Svar: ${faq.answer}\n\n`
    })
  }

  // Add active instructions
  const activeInstructions = instructions.filter(i => i.isActive)
  if (activeInstructions.length > 0) {
    prompt += `\nVIKTIGE INSTRUKSJONER FRA BEDRIFTSEIER:\n`
    activeInstructions.forEach((inst, i) => {
      const priority = inst.priority === 'high' ? '(HØYT PRIORITERT)' : ''
      prompt += `${i + 1}. ${priority} ${inst.content}\n`
    })
  }

  prompt += `
REGLER:
1. Svar alltid på norsk
2. Hold svarene korte og konsise (maks 2-3 setninger med mindre kunden trenger mer info)
3. Hvis du ikke vet svaret, si det ærlig og tilby å sette kunden i kontakt med en person
4. Følg alltid instruksjonene fra bedriftseieren
5. Vær hjelpsom og løsningsorientert
6. Hvis kunden virker frustrert, vis empati
7. Ikke finn på informasjon - hold deg til det du vet om bedriften
8. KRITISK: ALDRI oversett eller endre følgende - de skal gjengis NØYAKTIG som de er:
   - E-postadresser (f.eks. contact@example.no skal IKKE bli kontakt@example.no)
   - Fysiske adresser (gatenavn, stedsnavn)
   - Personnavn og bedriftsnavn
   - Telefonnumre
   - URLer og nettsideadresser
   - Produktnavn og merkenavn

Svar nå på kundens melding.`

  return prompt
}

export async function chatWithCustomer(
  message: string,
  context: CustomerChatContext
): Promise<string> {
  const systemPrompt = buildCustomerSystemPrompt(context)

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // Add conversation history (last 10 messages)
  context.conversationHistory.slice(-10).forEach((msg) => {
    messages.push({
      role: msg.role,
      content: msg.content,
    })
  })

  // Add current message
  messages.push({
    role: 'user',
    content: message,
  })

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 400,
  })

  return response.choices[0]?.message?.content?.trim() ||
    'Beklager, jeg kunne ikke behandle meldingen din. Prøv igjen eller kontakt oss direkte.'
}
