/**
 * Facebook OAuth Helper Functions
 *
 * Handles OAuth flow for connecting Instagram and Messenger channels
 */

const FACEBOOK_GRAPH_VERSION = 'v21.0'
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  picture?: {
    data?: {
      url?: string
    }
  }
  instagram_business_account?: {
    id: string
    username?: string
    profile_picture_url?: string
  }
}

export interface FacebookTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

export interface FacebookPagesResponse {
  data: FacebookPage[]
}

/**
 * Get the Facebook OAuth authorization URL
 */
export function getAuthUrl(params: {
  channel: 'instagram' | 'messenger'
  companyId: string
  redirectUri: string
}): string {
  const { channel, companyId, redirectUri } = params

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  if (!appId) {
    throw new Error('NEXT_PUBLIC_FACEBOOK_APP_ID is not configured')
  }

  // Scopes needed for Instagram and Messenger
  const scopes = [
    'pages_show_list',           // List user's pages
    'pages_messaging',           // Send messages via Messenger
    'pages_manage_metadata',     // Subscribe to webhooks
    'pages_read_engagement',     // Read page engagement
    'business_management',       // Access business assets
  ]

  // Add Instagram-specific scopes
  if (channel === 'instagram') {
    scopes.push(
      'instagram_basic',              // Basic Instagram account info
      'instagram_manage_messages',    // Send/receive Instagram DMs
    )
  }

  // State contains channel and companyId for callback
  const state = `${companyId}:${channel}`

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes.join(','))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('auth_type', 'rerequest') // Force re-request of permissions

  return authUrl.toString()
}

/**
 * Exchange authorization code for user access token
 */
export async function exchangeCodeForToken(params: {
  code: string
  redirectUri: string
}): Promise<FacebookTokenResponse> {
  const { code, redirectUri } = params

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error('Facebook app credentials not configured')
  }

  const tokenUrl = new URL(`${FACEBOOK_GRAPH_URL}/oauth/access_token`)
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const response = await fetch(tokenUrl.toString())

  if (!response.ok) {
    const error = await response.json()
    console.error('[Facebook OAuth] Token exchange failed:', error)
    throw new Error(error.error?.message || 'Failed to exchange code for token')
  }

  return response.json()
}

/**
 * Get long-lived access token (60 days instead of 1-2 hours)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error('Facebook app credentials not configured')
  }

  const url = new URL(`${FACEBOOK_GRAPH_URL}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', shortLivedToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const error = await response.json()
    console.error('[Facebook OAuth] Long-lived token exchange failed:', error)
    throw new Error(error.error?.message || 'Failed to get long-lived token')
  }

  return response.json()
}

/**
 * Get list of Facebook pages the user manages
 */
export async function getUserPages(userAccessToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${FACEBOOK_GRAPH_URL}/me/accounts`)
  url.searchParams.set('access_token', userAccessToken)
  url.searchParams.set('fields', 'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}')

  console.log('[Facebook OAuth] Fetching pages from:', url.toString().replace(userAccessToken, 'TOKEN_HIDDEN'))

  const response = await fetch(url.toString())
  const responseText = await response.text()

  console.log('[Facebook OAuth] Pages response status:', response.status)
  console.log('[Facebook OAuth] Pages response body:', responseText)

  if (!response.ok) {
    const error = JSON.parse(responseText)
    console.error('[Facebook OAuth] Failed to get user pages:', error)
    throw new Error(error.error?.message || 'Failed to get user pages')
  }

  const data: FacebookPagesResponse = JSON.parse(responseText)
  console.log('[Facebook OAuth] Found pages:', data.data?.length || 0)
  return data.data || []
}

/**
 * Get a long-lived Page Access Token
 * Page tokens derived from long-lived user tokens are also long-lived
 */
export async function getPageAccessToken(params: {
  pageId: string
  userAccessToken: string
}): Promise<string> {
  const { pageId, userAccessToken } = params

  // First get a long-lived user token
  const longLivedUserToken = await getLongLivedToken(userAccessToken)

  // Get pages with the long-lived token (page tokens will also be long-lived)
  const pages = await getUserPages(longLivedUserToken.access_token)

  const page = pages.find(p => p.id === pageId)
  if (!page) {
    throw new Error('Page not found or you do not have access to it')
  }

  return page.access_token
}

/**
 * Subscribe the page to webhook events
 */
export async function subscribeWebhook(params: {
  pageId: string
  pageAccessToken: string
  channel: 'instagram' | 'messenger'
}): Promise<boolean> {
  const { pageId, pageAccessToken, channel } = params

  // Fields to subscribe to
  const fields = channel === 'instagram'
    ? 'messages,messaging_postbacks'  // Instagram messaging
    : 'messages,messaging_postbacks'  // Messenger

  const url = new URL(`${FACEBOOK_GRAPH_URL}/${pageId}/subscribed_apps`)
  url.searchParams.set('subscribed_fields', fields)
  url.searchParams.set('access_token', pageAccessToken)

  const response = await fetch(url.toString(), {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[Facebook OAuth] Webhook subscription failed:', error)
    throw new Error(error.error?.message || 'Failed to subscribe to webhooks')
  }

  const result = await response.json()
  return result.success === true
}

/**
 * Get Instagram Business Account info linked to a page
 */
export async function getInstagramBusinessAccount(params: {
  pageId: string
  pageAccessToken: string
}): Promise<{ id: string; username: string; profile_picture_url?: string } | null> {
  const { pageId, pageAccessToken } = params

  const url = new URL(`${FACEBOOK_GRAPH_URL}/${pageId}`)
  url.searchParams.set('fields', 'instagram_business_account{id,username,profile_picture_url}')
  url.searchParams.set('access_token', pageAccessToken)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const error = await response.json()
    console.error('[Facebook OAuth] Failed to get Instagram account:', error)
    return null
  }

  const data = await response.json()
  return data.instagram_business_account || null
}

/**
 * Verify webhook signature from Facebook
 */
export function verifyWebhookSignature(
  appSecret: string,
  signature: string,
  rawBody: string
): boolean {
  const crypto = require('crypto')

  if (!signature.startsWith('sha256=')) {
    return false
  }

  const expectedSignature = signature.substring(7)
  const calculatedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(calculatedSignature)
  )
}
