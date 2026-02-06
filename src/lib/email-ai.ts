/**
 * Shared AI response generation for Email
 * Used by both the webhook (auto-reply) and the suggest endpoint (employee-controlled)
 */

import { buildToneConfiguration } from '@/lib/groq'
import { generateAIResponse } from '@/lib/ai-providers'
import type { ToneConfig } from '@/types'

export interface EmailAIContext {
  emailSubject: string
  emailBody: string
  senderEmail: string
  businessProfile: Record<string, unknown> | null
  faqs: Array<Record<string, unknown>>
  instructions: Array<{ content: string; priority: string }>
  conversationHistory?: Array<{ direction: string; subject: string; body: string }>
  previousSuggestions?: string[]
  temperature?: number
}

/**
 * Generate an AI response for an email
 * Supports previousSuggestions to avoid repeating the same suggestion
 */
export async function generateEmailAIResponse(context: EmailAIContext): Promise<string> {
  const {
    emailSubject,
    emailBody,
    businessProfile,
    faqs,
    instructions,
    conversationHistory,
    previousSuggestions,
    temperature,
  } = context

  const bp = businessProfile as {
    businessName?: string
    industry?: string
    description?: string
    tone?: 'formal' | 'friendly' | 'casual'
    toneConfig?: ToneConfig
    contactInfo?: { email?: string; phone?: string; address?: string; openingHours?: string }
    pricing?: Array<{ item: string; price: string }>
  } | null

  const toneGuide = buildToneConfiguration(bp?.tone || 'friendly', bp?.toneConfig)

  let systemPrompt = `Du er en hjelpsom kundeservice-assistent som svarer på e-post.

E-POST-SPESIFIKKE REGLER:
- Skriv profesjonelle og høflige e-postsvar
- Ikke bruk overdreven formatering
- Start IKKE med "Hei [e-postadresse]" - bruk en generell hilsen som "Hei," eller "Hei der,"
- Avslutt med en høflig avslutning

KOMMUNIKASJONSSTIL:
${toneGuide}

VIKTIGE REGLER:
- KRITISK: Svar ALLTID på ALLE spørsmål kunden stiller - uansett hvor kort svarlengden er satt til. Hvis kunden stiller 3 spørsmål, SKAL du svare på alle 3. Svarlengde-innstillingen gjelder detaljeringsgrad per spørsmål, IKKE antall spørsmål du besvarer.
- Svar alltid på norsk med mindre kunden skriver på et annet språk
- ALDRI nevn andre kunder, brukere, eller bedrifter som bruker tjenesten - dette er konfidensielt
- ALDRI del informasjon om andre brukere
- KRITISK: ALDRI oversett eller endre e-postadresser, telefonnumre, adresser, URLer, eller navn - de skal gjengis NØYAKTIG som de er

EKSTREMT VIKTIG - ALDRI FINN PÅ INFORMASJON:
- ALDRI dikter opp priser, tall, eller fakta som du ikke har fått oppgitt
- Hvis du IKKE har prisinformasjon tilgjengelig, si det ærlig
- Hvis du IKKE vet svaret, si det ærlig - IKKE GJETT eller finn på noe
- Det er MYE bedre å si "jeg vet ikke" enn å gi feil informasjon`

  if (bp) {
    systemPrompt += `\n\nDu representerer: ${bp.businessName || 'Bedriften'}`
    if (bp.industry) systemPrompt += `\nBransje: ${bp.industry}`
    if (bp.description) systemPrompt += `\nOm bedriften: ${bp.description}`

    if (bp.contactInfo) {
      systemPrompt += `\n\nKONTAKTINFORMASJON (bruk NØYAKTIG som oppgitt):`
      if (bp.contactInfo.email) systemPrompt += `\n- E-post: ${bp.contactInfo.email}`
      if (bp.contactInfo.phone) systemPrompt += `\n- Telefon: ${bp.contactInfo.phone}`
      if (bp.contactInfo.address) systemPrompt += `\n- Adresse: ${bp.contactInfo.address}`
      if (bp.contactInfo.openingHours) systemPrompt += `\n- Åpningstider: ${bp.contactInfo.openingHours}`
    }

    if (bp.pricing && bp.pricing.length > 0) {
      systemPrompt += `\n\nPRISER (bruk denne informasjonen når kunder spør om priser):`
      bp.pricing.forEach((p) => {
        systemPrompt += `\n- ${p.item}: ${p.price}`
      })
    }

    if (bp.toneConfig?.useEmojis === true) {
      systemPrompt += `\n\nEMOJI: Du kan bruke emojis naturlig i svarene.`
    } else {
      systemPrompt += `\n\nEMOJI: Unngå emojis i e-postsvar for profesjonalitet.`
    }
  }

  if (instructions.length > 0) {
    systemPrompt += '\n\nSpesielle instruksjoner:'
    for (const inst of instructions) {
      systemPrompt += `\n- ${inst.content}`
    }
  }

  if (faqs.length > 0) {
    systemPrompt += `\n\nKUNNSKAPSBASE:
VIKTIG: ALDRI kopier svarene ordrett - bruk din egen formulering. Forstå innholdet og forklar det naturlig med egne ord.

Tilgjengelig kunnskap:`
    for (const faq of faqs.slice(0, 10)) {
      const question = faq.question as string | undefined
      const answer = faq.answer as string | undefined
      if (question && answer) {
        systemPrompt += `\nTema: ${question}\nInfo: ${answer}`
      }
    }
  }

  // If we have previous suggestions, instruct the AI to generate a different one
  if (previousSuggestions && previousSuggestions.length > 0) {
    systemPrompt += `\n\nTIDLIGERE FORSLAG (skriv noe ANNERLEDES enn disse):`
    previousSuggestions.forEach((s, i) => {
      systemPrompt += `\n--- Forslag ${i + 1} ---\n${s.slice(0, 500)}`
    })
    systemPrompt += `\n\nSkriv et NYTT svar med en annen vinkling, annen formulering, eller annen tilnærming enn de tidligere forslagene.`
  }

  // Build conversation context
  let conversationContext = ''
  if (conversationHistory && conversationHistory.length > 1) {
    conversationContext = '\n\nTidligere i samtalen:\n'
    for (const msg of conversationHistory.slice(0, -1).slice(-4)) {
      const sender = msg.direction === 'inbound' ? 'Kunde' : 'Du'
      conversationContext += `\n${sender}: ${msg.body.slice(0, 300)}${msg.body.length > 300 ? '...' : ''}\n`
    }
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `E-post fra kunde:
Emne: ${emailSubject}
${conversationContext}
Ny melding:
${emailBody}

---
Skriv et profesjonelt svar på denne e-posten.`
    },
  ]

  try {
    const result = await generateAIResponse(systemPrompt, messages, {
      maxTokens: 1000,
      temperature: temperature ?? 0.7,
    })

    if (result.success) {
      return result.response
    }

    return `Takk for din henvendelse. Vi har mottatt e-posten din og vil svare så snart som mulig.

Med vennlig hilsen,
Kundeservice`
  } catch {
    return `Takk for din henvendelse. Vi har mottatt e-posten din og vil svare så snart som mulig.

Med vennlig hilsen,
Kundeservice`
  }
}

