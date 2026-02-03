import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForTokens,
  getGmailProfile,
} from '@/lib/google-oauth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth callback from Google after user authorization
 *
 * Query params from Google:
 * - code: Authorization code to exchange for tokens
 * - state: Contains companyId from our initial request
 * - error: Set if user denied access
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Check for errors from Google
    const errorParam = searchParams.get('error')
    if (errorParam) {
      console.error('[Google OAuth Callback] Error from Google:', errorParam)

      // Redirect back to admin with error
      const adminUrl = new URL('/admin', request.nextUrl.origin)
      adminUrl.searchParams.set('google_error', errorParam === 'access_denied' ? 'Du avbrøt tilkoblingen' : errorParam)
      return NextResponse.redirect(adminUrl)
    }

    // Get code and state
    const code = searchParams.get('code')
    const state = searchParams.get('state') // companyId

    if (!code || !state) {
      console.error('[Google OAuth Callback] Missing code or state')
      const adminUrl = new URL('/admin', request.nextUrl.origin)
      adminUrl.searchParams.set('google_error', 'Ugyldige callback-parametere')
      return NextResponse.redirect(adminUrl)
    }

    const companyId = state

    // Build redirect URI (must match exactly what was used in initial request)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    console.log('[Google OAuth Callback] Exchanging code for tokens...')

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens({
      code,
      redirectUri,
    })

    console.log('[Google OAuth Callback] Got tokens, fetching Gmail profile...')

    // Get user's Gmail profile
    const profile = await getGmailProfile(tokenResponse.access_token)

    console.log('[Google OAuth Callback] Gmail profile:', profile.emailAddress)

    // Prepare channel data
    const channelData = {
      isActive: true,
      isVerified: true,
      provider: 'gmail',
      emailAddress: profile.emailAddress,
      credentials: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || '',
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      },
      connectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Save to Firestore
    if (!db) {
      throw new Error('Database not initialized')
    }

    await setDoc(
      doc(db, 'companies', companyId),
      {
        channels: {
          email: channelData,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    console.log('[Google OAuth Callback] Email channel saved to Firestore')

    // Redirect back to admin with success
    const adminUrl = new URL('/admin', request.nextUrl.origin)
    adminUrl.searchParams.set('google_success', 'email')
    adminUrl.searchParams.set('google_email', profile.emailAddress)

    return NextResponse.redirect(adminUrl)
  } catch (error) {
    console.error('[Google OAuth Callback] Error:', error)

    const adminUrl = new URL('/admin', request.nextUrl.origin)
    adminUrl.searchParams.set(
      'google_error',
      error instanceof Error ? error.message : 'En uventet feil oppstod'
    )
    return NextResponse.redirect(adminUrl)
  }
}
