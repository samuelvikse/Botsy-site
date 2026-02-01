import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import Groq from 'groq-sdk'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Initialize Firebase Client SDK
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseApp() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig)
  }
  return getApp()
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface SendSummaryRequest {
  companyId: string
  sessionId: string
  customerEmail: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

// Generate a nice summary of the conversation
async function generateSummary(
  messages: Array<{ role: string; content: string }>,
  businessName: string
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Du er en assistent som lager pene oppsummeringer av kundeservice-samtaler.
Lag en kort, ryddig oppsummering på norsk som inkluderer:
- Hovedtemaet/spørsmålet kunden hadde
- De viktigste svarene/informasjonen som ble gitt
- Eventuelle handlinger eller oppfølging som ble avtalt

Hold det kort og profesjonelt. Ikke inkluder hilsener eller avslutninger.`,
      },
      {
        role: 'user',
        content: `Oppsummer denne samtalen med ${businessName}:\n\n${messages
          .map((m) => `${m.role === 'user' ? 'Kunde' : 'Botsy'}: ${m.content}`)
          .join('\n\n')}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  })

  return response.choices[0]?.message?.content || 'Kunne ikke generere oppsummering.'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendSummaryRequest
    const { companyId, customerEmail, messages } = body

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!customerEmail || !emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig e-postadresse' },
        { status: 400 }
      )
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ingen meldinger å oppsummere' },
        { status: 400 }
      )
    }

    // Get company info
    const app = getFirebaseApp()
    const db = getFirestore(app)
    const companyRef = doc(db, 'companies', companyId)
    const companyDoc = await getDoc(companyRef)

    let businessName = 'Bedriften'
    let businessEmail = ''

    if (companyDoc.exists()) {
      const data = companyDoc.data()
      businessName = data?.businessProfile?.businessName || data?.businessName || 'Bedriften'
      businessEmail = data?.contactEmail || data?.ownerEmail || ''
    }

    // Generate summary
    const summary = await generateSummary(messages, businessName)

    // Format the full conversation
    const formattedConversation = messages
      .filter((m) => !m.content.includes('[EMAIL_REQUEST]') && !m.content.includes('[OFFER_EMAIL]'))
      .map((m) => {
        const sender = m.role === 'user' ? 'Du' : businessName
        return `<p><strong>${sender}:</strong> ${m.content.replace(/\n/g, '<br>')}</p>`
      })
      .join('')

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Samtale-oppsummering fra ${businessName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Samtale-oppsummering</h1>
    <p style="color: #6b7a94; margin-bottom: 24px;">Fra din chat med ${businessName}</p>

    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #1a1a2e; font-size: 16px; margin-bottom: 12px;">📋 Oppsummering</h2>
      <p style="color: #4a5568; line-height: 1.6;">${summary.replace(/\n/g, '<br>')}</p>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
      <h2 style="color: #1a1a2e; font-size: 16px; margin-bottom: 16px;">💬 Full samtale</h2>
      <div style="color: #4a5568; line-height: 1.8;">
        ${formattedConversation}
      </div>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="color: #6b7a94; font-size: 12px;">
        Denne e-posten ble sendt automatisk fra ${businessName} via Botsy.
      </p>
      <p style="color: #6b7a94; font-size: 12px;">
        <a href="https://botsy.no" style="color: #CCFF00; text-decoration: none;">Drevet av Botsy</a>
      </p>
    </div>
  </div>
</body>
</html>
`

    // Send email using Resend
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'E-posttjenesten er ikke konfigurert. Kontakt bedriften direkte.' },
        { status: 503 }
      )
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${businessName} <hei@botsy.no>`,
        to: customerEmail,
        subject: `Samtale-oppsummering fra ${businessName}`,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Kunne ikke sende e-post. Prøv igjen senere.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'E-post sendt!',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke sende oppsummering' },
      { status: 500 }
    )
  }
}
