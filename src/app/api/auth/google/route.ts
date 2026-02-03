import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google-oauth'

/**
 * GET /api/auth/google
 *
 * Starts the Google OAuth flow for connecting Gmail
 *
 * Query params:
 * - companyId: The company ID to connect Gmail to
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const companyId = searchParams.get('companyId')

    // Validate parameters
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Build redirect URI (must match what's registered in Google Cloud Console)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    // Get Google OAuth URL
    const authUrl = getGoogleAuthUrl({
      companyId,
      redirectUri,
    })

    // Redirect to Google
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[Google OAuth] Error starting auth flow:', error)
    return NextResponse.json(
      { error: 'Failed to start Google authentication' },
      { status: 500 }
    )
  }
}
