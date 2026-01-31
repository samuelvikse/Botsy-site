import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  saveKnowledgeDocument,
  updateKnowledgeDocument,
} from '@/lib/firestore'
import Groq from 'groq-sdk'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Initialize Firebase Client SDK for this route
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

const MODEL = 'llama-3.3-70b-versatile'

const DOCUMENT_ANALYSIS_PROMPT = `Du er en ekspert på å analysere bedriftsdokumenter og trekke ut viktig informasjon.

Analyser følgende dokument og trekk ut:

1. **FAQs** - Spørsmål og svar som kunder ofte lurer på
2. **Regler** - Bedriftsregler som ansatte/kunder må følge
3. **Policies** - Retningslinjer for retur, garanti, personvern, etc.
4. **Viktig informasjon** - Åpningstider, kontaktinfo, priser, etc.

Returner ALLTID gyldig JSON med denne strukturen:
{
  "faqs": [
    {"question": "Spørsmål?", "answer": "Svar"}
  ],
  "rules": ["Regel 1", "Regel 2"],
  "policies": ["Policy 1", "Policy 2"],
  "importantInfo": ["Info 1", "Info 2"],
  "summary": "2-3 setninger som oppsummerer dokumentet"
}

VIKTIG:
- Svar KUN med gyldig JSON, ingen annen tekst
- Bruk norsk språk i alle verdier
- Hvis noe ikke finnes i dokumentet, bruk tomme arrays []
- Vær grundig og trekk ut ALL relevant informasjon
- ALDRI oversett e-postadresser, telefonnumre, adresser eller navn - behold dem nøyaktig som de står`

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.name.split('.').pop()?.toLowerCase()

  if (fileType === 'txt' || fileType === 'md') {
    return await file.text()
  }

  if (fileType === 'pdf') {
    const arrayBuffer = await file.arrayBuffer()

    // Use pdfjs-dist for reliable PDF extraction
    try {
      const pdfjsLib = await import('pdfjs-dist')

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      })

      const pdfDocument = await loadingTask.promise

      let fullText = ''

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()

        const pageText = textContent.items
          .map((item) => {
            if ('str' in item) {
              return item.str
            }
            return ''
          })
          .join(' ')

        fullText += pageText + '\n'
      }

      fullText = fullText.trim()

      if (fullText.length > 0) {
        return fullText
      }

      throw new Error('Ingen tekst funnet i PDF-en')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // If pdfjs fails, try pdf-parse as fallback
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse')
        const buffer = Buffer.from(arrayBuffer)
        const pdfData = await pdfParse(buffer)

        if (pdfData.text && pdfData.text.trim().length > 0) {
          return pdfData.text
        }
      } catch {
        // Fallback also failed, will throw error below
      }

      throw new Error(`Kunne ikke lese PDF-filen: ${errorMessage}`)
    }
  }

  // For other file types, try to read as text
  try {
    return await file.text()
  } catch {
    throw new Error(`Kunne ikke lese filtype: ${fileType}`)
  }
}

