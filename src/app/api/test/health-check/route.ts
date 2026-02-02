import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export const dynamic = 'force-dynamic'

interface HealthCheckResult {
  firebase: boolean
  resend: boolean
  gemini: boolean
  groq: boolean
  errors: Record<string, string>
}

/**
 * GET - Run health check on all services
 */
export async function GET() {
  const result: HealthCheckResult = {
    firebase: false,
    resend: false,
    gemini: false,
    groq: false,
    errors: {},
  }

  // Check Firebase
  try {
    if (db) {
      // Try to read a non-existent doc to verify connection
      const testRef = doc(db, '_health_check', 'test')
      await getDoc(testRef)
      result.firebase = true
    }
  } catch (error) {
    result.errors.firebase = error instanceof Error ? error.message : 'Unknown error'
  }

  // Check Resend API key
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && resendKey.startsWith('re_')) {
      // Make a simple API call to verify the key
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          Authorization: `Bearer ${resendKey}`,
        },
      })
      result.resend = response.ok
      if (!response.ok) {
        result.errors.resend = `API returned ${response.status}`
      }
    } else {
      result.errors.resend = 'API key not configured or invalid format'
    }
  } catch (error) {
    result.errors.resend = error instanceof Error ? error.message : 'Unknown error'
  }

  // Check Gemini API key
  try {
    const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
    if (geminiKey) {
      // Just verify the key exists and has proper format
      result.gemini = geminiKey.length > 20
      if (!result.gemini) {
        result.errors.gemini = 'API key appears invalid'
      }
    } else {
      result.errors.gemini = 'API key not configured'
    }
  } catch (error) {
    result.errors.gemini = error instanceof Error ? error.message : 'Unknown error'
  }

  // Check Groq API key
  try {
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey && groqKey.startsWith('gsk_')) {
      result.groq = true
    } else if (groqKey) {
      result.errors.groq = 'API key has invalid format'
    } else {
      result.errors.groq = 'API key not configured'
    }
  } catch (error) {
    result.errors.groq = error instanceof Error ? error.message : 'Unknown error'
  }

  return NextResponse.json(result)
}
