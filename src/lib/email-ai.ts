/**
 * Shared AI response generation for Email
 * Used by both the webhook (auto-reply) and the suggest endpoint (employee-controlled)
 */

import { buildToneConfiguration, buildContextReminder } from '@/lib/groq'
import { generateAIResponse } from '@/lib/ai-providers'
import type { ToneConfig, FAQ, Instruction } from '@/types'

export interface EmailAIContext {
  emailSubject: string
  emailBody: string
  senderEmail: string
  businessProfile: Record<string, unknown> | null
  faqs: Array<Record<string, unknown>>
  instructions: Array<{ content: string; priority: string }>
  knowledgeDocuments?: Array<{
    faqs: Array<{ question: string; answer: string }>
    rules: string[]
    policies: string[]
    importantInfo: string[]
    uploadedAt: Date
    fileName: string
  }>
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
    knowledgeDocuments,
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

  // 1. E-post-spesifikke regler
  let systemPrompt = `Du er en hjelpsom kundeservice-assistent som svarer på e-post.

E-POST-SPESIFIKKE REGLER:
- Skriv profesjonelle og høflige e-postsvar
- Ikke bruk overdreven formatering
- Start IKKE med "Hei [e-postadresse]" - bruk en generell hilsen som "Hei," eller "Hei der,"
- Avslutt med en høflig avslutning

VIKTIGE REGLER:
- KRITISK: Svar ALLTID på ALLE spørsmål kunden stiller - uansett hvor kort svarlengden er satt til. Hvis kunden stiller 3 spørsmål, SKAL du svare på alle 3. Svarlengde-innstillingen gjelder detaljeringsgrad per spørsmål, IKKE antall spørsmål du besvarer.
- Svar alltid på norsk med mindre kunden skriver på et annet språk
- ALDRI nevn andre kunder, brukere, eller bedrifter som bruker tjenesten - dette er konfidensielt
- ALDRI del informasjon om andre brukere
- KRITISK: ALDRI oversett eller endre e-postadresser, telefonnumre, adresser, URLer, eller navn - de skal gjengis NØYAKTIG som de er
- EKSTREMT VIKTIG: Kontaktinformasjon (telefonnumre, e-postadresser, adresser) som finnes i kundens e-post eller signatur tilhører KUNDEN. Du skal ALDRI bruke kundens kontaktinfo som om det er bedriftens egen. Bruk KUN kontaktinformasjonen som er oppgitt under "KONTAKTINFORMASJON" i denne instruksjonen. Hvis bedriften ikke har oppgitt kontaktinfo, IKKE inkluder noen kontaktinfo i svaret — ikke engang som forslag eller i generell form. Bare utelat det helt.`

  // 2. Kommunikasjonsstil/tone
  systemPrompt += `\n\nKOMMUNIKASJONSSTIL:\n${toneGuide}`

  // 3. Bedriftsinformasjon
  if (bp) {
    systemPrompt += `\n\nBEDRIFTSINFORMASJON:`
    systemPrompt += `\nDu representerer: ${bp.businessName || 'Bedriften'}`
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

  // 4. Kunnskapsbase (FAQs) - HØYESTE PRIORITET
  if (faqs.length > 0) {
    systemPrompt += `\n\n=== KUNNSKAPSBASE (HØYESTE PRIORITET) ===
VIKTIG OM BRUK AV KUNNSKAPSBASEN:
- KUNNSKAPSBASEN HAR ALLTID PRIORITET over dokumenter og bedriftsprofil ved motstridende info
- Hvis et dokument sier én pris/dato/info og kunnskapsbasen sier noe annet, BRUK KUNNSKAPSBASEN
- ALDRI kopier svarene ordrett - bruk din egen formulering
- Forstå INNHOLDET og forklar det naturlig med egne ord
- Tilpass svaret til samtalen og kundens spørsmål
- Svar som om du FORSTÅR temaet, ikke som om du leser fra et skript

Tilgjengelig kunnskap:\n`
    faqs.slice(0, 20).forEach((faq, i) => {
      const question = faq.question as string | undefined
      const answer = faq.answer as string | undefined
      if (question && answer) {
        systemPrompt += `${i + 1}. Tema: ${question}\n   Informasjon: ${answer}\n\n`
      }
    })
    systemPrompt += `=== SLUTT PÅ KUNNSKAPSBASE ===`
  }

  // 5. Bedriftsdokumenter (knowledge docs) - LAVERE PRIORITET
  if (knowledgeDocuments && knowledgeDocuments.length > 0) {
    const sortedDocs = [...knowledgeDocuments].sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
      return dateB - dateA
    })

