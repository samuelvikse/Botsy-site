import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForToken,
  getUserPages,
  getPageAccessToken,
  subscribeWebhook,
  getInstagramBusinessAccount,
} from '@/lib/facebook-oauth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * GET /api/auth/facebook/callback
 *
 * Handles the OAuth callback from Facebook after user authorization
 *
 * Query params from Facebook:
 * - code: Authorization code to exchange for token
 * - state: Contains "companyId:channel" from our initial request
 * - error: Set if user denied access
 * - error_description: Description of the error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Check for errors from Facebook
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorDescription = searchParams.get('error_description') || 'User denied access'
      console.error('[Facebook OAuth Callback] Error from Facebook:', errorParam, errorDescription)

      // Redirect back to admin with error
      const adminUrl = new URL('/admin', request.nextUrl.origin)
      adminUrl.searchParams.set('fb_error', errorDescription)
      return NextResponse.redirect(adminUrl)
    }

    // Get code and state
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      console.error('[Facebook OAuth Callback] Missing code or state')
      const adminUrl = new URL('/admin', request.nextUrl.origin)
      adminUrl.searchParams.set('fb_error', 'Invalid callback parameters')
      return NextResponse.redirect(adminUrl)
    }

    // Parse state to get companyId and channel
    const [companyId, channel] = state.split(':')
    if (!companyId || !channel || !['instagram', 'messenger'].includes(channel)) {
      console.error('[Facebook OAuth Callback] Invalid state:', state)
      const adminUrl = new URL('/admin', request.nextUrl.origin)
      adminUrl.searchParams.set('fb_error', 'Invalid state parameter')
      return NextResponse.redirect(adminUrl)
    }

    // Build redirect URI (must match exactly what was used in initial request)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`

    console.log('[Facebook OAuth Callback] Exchanging code for token...')

    // Exchange code for user access token
    const tokenResponse = await exchangeCodeForToken({
      code,
      redirectUri,
    })

    console.log('[Facebook OAuth Callback] Got user token, fetching pages...')

    // Get user's Facebook pages
    const pages = await getUserPages(tokenResponse.access_token)

    if (pages.length === 0) {
      console.error('[Facebook OAuth Callback] No pages found')
      const adminUrl = new URL('/admin', request.nextUrl.origin)
      adminUrl.searchParams.set('fb_error', 'No Facebook pages found. You need at least one Facebook page to connect.')
      return NextResponse.redirect(adminUrl)
    }

    // For now, use the first page if only one, or redirect to page selection
    // In a future update, we could add a page selection UI
    if (pages.length > 1) {
      // Store pages temporarily and redirect to page selection
      // For now, we'll just use the first page
      console.log('[Facebook OAuth Callback] Multiple pages found, using first one')
    }

    const selectedPage = pages[0]
    console.log('[Facebook OAuth Callback] Using page:', selectedPage.name)

    // Get long-lived page access token
    const pageAccessToken = await getPageAccessToken({
      pageId: selectedPage.id,
      userAccessToken: tokenResponse.access_token,
    })

    console.log('[Facebook OAuth Callback] Got page access token')

    // Subscribe to webhooks
    try {
      await subscribeWebhook({
        pageId: selectedPage.id,
        pageAccessToken,
        channel: channel as 'instagram' | 'messenger',
      })
      console.log('[Facebook OAuth Callback] Webhook subscription successful')
    } catch (webhookError) {
      console.error('[Facebook OAuth Callback] Webhook subscription failed:', webhookError)
      // Continue anyway - webhooks can be set up manually
    }

    // Prepare channel data
    console.log('[Facebook OAuth Callback] Preparing channel data with pageAccessToken length:', pageAccessToken?.length || 0)
    let channelData: Record<string, unknown> = {
      isActive: true,
      isVerified: true,
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      credentials: {
        pageAccessToken: pageAccessToken,
        appSecret: process.env.FACEBOOK_APP_SECRET || '',
      },
      connectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    console.log('[Facebook OAuth Callback] Channel data prepared:', JSON.stringify({
      ...channelData,
      credentials: { pageAccessToken: pageAccessToken ? 'TOKEN_EXISTS' : 'MISSING', appSecret: channelData.credentials ? 'EXISTS' : 'MISSING' }
    }))

    // For Instagram, get the Instagram Business Account
    if (channel === 'instagram') {
      const igAccount = await getInstagramBusinessAccount({
        pageId: selectedPage.id,
        pageAccessToken,
      })

      if (igAccount) {
        channelData = {
          ...channelData,
          instagramAccountId: igAccount.id,
          username: igAccount.username || '',
        }
        console.log('[Facebook OAuth Callback] Instagram account found:', igAccount.username)
      } else {
        // No Instagram account linked to this page
        console.error('[Facebook OAuth Callback] No Instagram account linked to page')
        const adminUrl = new URL('/admin', request.nextUrl.origin)
        adminUrl.searchParams.set('fb_error', 'No Instagram business account is linked to this Facebook page. Please link your Instagram account in Meta Business Suite first.')
        return NextResponse.redirect(adminUrl)
      }
    }

    // Save to Firestore
    if (!db) {
      throw new Error('Database not initialized')
    }

    console.log('[Facebook OAuth Callback] Final channelData to save:', JSON.stringify({
      ...channelData,
      credentials: channelData.credentials ? { hasToken: !!(channelData.credentials as Record<string, unknown>).pageAccessToken } : 'NO_CREDENTIALS'
    }))

    await setDoc(
      doc(db, 'companies', companyId),
      {
        channels: {
          [channel]: channelData,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    console.log('[Facebook OAuth Callback] Channel saved to Firestore successfully')

    // Redirect back to admin with success
    const adminUrl = new URL('/admin', request.nextUrl.origin)
    adminUrl.searchParams.set('fb_success', channel)
    adminUrl.searchParams.set('fb_page', selectedPage.name)

    return NextResponse.redirect(adminUrl)
  } catch (error) {
    console.error('[Facebook OAuth Callback] Error:', error)

    const adminUrl = new URL('/admin', request.nextUrl.origin)
    adminUrl.searchParams.set(
      'fb_error',
      error instanceof Error ? error.message : 'An unexpected error occurred'
    )
    return NextResponse.redirect(adminUrl)
  }
}
