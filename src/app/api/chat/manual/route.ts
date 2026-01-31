import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

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

interface ToggleModeRequest {
  companyId: string
  sessionId: string
  isManual: boolean
}

interface SendMessageRequest {
  companyId: string
  sessionId: string
  message: string
}

// Toggle manual mode for a chat session
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as ToggleModeRequest
    const { companyId, sessionId, isManual } = body

    if (!companyId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'companyId og sessionId er påkrevd' },
        { status: 400 }
      )
    }

    const app = getFirebaseApp()
    const db = getFirestore(app)

    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    await updateDoc(sessionRef, {
      isManualMode: isManual,
      manualModeUpdatedAt: serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      isManualMode: isManual,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke endre modus' },
      { status: 500 }
    )
  }
}

// Send a manual message
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendMessageRequest
    const { companyId, sessionId, message } = body

    if (!companyId || !sessionId || !message) {
      return NextResponse.json(
        { success: false, error: 'companyId, sessionId og message er påkrevd' },
        { status: 400 }
      )
    }

    const app = getFirebaseApp()
    const db = getFirestore(app)

    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    const existingData = sessionSnap.data()

    // Add the manual message
    await updateDoc(sessionRef, {
      messages: [
        ...(existingData?.messages || []),
        {
          role: 'assistant',
          content: message,
          timestamp: new Date(),
          isManual: true,
        },
      ],
      updatedAt: serverTimestamp(),
      // Ensure manual mode is on when sending manual messages
      isManualMode: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Melding sendt',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke sende melding' },
      { status: 500 }
    )
  }
}

// Get chat status including manual mode
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const sessionId = searchParams.get('sessionId')

    if (!companyId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'companyId og sessionId er påkrevd' },
        { status: 400 }
      )
    }

    const app = getFirebaseApp()
    const db = getFirestore(app)

    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    const data = sessionSnap.data()

    return NextResponse.json({
      success: true,
      isManualMode: data?.isManualMode || false,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke hente status' },
      { status: 500 }
    )
  }
}
