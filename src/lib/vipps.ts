/**
 * Vipps Recurring API Integration
 *
 * Handles subscription payments through Vipps MobilePay.
 * Documentation: https://developer.vippsmobilepay.com/docs/APIs/recurring-api/
 */

// Vipps API Configuration
export const VIPPS_CONFIG = {
  clientId: process.env.VIPPS_CLIENT_ID || '',
  clientSecret: process.env.VIPPS_CLIENT_SECRET || '',
  subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY || '',
  merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
  apiUrl: process.env.VIPPS_API_URL || 'https://api.vipps.no',
  // Use test API for development
  isTest: process.env.NODE_ENV !== 'production',
}

// Check if Vipps is configured
export const isVippsConfigured = () => {
  return !!(
    VIPPS_CONFIG.clientId &&
    VIPPS_CONFIG.clientSecret &&
    VIPPS_CONFIG.subscriptionKey &&
    VIPPS_CONFIG.merchantSerialNumber
  )
}

// Token cache
let accessToken: string | null = null
let tokenExpiry: number = 0

/**
 * Get Vipps access token
 */
export async function getVippsAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken
  }

  const response = await fetch(`${VIPPS_CONFIG.apiUrl}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'client_id': VIPPS_CONFIG.clientId,
      'client_secret': VIPPS_CONFIG.clientSecret,
      'Ocp-Apim-Subscription-Key': VIPPS_CONFIG.subscriptionKey,
      'Merchant-Serial-Number': VIPPS_CONFIG.merchantSerialNumber,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[Vipps] Failed to get access token:', error)
    throw new Error('Failed to get Vipps access token')
  }

  const data = await response.json()
  accessToken = data.access_token as string
  // Token expires in seconds, convert to milliseconds
  tokenExpiry = Date.now() + (data.expires_in * 1000)

  return accessToken!
}

/**
 * Create Vipps API headers
 */
async function getVippsHeaders(): Promise<Record<string, string>> {
  const token = await getVippsAccessToken()
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': VIPPS_CONFIG.subscriptionKey,
    'Merchant-Serial-Number': VIPPS_CONFIG.merchantSerialNumber,
    'Vipps-System-Name': 'Botsy',
    'Vipps-System-Version': '1.0.0',
  }
}

// Agreement (subscription) types
export interface VippsAgreement {
  agreementId: string
  status: 'PENDING' | 'ACTIVE' | 'STOPPED' | 'EXPIRED'
  productName: string
  price: number // in øre (cents)
  productDescription?: string
  interval: {
    unit: 'MONTH' | 'WEEK' | 'DAY'
    count: number
  }
  campaign?: {
    type: 'PRICE_CAMPAIGN' | 'PERIOD_CAMPAIGN' | 'EVENT_CAMPAIGN'
    price?: number
    period?: {
      unit: 'MONTH' | 'WEEK' | 'DAY'
      count: number
    }
  }
}

export interface CreateAgreementParams {
  customerPhoneNumber: string
  productName: string
  productDescription?: string
  price: number // in NOK (will be converted to øre)
  interval: 'MONTHLY' | 'WEEKLY'
  companyId: string
  userId: string
  // Optional trial period
  trialDays?: number
}

/**
 * Create a new Vipps recurring agreement (subscription)
 */
export async function createVippsAgreement(params: CreateAgreementParams): Promise<{
  agreementId: string
  vippsConfirmationUrl: string
}> {
  const headers = await getVippsHeaders()

  // Convert NOK to øre
  const priceInOre = Math.round(params.price * 100)

  // Generate unique agreement ID
  const agreementId = `botsy-${params.companyId}-${Date.now()}`

  // Build request body
  const body: Record<string, unknown> = {
    pricing: {
      type: 'LEGACY',
      amount: priceInOre,
      currency: 'NOK',
    },
    interval: {
      unit: params.interval === 'MONTHLY' ? 'MONTH' : 'WEEK',
      count: 1,
    },
    merchantRedirectUrl: `https://botsy.no/admin/fakturering?vipps=success&agreementId=${agreementId}`,
    merchantAgreementUrl: 'https://botsy.no/vilkar',
    phoneNumber: params.customerPhoneNumber.replace(/\s/g, ''),
    productName: params.productName,
    productDescription: params.productDescription || 'Botsy AI Kundeservice',
    externalId: agreementId,
  }

  // Add trial period if specified
  if (params.trialDays && params.trialDays > 0) {
    body.campaign = {
      type: 'PERIOD_CAMPAIGN',
      price: 0, // Free trial
      period: {
        unit: 'DAY',
        count: params.trialDays,
      },
    }
  }

  const response = await fetch(
    `${VIPPS_CONFIG.apiUrl}/recurring/v3/agreements`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Idempotency-Key': agreementId,
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('[Vipps] Failed to create agreement:', error)
    throw new Error(`Failed to create Vipps agreement: ${error}`)
  }

  const data = await response.json()

  return {
    agreementId: data.agreementId,
    vippsConfirmationUrl: data.vippsConfirmationUrl,
  }
}

