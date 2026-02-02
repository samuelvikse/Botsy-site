import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Initialize Firebase Client SDK (for reading public data only)
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

// Demo config for testing
const DEMO_CONFIG = {
  businessName: 'Demo Bedrift',
  botName: 'Botsy',
  greeting: 'Hei! Jeg er Botsy. Hvordan kan jeg hjelpe deg i dag?',
  primaryColor: '#CCFF00',
  position: 'bottom-right',
  isEnabled: true,
  logoUrl: null,
  widgetSize: 'medium' as const,
  animationStyle: 'scale' as const,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params

    // Demo mode
    if (companyId === 'demo') {
      return NextResponse.json({
        success: true,
        config: DEMO_CONFIG,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Initialize Firebase and get Firestore
    const app = getFirebaseApp()
    const db = getFirestore(app)

    // Fetch company document
    const companyRef = doc(db, 'companies', companyId)
    const companyDoc = await getDoc(companyRef)

    if (!companyDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Bedrift ikke funnet' },
        { status: 404 }
      )
    }

    const companyData = companyDoc.data()

    // Return only public widget config (no sensitive data)
    return NextResponse.json({
      success: true,
      config: {
        businessName: companyData?.businessProfile?.businessName || companyData?.businessName || 'Bedrift',
        botName: companyData?.generalSettings?.botName || 'Botsy',
        greeting: companyData?.businessProfile?.toneConfig?.greeting || companyData?.widgetSettings?.greeting || 'Hei! Hvordan kan jeg hjelpe deg?',
        primaryColor: companyData?.widgetSettings?.primaryColor || '#CCFF00',
        position: companyData?.widgetSettings?.position || 'bottom-right',
        isEnabled: companyData?.widgetSettings?.isEnabled ?? true,
        logoUrl: companyData?.widgetSettings?.logoUrl || null,
        widgetSize: companyData?.widgetSettings?.widgetSize || 'medium',
        animationStyle: companyData?.widgetSettings?.animationStyle || 'scale',
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke hente konfigurasjon' },
      { status: 500 }
    )
  }
}