    systemPrompt += `\n\n=== BEDRIFTSDOKUMENTER (LAVERE PRIORITET enn kunnskapsbase) ===
VIKTIG: Hvis info her MOTSIER kunnskapsbasen, BRUK KUNNSKAPSBASEN.
Dokumenter er kun tilleggskunnskap når kunnskapsbasen ikke har svaret.\n`

    for (const doc of sortedDocs) {
      const dateStr = doc.uploadedAt ? new Date(doc.uploadedAt).toISOString().split('T')[0] : 'ukjent dato'
      const fileName = doc.fileName || 'Ukjent dokument'
      systemPrompt += `\n--- Fra dokument: ${fileName} (lastet opp: ${dateStr}) ---\n`

      if (doc.faqs.length > 0) {
        systemPrompt += 'Kunnskap fra dokument (omformuler med egne ord):\n'
        doc.faqs.forEach((faq, i) => {
          systemPrompt += `${i + 1}. Tema: ${faq.question}\n   Info: ${faq.answer}\n`
        })
      }

      if (doc.importantInfo.length > 0) {
        systemPrompt += 'Viktig info:\n'
        doc.importantInfo.forEach(info => {
          systemPrompt += `- ${info}\n`
        })
      }

      if (doc.rules.length > 0) {
        systemPrompt += 'Regler:\n'
        doc.rules.forEach(rule => {
          systemPrompt += `- ${rule}\n`
        })
      }

      if (doc.policies.length > 0) {
        systemPrompt += 'Retningslinjer:\n'
        doc.policies.forEach(policy => {
          systemPrompt += `- ${policy}\n`
        })
      }
    }

    systemPrompt += '\n=== SLUTT PÅ DOKUMENTER ==='
  }

  // 6. Instruksjoner fra bedriftseier - med prioritetsmarkering
  if (instructions.length > 0) {
    systemPrompt += '\n\nVIKTIGE INSTRUKSJONER FRA BEDRIFTSEIER:'
    instructions.forEach((inst, i) => {
      const priority = inst.priority === 'high' ? '(HØYT PRIORITERT)' : ''
      systemPrompt += `\n${i + 1}. ${priority} ${inst.content}`
    })
  }

  // 7. Styrket "ALDRI FINN PÅ INFORMASJON"-regler (speiler widget-chatten)
  systemPrompt += `

EKSTREMT VIKTIG - ALDRI FINN PÅ INFORMASJON:
- ALDRI dikter opp priser, tall, åpningstider, eller fakta som du ikke har fått oppgitt
- Hvis du IKKE har prisinformasjon: Si "Jeg har dessverre ikke prisinformasjon tilgjengelig. Ta kontakt med oss direkte for priser."
- Hvis du IKKE vet svaret: Si det ærlig - ALDRI GJETT eller finn på noe
- Bruk KUN informasjon som er eksplisitt gitt til deg i PRISER-seksjonen, kunnskapsbasen eller dokumentene
- Det er MYE bedre å si "jeg vet ikke" enn å gi feil informasjon
- Feil informasjon ødelegger tilliten til bedriften!
- KRITISK: ALDRI bruk plassholdere som [tekst], [eksempel], [bedriftens-telefonnummer], [e-postadresse] eller lignende. Hvis du ikke har den faktiske informasjonen, utelat den HELT fra svaret. Skriv aldri noe i hakeparenteser som skal fylles inn senere.

PRIORITERING AV INFORMASJON:
- Hvis det er motstridende informasjon om samme tema, BRUK ALLTID denne rekkefølgen:
  1. Kunnskapsbasen (FAQs) - HØYESTE prioritet
  2. Bedriftsdokumenter - nest høyest
  3. Bedriftsprofil/generell info - lavest
- Nyere dokumenter overskriver eldre ved motstridende info`

  // If we have previous suggestions, instruct the AI to generate a different one
  if (previousSuggestions && previousSuggestions.length > 0) {
    systemPrompt += `\n\nTIDLIGERE FORSLAG (skriv noe ANNERLEDES enn disse):`
    previousSuggestions.forEach((s, i) => {
      systemPrompt += `\n--- Forslag ${i + 1} ---\n${s.slice(0, 500)}`
    })
    systemPrompt += `\n\nSkriv et NYTT svar med en annen vinkling, annen formulering, eller annen tilnærming enn de tidligere forslagene.`
  }

  // 8. Reminder-seksjon fra groq.ts for å forsterke innstillinger
  systemPrompt += buildContextReminder({
    toneConfig: bp?.toneConfig,
    faqs: faqs.filter(f => f.confirmed).map(f => ({
      id: '',
      question: f.question as string,
      answer: f.answer as string,
      source: 'extracted' as const,
      confirmed: true,
    })) as FAQ[],
    instructions: instructions.map(i => ({
      id: '',
      content: i.content,
      category: 'general' as const,
      priority: i.priority as 'high' | 'medium' | 'low',
      isActive: true,
      startsAt: null,
      expiresAt: null,
      createdAt: new Date(),
      createdBy: '',
    })) as Instruction[],
    knowledgeDocuments,
  })

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
 * Summarize only the last inbound email
 */
