import crypto from 'crypto'
import type { SMSCredentials, SMSProvider as SMSProviderType } from '@/types'

// ============================================
// SMS Provider Interface
// ============================================

export interface InboundSMS {
  from: string
  to: string
  body: string
  providerMessageId: string
  timestamp: Date
}

export interface SendSMSResult {
  messageId: string
  status: 'sent' | 'failed'
  error?: string
}

export interface SMSProviderInterface {
  sendSMS(to: string, from: string, body: string): Promise<SendSMSResult>
  validateWebhook(request: Request): Promise<boolean>
  parseInboundMessage(request: Request): Promise<InboundSMS>
}

// ============================================
// Mock SMS Provider (for development/testing)
// ============================================

export class MockSMSProvider implements SMSProviderInterface {
  async sendSMS(to: string, from: string, body: string): Promise<SendSMSResult> {
    console.log(`[MOCK SMS] From: ${from}, To: ${to}, Body: ${body}`)
    return {
      messageId: 'mock-' + Date.now(),
      status: 'sent',
    }
  }

  async validateWebhook(): Promise<boolean> {
    // Mock always validates
    return true
  }

  async parseInboundMessage(request: Request): Promise<InboundSMS> {
    const body = await request.json()
    return {
      from: body.from || '+4799999999',
      to: body.to || '+4712345678',
      body: body.body || body.message || 'Test message',
      providerMessageId: body.messageId || 'mock-inbound-' + Date.now(),
      timestamp: new Date(),
    }
  }
}

// ============================================
// Twilio SMS Provider
// ============================================

export class TwilioProvider implements SMSProviderInterface {
  private accountSid: string
  private authToken: string

  constructor(credentials: SMSCredentials) {
    if (!credentials.accountSid || !credentials.authToken) {
      throw new Error('Twilio requires accountSid and authToken')
    }
    this.accountSid = credentials.accountSid
    this.authToken = credentials.authToken
  }

  async sendSMS(to: string, from: string, body: string): Promise<SendSMSResult> {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`

      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

      const formData = new URLSearchParams()
      formData.append('To', to)
      formData.append('From', from)
      formData.append('Body', body)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      const data = await response.json()

      if (response.ok) {
        return {
          messageId: data.sid,
          status: 'sent',
        }
      } else {
        return {
          messageId: '',
          status: 'failed',
          error: data.message || 'Failed to send SMS',
        }
      }
    } catch (error) {
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async validateWebhook(request: Request): Promise<boolean> {
    const twilioSignature = request.headers.get('X-Twilio-Signature')

    if (!twilioSignature) {
      // Allow in development if no signature
      if (process.env.NODE_ENV === 'development') {
        console.warn('Missing Twilio signature header - allowing in development')
        return true
      }
      return false
    }

    // Get the webhook URL from environment or construct it
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/sms?provider=twilio`

    try {
      // Clone request to read body
      const clonedRequest = request.clone()
      const formData = await clonedRequest.formData()

      // Sort parameters alphabetically and concatenate
      const params: Record<string, string> = {}
      formData.forEach((value, key) => {
        params[key] = value.toString()
      })

      const sortedKeys = Object.keys(params).sort()
      let dataString = webhookUrl
      for (const key of sortedKeys) {
        dataString += key + params[key]
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha1', this.authToken)
        .update(dataString, 'utf8')
        .digest('base64')

      // Compare signatures
      const isValid = crypto.timingSafeEqual(
        Buffer.from(twilioSignature),
        Buffer.from(expectedSignature)
      )

      if (!isValid) {
        console.error('Twilio signature validation failed')
      }

      return isValid
    } catch (error) {
      console.error('Error validating Twilio webhook:', error)
      // Allow in development
      return process.env.NODE_ENV === 'development'
    }
  }

  async parseInboundMessage(request: Request): Promise<InboundSMS> {
    // Twilio sends data as form-urlencoded
    const formData = await request.formData()

    return {
      from: formData.get('From')?.toString() || '',
      to: formData.get('To')?.toString() || '',
      body: formData.get('Body')?.toString() || '',
      providerMessageId: formData.get('MessageSid')?.toString() || '',
      timestamp: new Date(),
    }
  }
}

// ============================================
// MessageBird SMS Provider
// ============================================

export class MessageBirdProvider implements SMSProviderInterface {
  private apiKey: string
  private signingKey: string | null

  constructor(credentials: SMSCredentials) {
    if (!credentials.apiKey) {
      throw new Error('MessageBird requires apiKey')
    }
    this.apiKey = credentials.apiKey
    // MessageBird signing key is optional but recommended
    this.signingKey = process.env.MESSAGEBIRD_SIGNING_KEY || null
  }

  async sendSMS(to: string, from: string, body: string): Promise<SendSMSResult> {
    try {
      const url = 'https://rest.messagebird.com/messages'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [to],
          originator: from,
          body: body,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        return {
          messageId: data.id,
          status: 'sent',
        }
      } else {
        return {
          messageId: '',
          status: 'failed',
          error: data.errors?.[0]?.description || 'Failed to send SMS',
        }
      }
    } catch (error) {
      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async validateWebhook(request: Request): Promise<boolean> {
    const signature = request.headers.get('MessageBird-Signature')
    const timestamp = request.headers.get('MessageBird-Request-Timestamp')

    if (!signature || !timestamp) {
      // Allow in development if no signature
      if (process.env.NODE_ENV === 'development') {
        console.warn('Missing MessageBird signature headers - allowing in development')
        return true
      }
      return false
    }

    // If no signing key configured, allow but warn
    if (!this.signingKey) {
      console.warn('MessageBird signing key not configured - skipping signature validation')
      return true
    }

    try {
      // Clone request to read body
      const clonedRequest = request.clone()
      const bodyText = await clonedRequest.text()

      // MessageBird signature = HMAC-SHA256(timestamp + '\n' + body, signingKey)
      const payload = timestamp + '\n' + bodyText
      const expectedSignature = crypto
        .createHmac('sha256', this.signingKey)
        .update(payload, 'utf8')
        .digest('hex')

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )

      if (!isValid) {
        console.error('MessageBird signature validation failed')
      }

      return isValid
    } catch (error) {
      console.error('Error validating MessageBird webhook:', error)
      return process.env.NODE_ENV === 'development'
    }
  }

  async parseInboundMessage(request: Request): Promise<InboundSMS> {
    const body = await request.json()

    return {
      from: body.originator || body.from || '',
      to: body.recipient || body.to || '',
      body: body.body || body.message || '',
      providerMessageId: body.id || '',
      timestamp: new Date(body.createdDatetime || Date.now()),
    }
  }
}

// ============================================
// Provider Factory
// ============================================

export function getSMSProvider(
  provider: SMSProviderType,
  credentials: SMSCredentials
): SMSProviderInterface {
  switch (provider) {
    case 'twilio':
      return new TwilioProvider(credentials)
    case 'messagebird':
      return new MessageBirdProvider(credentials)
    case 'none':
    default:
      return new MockSMSProvider()
  }
}

// ============================================
// Utility Functions
// ============================================

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume Norwegian number if no country code
    if (cleaned.length === 8) {
      cleaned = '+47' + cleaned
    } else if (cleaned.startsWith('47') && cleaned.length === 10) {
      cleaned = '+' + cleaned
    } else {
      cleaned = '+' + cleaned
    }
  }

  return cleaned
}

export function isValidE164(phone: string): boolean {
  // E.164 format: +[country code][number], max 15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}
