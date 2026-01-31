/**
 * Email Service Layer
 * Handles sending emails via various providers (SendGrid, Mailgun, SMTP)
 */

export type EmailProvider = 'sendgrid' | 'mailgun' | 'smtp'

export interface EmailCredentials {
  provider: EmailProvider
  apiKey?: string
  domain?: string
  smtpHost?: string
  smtpPort?: string
  smtpUser?: string
  smtpPass?: string
}

export interface EmailMessage {
  to: string
  from: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}

export interface InboundEmail {
  from: string
  to: string
  subject: string
  text: string
  html?: string
  messageId?: string
  timestamp: Date
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(apiKey: string, message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: message.from },
        reply_to: message.replyTo ? { email: message.replyTo } : undefined,
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Email] SendGrid error:', errorText)
      return { success: false, error: `SendGrid error: ${response.status}` }
    }

    const messageId = response.headers.get('x-message-id') || undefined
    return { success: true, messageId }
  } catch (error) {
    console.error('[Email] SendGrid error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send email via Mailgun
 */
async function sendViaMailgun(apiKey: string, domain: string, message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const formData = new URLSearchParams()
    formData.append('from', message.from)
    formData.append('to', message.to)
    formData.append('subject', message.subject)
    formData.append('text', message.text)
    if (message.html) formData.append('html', message.html)
    if (message.replyTo) formData.append('h:Reply-To', message.replyTo)

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Email] Mailgun error:', errorData)
      return { success: false, error: errorData.message || `Mailgun error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.id }
  } catch (error) {
    console.error('[Email] Mailgun error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send email via SMTP (using nodemailer-style approach with fetch)
 * Note: For production SMTP, you'd typically use nodemailer package
 */
async function sendViaSMTP(credentials: EmailCredentials, message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // SMTP requires a server-side library like nodemailer
  // For now, we'll return an error suggesting to use SendGrid or Mailgun
  console.error('[Email] SMTP not implemented - use SendGrid or Mailgun')
  return {
    success: false,
    error: 'SMTP er ikke støttet ennå. Bruk SendGrid eller Mailgun.'
  }
}

/**
 * Send email using configured provider
 */
export async function sendEmail(
  credentials: EmailCredentials,
  message: EmailMessage
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  switch (credentials.provider) {
    case 'sendgrid':
      if (!credentials.apiKey) {
        return { success: false, error: 'SendGrid API key mangler' }
      }
      return sendViaSendGrid(credentials.apiKey, message)

    case 'mailgun':
      if (!credentials.apiKey || !credentials.domain) {
        return { success: false, error: 'Mailgun API key eller domain mangler' }
      }
      return sendViaMailgun(credentials.apiKey, credentials.domain, message)

    case 'smtp':
      return sendViaSMTP(credentials, message)

    default:
      return { success: false, error: `Ukjent e-postleverandør: ${credentials.provider}` }
  }
}

/**
 * Parse inbound email from SendGrid webhook
 */
export function parseSendGridInbound(body: Record<string, unknown>): InboundEmail | null {
  try {
    return {
      from: (body.from as string) || '',
      to: (body.to as string) || '',
      subject: (body.subject as string) || '',
      text: (body.text as string) || '',
      html: body.html as string | undefined,
      messageId: body.headers as string | undefined,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('[Email] Parse SendGrid error:', error)
    return null
  }
}

/**
 * Parse inbound email from Mailgun webhook
 */
export function parseMailgunInbound(body: Record<string, unknown>): InboundEmail | null {
  try {
    return {
      from: (body.sender as string) || (body.from as string) || '',
      to: (body.recipient as string) || '',
      subject: (body.subject as string) || '',
      text: (body['body-plain'] as string) || (body.text as string) || '',
      html: (body['body-html'] as string) || (body.html as string) || undefined,
      messageId: body['Message-Id'] as string | undefined,
      timestamp: body.timestamp ? new Date(parseInt(body.timestamp as string) * 1000) : new Date(),
    }
  } catch (error) {
    console.error('[Email] Parse Mailgun error:', error)
    return null
  }
}

/**
 * Verify Mailgun webhook signature
 */
export function verifyMailgunSignature(
  apiKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(timestamp + token)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('[Email] Signature verification error:', error)
    return false
  }
}

/**
 * Extract email address from "Name <email>" format
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/)
  return match ? match[1] : emailString.trim()
}

/**
 * Format email for reply
 */
export function formatReplySubject(originalSubject: string): string {
  if (originalSubject.toLowerCase().startsWith('re:')) {
    return originalSubject
  }
  return `Re: ${originalSubject}`
}