export async function summarizeLastEmail(context: {
  businessProfile: Record<string, unknown> | null
  lastEmail: { direction: string; subject: string; body: string }
}): Promise<string> {
  const { businessProfile, lastEmail } = context

  const bp = businessProfile as {
    businessName?: string
  } | null

  const systemPrompt = `Du er en assistent som lager korte, presise oppsummeringer av e-poster.

FORMAT-REGLER (FØLG NØYAKTIG):
- Skriv oppsummeringen som en punktliste med 1-4 punkter
- Hvert punkt starter med "•" og er maks 15 ord
- Fokuser på: hva kunden spør om, hva de vil, eventuelle detaljer (datoer, produkter, bestillingsnr)
- Skriv på norsk
${bp?.businessName ? `- Bedriften heter ${bp.businessName}` : ''}

EKSEMPEL:
• Spør om leveringstid for bestilling #4521
• Ønsker å endre leveringsadresse
• Ber om bekreftelse på e-post`

  const emailText = `[${lastEmail.direction === 'inbound' ? 'Kunde' : 'Bedrift'}] Emne: ${lastEmail.subject}\n${lastEmail.body.slice(0, 600)}`

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `${emailText}\n---\nOppsummer denne e-posten i det angitte formatet.`
    },
  ]

  try {
    const result = await generateAIResponse(systemPrompt, messages, {
      maxTokens: 300,
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

  const systemPrompt = `Du er en assistent som lager korte, presise oppsummeringer av e-postsamtaler.

FORMAT-REGLER (FØLG NØYAKTIG):
- Skriv oppsummeringen som en punktliste
- Hver linje starter med enten "KUNDE:" eller "BEDRIFT:" etterfulgt av ett kort punkt
- Maks 2-6 punkter totalt
- Hvert punkt skal være 1 setning, maks 15 ord
- Fokuser kun på det viktigste: hva kunden vil, og hva som ble svart
- Nevn konkrete detaljer (datoer, priser, produkter) hvis relevant
- Skriv på norsk
${bp?.businessName ? `- Bedriften heter ${bp.businessName}` : ''}

EKSEMPEL:
KUNDE: Spurte om leveringstid for bestilling #4521
BEDRIFT: Svarte at levering tar 3-5 virkedager
KUNDE: Ba om sporing av pakken
BEDRIFT: Sendte sporingsnummer og lenke`

  let conversationText = ''
  for (const msg of conversationHistory) {
    const sender = msg.direction === 'inbound' ? 'Kunde' : 'Bedrift'
    conversationText += `[${sender}] Emne: ${msg.subject}\n${msg.body.slice(0, 400)}\n\n`
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `${conversationText}\n---\nOppsummer samtalen i det angitte formatet.`
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
