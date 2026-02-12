import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

// Initialize Firebase Client SDK (same pattern as chat/[companyId]/route.ts)
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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

// Toggle manual mode for a chat session
export async function PUT(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = (await request.json()) as ToggleModeRequest
    const { companyId, sessionId, isManual } = body

    if (!companyId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'companyId og sessionId er påkrevd' },
        { status: 400 }
      )
    }

    console.log(`[Chat Manual] PUT toggle: company=${companyId}, session=${sessionId}, manual=${isManual}, user=${user.uid}`)

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) {
      console.log(`[Chat Manual] Access denied for user ${user.uid} on company ${companyId}`)
      return forbiddenResponse()
    }

    const app = getFirebaseApp()
    const db = getFirestore(app)
    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)

    // Check if session exists
    const sessionDoc = await getDoc(sessionRef)
    if (!sessionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    // Update manual mode
    await updateDoc(sessionRef, {
      isManualMode: isManual,
      manualModeUpdatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      isManualMode: isManual,
    })
  } catch (error) {
    console.error('[Chat Manual] PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke endre modus' },
      { status: 500 }
    )
  }
}

// Send a manual message
export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  try {
    const body = (await request.json()) as SendMessageRequest
    const { companyId, sessionId, message } = body

    if (!companyId || !sessionId || !message) {
      return NextResponse.json(
        { success: false, error: 'companyId, sessionId og message er påkrevd' },
        { status: 400 }
      )
    }

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    const app = getFirebaseApp()
    const db = getFirestore(app)
    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)

    // Get existing session
    const sessionDoc = await getDoc(sessionRef)
    if (!sessionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    const sessionData = sessionDoc.data()
    const existingMessages = sessionData?.messages || []

    // Add the manual message
    const updatedMessages = [
      ...existingMessages,
      {
        role: 'assistant',
        content: message,
        timestamp: new Date(),
        isManual: true,
      },
    ]

    await updateDoc(sessionRef, {
      messages: updatedMessages,
      updatedAt: new Date(),
      isManualMode: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Melding sendt',
    })
  } catch (error) {
    console.error('[Chat Manual] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Kunne ikke sende melding' },
      { status: 500 }
    )
  }
}

// Get chat status including manual mode
export async function GET(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

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

    const access = await requireCompanyAccess(user.uid, companyId, user.token)
    if (!access) return forbiddenResponse()

    const app = getFirebaseApp()
    const db = getFirestore(app)
    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)

    const sessionDoc = await getDoc(sessionRef)
    if (!sessionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Chat-session ikke funnet' },
        { status: 404 }
      )
    }

    const data = sessionDoc.data()

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