async function analyzeDocument(content: string): Promise<{
  faqs: Array<{ question: string; answer: string }>
  rules: string[]
  policies: string[]
  importantInfo: string[]
  summary: string
}> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: DOCUMENT_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: `DOKUMENT TIL ANALYSE:\n---\n${content.slice(0, 15000)}\n---\n\nAnalyser dokumentet og returner JSON.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  })

  const responseText = response.choices[0]?.message?.content || '{}'

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText
    const parsed = JSON.parse(jsonStr)

    return {
      faqs: parsed.faqs || [],
      rules: parsed.rules || [],
      policies: parsed.policies || [],
      importantInfo: parsed.importantInfo || [],
      summary: parsed.summary || 'Ingen oppsummering tilgjengelig',
    }
  } catch {
    return {
      faqs: [],
      rules: [],
      policies: [],
      importantInfo: [],
      summary: 'Kunne ikke analysere dokumentet',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const companyId = formData.get('companyId') as string | null
    const uploadedBy = formData.get('uploadedBy') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Ingen fil lastet opp' },
        { status: 400 }
      )
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID mangler' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileName = file.name
    const fileExt = fileName.split('.').pop()?.toLowerCase()
    const allowedTypes = ['pdf', 'txt', 'md', 'docx']

    if (!fileExt || !allowedTypes.includes(fileExt)) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig filtype. Tillatte typer: PDF, TXT, MD, DOCX' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Filen er for stor. Maks størrelse er 10MB.' },
        { status: 400 }
      )
    }

    // Initialize Firebase Storage
    const app = getFirebaseApp()
    const storage = getStorage(app)

    if (!storage) {
      return NextResponse.json(
        { success: false, error: 'Storage ikke konfigurert' },
        { status: 500 }
      )
    }

    // Upload file to Firebase Storage
    const fileBuffer = await file.arrayBuffer()
    const storageRef = ref(
      storage,
      `companies/${companyId}/knowledge/${Date.now()}-${fileName}`
    )
    await uploadBytes(storageRef, fileBuffer, {
      contentType: file.type,
    })
    const fileUrl = await getDownloadURL(storageRef)

    // Create initial document record
    const documentId = await saveKnowledgeDocument(companyId, {
      fileName,
      fileUrl,
      fileType: fileExt as 'pdf' | 'txt' | 'docx' | 'md',
      fileSize: file.size,
      extractedContent: '',
      analyzedData: {
        faqs: [],
        rules: [],
        policies: [],
        importantInfo: [],
        summary: '',
      },
      status: 'processing',
      uploadedAt: new Date(),
      uploadedBy: uploadedBy || 'unknown',
    })

    // Extract text from file
    let extractedContent = ''
    try {
      extractedContent = await extractTextFromFile(file)
    } catch (error) {
      await updateKnowledgeDocument(companyId, documentId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Kunne ikke lese filen',
      })
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Kunne ikke lese innholdet i filen',
        documentId,
      })
    }

    if (!extractedContent || extractedContent.trim().length === 0) {
      await updateKnowledgeDocument(companyId, documentId, {
        status: 'error',
        errorMessage: 'Ingen tekst funnet i dokumentet',
      })
      return NextResponse.json({
        success: false,
        error: 'Ingen tekst funnet i dokumentet. Er PDF-en skannet uten OCR?',
        documentId,
      })
    }

    // Analyze content with AI
    let analyzedData
    try {
      analyzedData = await analyzeDocument(extractedContent)
    } catch (error) {
      await updateKnowledgeDocument(companyId, documentId, {
        extractedContent,
        status: 'error',
        errorMessage: 'Kunne ikke analysere dokumentet',
      })
      return NextResponse.json({
        success: false,
        error: 'Kunne ikke analysere dokumentet',
        documentId,
      })
    }

    // Update document with extracted and analyzed content
    await updateKnowledgeDocument(companyId, documentId, {
      extractedContent,
      analyzedData,
      status: 'ready',
      processedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      documentId,
      analyzedData,
      message: 'Dokumentet ble lastet opp og analysert',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'En ukjent feil oppstod',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve knowledge documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID mangler' },
        { status: 400 }
      )
    }

    const { getKnowledgeDocuments } = await import('@/lib/firestore')
    const documents = await getKnowledgeDocuments(companyId)

    return NextResponse.json({
      success: true,
      documents,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke hente dokumenter' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove a knowledge document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const documentId = searchParams.get('documentId')

    if (!companyId || !documentId) {
      return NextResponse.json(
        { success: false, error: 'Company ID eller Document ID mangler' },
        { status: 400 }
      )
    }

    const { deleteKnowledgeDocument } = await import('@/lib/firestore')
    await deleteKnowledgeDocument(companyId, documentId)

    return NextResponse.json({
      success: true,
      message: 'Dokumentet ble slettet',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke slette dokumentet' },
      { status: 500 }
    )
  }
}
