import { NextRequest, NextResponse } from 'next/server'
import { getSMSProvider, formatPhoneNumber } from '@/lib/sms'
import {
  findCompanyByPhone,
  getSMSChannel,
  getSMSHistory,
  saveSMSMessage,
} from '@/lib/sms-firestore'
import { getCompany, getInstructions } from '@/lib/firestore'
import { chatWithCustomer } from '@/lib/groq'
import type { SMSMessage, SMSProvider } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Get provider from query parameter
    const provider = (request.nextUrl.searchParams.get('provider') || 'mock') as SMSProvider

    // Clone the request multiple times for different operations
    const requestForParse = request.clone()
    const requestForValidation = request.clone()

    // First, parse the incoming message to get the "to" phone number
    const tempProvider = getSMSProvider(provider, {})
    const tempMessage = await tempProvider.parseInboundMessage(requestForParse)

    // Format phone numbers
    const toPhone = formatPhoneNumber(tempMessage.to)

    // Find company by phone number to get credentials for validation
    const companyId = await findCompanyByPhone(toPhone)

    if (!companyId) {
      return NextResponse.json(
        { error: 'Phone number not registered' },
        { status: 404 }
      )
    }

    // Get SMS channel configuration with credentials
    const smsChannel = await getSMSChannel(companyId)
    if (!smsChannel || !smsChannel.isActive) {
      return NextResponse.json(
        { error: 'SMS not configured for this company' },
        { status: 404 }
      )
    }

    // Now validate webhook with actual credentials
    const smsProviderWithCreds = getSMSProvider(smsChannel.provider, smsChannel.credentials)
    const isValid = await smsProviderWithCreds.validateWebhook(requestForValidation)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Use the already parsed message
    const inboundMessage = tempMessage
    const fromPhone = formatPhoneNumber(inboundMessage.from)

    // Get company data
    const company = await getCompany(companyId)
    if (!company || !company.businessProfile) {
      return NextResponse.json(
        { error: 'Company not configured' },
        { status: 404 }
      )
    }

    // Save the inbound message
    const inboundSMSMessage: Omit<SMSMessage, 'id'> = {
      direction: 'inbound',
      from: fromPhone,
      to: toPhone,
      body: inboundMessage.body,
      status: 'delivered',
      providerMessageId: inboundMessage.providerMessageId,
      timestamp: inboundMessage.timestamp,
    }

    await saveSMSMessage(companyId, fromPhone, inboundSMSMessage)

    // Get conversation history for context
    const smsHistory = await getSMSHistory(companyId, fromPhone, 10)

    // Convert SMS history to conversation format
    const conversationHistory = smsHistory.map((msg) => ({
      role: (msg.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.body,
    }))

    // Get active instructions
    const instructions = await getInstructions(companyId, true)

    // Generate AI response
    const reply = await chatWithCustomer(inboundMessage.body, {
      businessProfile: company.businessProfile,
      faqs: company.businessProfile.faqs,
      instructions,
      conversationHistory,
    })

    // Use the provider with credentials for sending (already created above)
    const sendProvider = smsProviderWithCreds

    // Send reply SMS
    const sendResult = await sendProvider.sendSMS(
      fromPhone,
      toPhone,
      reply
    )

    // Save the outbound message
    const outboundSMSMessage: Omit<SMSMessage, 'id'> = {
      direction: 'outbound',
      from: toPhone,
      to: fromPhone,
      body: reply,
      status: sendResult.status === 'sent' ? 'sent' : 'failed',
      providerMessageId: sendResult.messageId,
      timestamp: new Date(),
    }

    await saveSMSMessage(companyId, fromPhone, outboundSMSMessage)

    // Return appropriate response for the provider
    if (smsChannel.provider === 'twilio') {
      // Twilio expects TwiML response for auto-reply (optional)
      // We've already sent the message via API, so just return 200
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider')

  // MessageBird verification
  if (provider === 'messagebird') {
    const challenge = request.nextUrl.searchParams.get('hub.challenge')
    if (challenge) {
      return new NextResponse(challenge)
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: 'SMS webhook endpoint is active',
  })
}
