import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore'
import { widgetCorsHeaders } from '@/lib/cors'

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
  secondaryColor: '#1A1A2E',
  position: 'bottom-right',
  isEnabled: true,
  logoUrl: null,
  widgetSize: 'medium' as const,
  animationStyle: 'scale' as const,
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: widgetCorsHeaders })
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
          ...widgetCorsHeaders,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
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
        { status: 404, headers: widgetCorsHeaders }
      )
    }

    const companyData = companyDoc.data()

    // Auto-fix: If widgetSettings.isEnabled is not set, set it to true
    // This prevents issues with old companies that don't have this field
    if (companyData?.widgetSettings?.isEnabled === undefined) {
      try {
        await updateDoc(companyRef, {
          'widgetSettings.isEnabled': true,
        })
        console.log(`[Widget Config] Auto-fixed widgetSettings.isEnabled for ${companyId}`)
      } catch {
        // Non-critical, continue even if fix fails
      }
    }

    // Return only public widget config (no sensitive data)
    return NextResponse.json({
      success: true,
      config: {
        businessName: companyData?.businessProfile?.businessName || companyData?.businessName || 'Bedrift',
        botName: companyData?.generalSettings?.botName || 'Botsy',
        greeting: companyData?.businessProfile?.toneConfig?.greeting || companyData?.widgetSettings?.greeting || 'Hei! Hvordan kan jeg hjelpe deg?',
        primaryColor: companyData?.widgetSettings?.primaryColor || '#CCFF00',
        secondaryColor: companyData?.widgetSettings?.secondaryColor || '#1A1A2E',
        position: companyData?.widgetSettings?.position || 'bottom-right',
        isEnabled: companyData?.widgetSettings?.isEnabled ?? true,
        logoUrl: companyData?.widgetSettings?.logoUrl || null,
        widgetSize: companyData?.widgetSettings?.widgetSize || 'medium',
        animationStyle: companyData?.widgetSettings?.animationStyle || 'scale',
      },
    }, {
      headers: {
        ...widgetCorsHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke hente konfigurasjon' },
      { status: 500, headers: widgetCorsHeaders }
    )
  }
}
