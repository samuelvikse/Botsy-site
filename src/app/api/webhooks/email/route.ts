import { NextRequest, NextResponse } from 'next/server'
import {
  sendEmail,
  parseSendGridInbound,
  parseMailgunInbound,
  extractEmailAddress,
  formatReplySubject,
  type EmailCredentials,
} from '@/lib/email'
import {
  findCompanyByEmail,
  getEmailChannel,
  getBusinessProfile,
  getFAQs,
  getActiveInstructions,
  saveEmailMessage,
  getEmailHistory,
} from '@/lib/email-firestore'
import { generateEmailAIResponse } from '@/lib/email-ai'
import { isSubscriptionActive, getInactiveSubscriptionMessage } from '@/lib/subscription-check'
import { createEscalation } from '@/lib/escalation-firestore'

/**
 * POST - Receive incoming emails from SendGrid or Mailgun
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') || 'sendgrid'

    // Parse the request body based on content type
    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, unknown>

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries()) as Record<string, unknown>
    } else {
      body = await request.json().catch(() => ({}))
    }

    // Parse inbound email based on provider
    let inboundEmail
    if (provider === 'mailgun') {
      inboundEmail = parseMailgunInbound(body)
    } else {
      inboundEmail = parseSendGridInbound(body)
    }

    if (!inboundEmail || !inboundEmail.to || !inboundEmail.from) {
      return NextResponse.json({ status: 'ok', message: 'Could not parse email' })
    }

    // Process the email
    await processEmail(inboundEmail)

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Email Webhook] Error:', error)
    return NextResponse.json({ status: 'error' })
  }
}

async function processEmail(
  email: {
    from: string
    to: string
    subject: string
    text: string
    html?: string
    messageId?: string
    timestamp: Date
  },
) {
  try {
    const toAddress = extractEmailAddress(email.to)
    const fromAddress = extractEmailAddress(email.from)

    // Find company by email address
    const companyId = await findCompanyByEmail(toAddress)

    if (!companyId) {
      return
    }

    // Check subscription status
    const hasActiveSubscription = await isSubscriptionActive(companyId)
    if (!hasActiveSubscription) {
      console.log('[Email] Subscription inactive for company:', companyId)
      // Get channel to send response
      const channel = await getEmailChannel(companyId)
      if (channel?.credentials && channel?.provider) {
        await sendEmail(
          { ...channel.credentials, provider: channel.provider } as EmailCredentials,
          {
            to: fromAddress,
            from: toAddress,
            subject: formatReplySubject(email.subject),
            text: getInactiveSubscriptionMessage('no'),
          }
        )
      }
      return
    }

    // Get email channel configuration
    const channel = await getEmailChannel(companyId)

    if (!channel || !channel.isActive) {
      return
    }

    // Save inbound email to conversation history
    await saveEmailMessage(companyId, fromAddress, {
      direction: 'inbound',
      from: fromAddress,
      to: toAddress,
      subject: email.subject,
      body: email.text,
      timestamp: email.timestamp,
    })

    // Create escalation for notification bell (fire-and-forget)
    const conversationId = `email-${fromAddress.replace(/[.@]/g, '_')}`
    createEscalation({
      companyId,
      conversationId,
      channel: 'email',
      customerIdentifier: fromAddress,
      customerMessage: email.subject,
      status: 'pending',
    }).catch(() => {})

    // Check if auto email reply is enabled (default: true)
    if (channel.autoEmailReply === false) {
      return
    }

    // Get conversation history for context
    const conversationHistory = await getEmailHistory(companyId, fromAddress, 10)

    // Get context for AI
    const [businessProfile, faqs, instructions] = await Promise.all([
      getBusinessProfile(companyId),
      getFAQs(companyId),
      getActiveInstructions(companyId),
    ])

    // Generate AI response using shared module
    const aiResponse = await generateEmailAIResponse({
      emailSubject: email.subject,
      emailBody: email.text,
      senderEmail: fromAddress,
      businessProfile,
      faqs,
      instructions,
      conversationHistory: conversationHistory.map(m => ({
        direction: m.direction,
        subject: m.subject,
        body: m.body,
      })),
    })

    // Build credentials for sending
    const credentials: EmailCredentials = {
      provider: channel.provider,
      apiKey: channel.credentials.apiKey,
      domain: channel.credentials.domain,
      smtpHost: channel.credentials.smtpHost,
      smtpPort: channel.credentials.smtpPort,
      smtpUser: channel.credentials.smtpUser,
      smtpPass: channel.credentials.smtpPass,
      accessToken: channel.credentials.accessToken,
      refreshToken: channel.credentials.refreshToken,
      expiresAt: channel.credentials.expiresAt,
    }

    // Send response email
    const replySubject = formatReplySubject(email.subject)
    await sendEmail(credentials, {
      to: fromAddress,
      from: channel.emailAddress,
      subject: replySubject,
      text: aiResponse,
      replyTo: channel.emailAddress,
    })

    // Save outbound email to conversation history
    await saveEmailMessage(companyId, fromAddress, {
      direction: 'outbound',
      from: channel.emailAddress,
      to: fromAddress,
      subject: replySubject,
      body: aiResponse,
      timestamp: new Date(),
    })

  } catch {
    // Error processing email
  }
}
