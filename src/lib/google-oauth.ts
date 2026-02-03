/**
 * Google OAuth Helper Functions
 *
 * Handles OAuth flow for connecting Gmail for sending/receiving emails
 */

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1'

export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export interface GmailUserInfo {
  emailAddress: string
  messagesTotal: number
  threadsTotal: number
}

/**
 * Get the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(params: {
  companyId: string
  redirectUri: string
}): string {
  const { companyId, redirectUri } = params

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured')
  }

  // Scopes for Gmail access
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',     // Send emails
    'https://www.googleapis.com/auth/gmail.readonly', // Read emails
    'https://www.googleapis.com/auth/userinfo.email', // Get user's email address
  ]

  // State contains companyId for callback
  const state = companyId

  const authUrl = new URL(GOOGLE_OAUTH_URL)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('access_type', 'offline')  // Get refresh token
  authUrl.searchParams.set('prompt', 'consent')       // Always show consent to get refresh token

  return authUrl.toString()
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(params: {
  code: string
  redirectUri: string
}): Promise<GoogleTokenResponse> {
  const { code, redirectUri } = params

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[Google OAuth] Token exchange failed:', error)
    throw new Error(error.error_description || 'Failed to exchange code for tokens')
  }

  return response.json()
}

/**
 * Refresh the access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[Google OAuth] Token refresh failed:', error)
    throw new Error(error.error_description || 'Failed to refresh access token')
  }

  return response.json()
}

/**
 * Get Gmail user profile (email address)
 */
export async function getGmailProfile(accessToken: string): Promise<GmailUserInfo> {
  const response = await fetch(`${GMAIL_API_URL}/users/me/profile`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[Google OAuth] Failed to get Gmail profile:', error)
    throw new Error(error.error?.message || 'Failed to get Gmail profile')
  }

  return response.json()
}

/**
 * Send email via Gmail API
 */
export async function sendEmailViaGmail(params: {
  accessToken: string
  to: string
  from: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  inReplyTo?: string
  references?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { accessToken, to, from, subject, text, html, replyTo, inReplyTo, references } = params

  try {
    // Build email headers
    const headers: string[] = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
    ]

    if (replyTo) {
      headers.push(`Reply-To: ${replyTo}`)
    }

    if (inReplyTo) {
      headers.push(`In-Reply-To: ${inReplyTo}`)
    }

    if (references) {
      headers.push(`References: ${references}`)
    }

    let emailContent: string

    if (html) {
      // Multipart email with both plain text and HTML
      const boundary = `boundary_${Date.now()}`
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)

      emailContent = [
        ...headers,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        text,
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        '',
        html,
        `--${boundary}--`,
      ].join('\r\n')
    } else {
      // Plain text only
      headers.push('Content-Type: text/plain; charset="UTF-8"')
      emailContent = [...headers, '', text].join('\r\n')
    }

    // Encode to base64url
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send via Gmail API
    const response = await fetch(`${GMAIL_API_URL}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Gmail] Send error:', error)
      return {
        success: false,
        error: error.error?.message || `Gmail error: ${response.status}`,
      }
    }

    const result = await response.json()
    return {
      success: true,
      messageId: result.id,
    }
  } catch (error) {
    console.error('[Gmail] Send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get recent messages from Gmail (for webhook-like polling)
 */
export async function getRecentGmailMessages(params: {
  accessToken: string
  query?: string
  maxResults?: number
}): Promise<Array<{ id: string; threadId: string }>> {
  const { accessToken, query = 'is:unread', maxResults = 10 } = params

  const url = new URL(`${GMAIL_API_URL}/users/me/messages`)
  url.searchParams.set('q', query)
  url.searchParams.set('maxResults', maxResults.toString())

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[Gmail] Failed to get messages:', error)
    throw new Error(error.error?.message || 'Failed to get Gmail messages')
  }

  const data = await response.json()
  return data.messages || []
}

/**
 * Get a single Gmail message by ID
 */
export async function getGmailMessage(params: {
  accessToken: string
  messageId: string
}): Promise<{
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  text: string
  html?: string
  date: Date
}> {
  const { accessToken, messageId } = params

  const response = await fetch(`${GMAIL_API_URL}/users/me/messages/${messageId}?format=full`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[Gmail] Failed to get message:', error)
    throw new Error(error.error?.message || 'Failed to get Gmail message')
  }

  const data = await response.json()

  // Parse headers
  const headers = data.payload?.headers || []
  const getHeader = (name: string) => headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  // Parse body
  let text = ''
  let html = ''

  const parseBody = (part: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = Buffer.from(part.body.data, 'base64').toString('utf-8')
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = Buffer.from(part.body.data, 'base64').toString('utf-8')
    } else if (part.parts) {
      part.parts.forEach((p) => parseBody(p as { mimeType?: string; body?: { data?: string }; parts?: unknown[] }))
    }
  }

  parseBody(data.payload || {})

  // If no parts, try direct body
  if (!text && !html && data.payload?.body?.data) {
    text = Buffer.from(data.payload.body.data, 'base64').toString('utf-8')
  }

  return {
    id: data.id,
    threadId: data.threadId,
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    text,
    html,
    date: new Date(parseInt(data.internalDate)),
  }
}
