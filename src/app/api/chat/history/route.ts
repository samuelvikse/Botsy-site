import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const sessionId = searchParams.get('sessionId')

    if (!companyId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'companyId og sessionId er påkrevd' },
        { status: 400, headers: corsHeaders }
      )
    }

    const app = getFirebaseApp()
    const db = getFirestore(app)

    const sessionRef = doc(db, 'companies', companyId, 'customerChats', sessionId)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) {
      return NextResponse.json({
        success: true,
        messages: [],
        isManualMode: false,
      }, { headers: corsHeaders })
    }

    const data = sessionSnap.data()
    const messages = (data.messages || []).map((msg: { role: 'user' | 'assistant'; content: string; timestamp?: { toDate?: () => Date }; isManual?: boolean }) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
      isManual: msg.isManual || false,
    }))

    return NextResponse.json({
      success: true,
      messages,
      isManualMode: data.isManualMode || false,
      agentTypingAt: data.agentTypingAt?.toDate?.()?.toISOString() || null,
      customerTypingAt: data.customerTypingAt?.toDate?.()?.toISOString() || null,
      lastReadByAgent: data.lastReadByAgent?.toDate?.()?.toISOString() || null,
      lastReadByCustomer: data.lastReadByCustomer?.toDate?.()?.toISOString() || null,
    }, { headers: corsHeaders })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke hente meldinger' },
      { status: 500, headers: corsHeaders }
    )
  }
}