/**
 * Summarize the email conversation history
 */
export async function summarizeEmailConversation(context: {
  businessProfile: Record<string, unknown> | null
  conversationHistory: Array<{ direction: string; subject: string; body: string }>
}): Promise<string> {
  const { businessProfile, conversationHistory } = context

  if (!conversationHistory || conversationHistory.length === 0) {
    return 'Ingen meldinger å oppsummere.'
  }

  const bp = businessProfile as {
    businessName?: string
  } | null

  const systemPrompt = `Du er en hjelpsom assistent som oppsummerer e-postsamtaler for kundeservicemedarbeidere.

REGLER:
- Skriv en kort, klar oppsummering på norsk
- Fokuser på hva kunden ønsker/trenger
- Nevn viktige detaljer som datoer, produkter, ordrenumre, etc.
- Hvis kunden har stilt spesifikke spørsmål, list dem opp
- Inkluder hva som allerede er svart/lovet fra bedriftens side
- Hold oppsummeringen konsis men komplett
${bp?.businessName ? `- Du oppsummerer for ansatte hos ${bp.businessName}` : ''}`

  let conversationText = 'E-postsamtale:\n\n'
  for (const msg of conversationHistory) {
    const sender = msg.direction === 'inbound' ? 'Kunde' : 'Bedriften'
    conversationText += `${sender} (Emne: ${msg.subject}):\n${msg.body}\n\n`
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `${conversationText}\n---\nGi en oppsummering av denne e-postsamtalen. Fokuser på kundens behov og hva som har skjedd så langt.`
    },
  ]

  try {
    const result = await generateAIResponse(systemPrompt, messages, {
      maxTokens: 500,
      temperature: 0.3,
    })

    if (result.success) {
      return result.response
    }

    return 'Kunne ikke generere oppsummering.'
  } catch {
    return 'Kunne ikke generere oppsummering.'
  }
}