/**
 * Get agreement details
 */
export async function getVippsAgreement(agreementId: string): Promise<VippsAgreement | null> {
  const headers = await getVippsHeaders()

  const response = await fetch(
    `${VIPPS_CONFIG.apiUrl}/recurring/v3/agreements/${agreementId}`,
    {
      method: 'GET',
      headers,
    }
  )

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.text()
    console.error('[Vipps] Failed to get agreement:', error)
    throw new Error(`Failed to get Vipps agreement: ${error}`)
  }

  return response.json()
}

/**
 * Stop (cancel) an agreement
 */
export async function stopVippsAgreement(agreementId: string): Promise<void> {
  const headers = await getVippsHeaders()

  const response = await fetch(
    `${VIPPS_CONFIG.apiUrl}/recurring/v3/agreements/${agreementId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'STOPPED',
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('[Vipps] Failed to stop agreement:', error)
    throw new Error(`Failed to stop Vipps agreement: ${error}`)
  }
}

/**
 * Create a charge for an agreement
 */
export async function createVippsCharge(params: {
  agreementId: string
  amount: number // in NOK
  description: string
  dueDate: string // YYYY-MM-DD
  orderId: string
}): Promise<{ chargeId: string }> {
  const headers = await getVippsHeaders()

  const response = await fetch(
    `${VIPPS_CONFIG.apiUrl}/recurring/v3/agreements/${params.agreementId}/charges`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Idempotency-Key': params.orderId,
      },
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // Convert to øre
        transactionType: 'RECURRING',
        description: params.description,
        due: params.dueDate,
        retryDays: 5,
        orderId: params.orderId,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('[Vipps] Failed to create charge:', error)
    throw new Error(`Failed to create Vipps charge: ${error}`)
  }

  const data = await response.json()
  return { chargeId: data.chargeId }
}

/**
 * Get charge status
 */
export async function getVippsCharge(agreementId: string, chargeId: string): Promise<{
  chargeId: string
  status: 'PENDING' | 'DUE' | 'RESERVED' | 'CHARGED' | 'FAILED' | 'CANCELLED' | 'PARTIALLY_REFUNDED' | 'REFUNDED'
  amount: number
  dueDate: string
}> {
  const headers = await getVippsHeaders()

  const response = await fetch(
    `${VIPPS_CONFIG.apiUrl}/recurring/v3/agreements/${agreementId}/charges/${chargeId}`,
    {
      method: 'GET',
      headers,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('[Vipps] Failed to get charge:', error)
    throw new Error(`Failed to get Vipps charge: ${error}`)
  }

  return response.json()
}

/**
 * Refund a charge
 */
export async function refundVippsCharge(params: {
  agreementId: string
  chargeId: string
  amount: number // in NOK
  description: string
}): Promise<void> {
  const headers = await getVippsHeaders()

  const response = await fetch(
    `${VIPPS_CONFIG.apiUrl}/recurring/v3/agreements/${params.agreementId}/charges/${params.chargeId}/refund`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Idempotency-Key': `refund-${params.chargeId}-${Date.now()}`,
      },
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // Convert to øre
        description: params.description,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('[Vipps] Failed to refund charge:', error)
    throw new Error(`Failed to refund Vipps charge: ${error}`)
  }
}

// Webhook event types
export type VippsWebhookEvent =
  | 'recurring.agreement-activated.v1'
  | 'recurring.agreement-rejected.v1'
  | 'recurring.agreement-stopped.v1'
  | 'recurring.agreement-expired.v1'
  | 'recurring.charge-reserved.v1'
  | 'recurring.charge-captured.v1'
  | 'recurring.charge-failed.v1'
  | 'recurring.charge-cancelled.v1'

export interface VippsWebhookPayload {
  msn: string
  reference: string
  pspReference: string
  name: VippsWebhookEvent
  currency: string
  amount: number
  timestamp: string
  idempotencyKey: string
  agreementId?: string
  chargeId?: string
}

/**
 * Parse and validate Vipps webhook payload
 */
export function parseVippsWebhook(body: unknown): VippsWebhookPayload {
  // In production, you should validate the webhook signature
  // using the Authorization header and Vipps' public key
  return body as VippsWebhookPayload
}
