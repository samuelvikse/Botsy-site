import { NextRequest, NextResponse } from 'next/server'
import type { ChannelType, SMSProvider } from '@/types'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

/**
 * Parse Firestore document fields to JavaScript object
 */
function parseFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fields)) {
    const v = value as Record<string, unknown>
    if ('stringValue' in v) result[key] = v.stringValue
    else if ('integerValue' in v) result[key] = parseInt(v.integerValue as string)
    else if ('doubleValue' in v) result[key] = v.doubleValue
    else if ('booleanValue' in v) result[key] = v.booleanValue
    else if ('timestampValue' in v) result[key] = new Date(v.timestampValue as string)
    else if ('mapValue' in v) {
      const mapValue = v.mapValue as { fields?: Record<string, unknown> }
      result[key] = mapValue.fields ? parseFirestoreFields(mapValue.fields) : {}
    }
    else if ('arrayValue' in v) {
      const arrayValue = v.arrayValue as { values?: unknown[] }
      result[key] = arrayValue.values || []
    }
    else if ('nullValue' in v) result[key] = null
  }

  return result
}

/**
 * Convert JavaScript value to Firestore field format
 */
function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { nullValue: null }
  }
  if (typeof value === 'string') {
    return { stringValue: value }
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) }
    }
    return { doubleValue: value }
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value }
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() }
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    }
  }
  if (typeof value === 'object') {
    const fields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(value) }
}

// GET - Fetch all channel configurations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID er påkrevd' },
        { status: 400 }
      )
    }

    // Get SMS channel from subcollection
    let smsChannel = null
    try {
      const smsResponse = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}/channels/sms`)
      if (smsResponse.ok) {
        const smsDoc = await smsResponse.json()
        if (smsDoc.fields) {
          const smsData = parseFirestoreFields(smsDoc.fields)
          smsChannel = {
            provider: smsData.provider,
            phoneNumber: smsData.phoneNumber,
            isActive: smsData.isActive,
            isVerified: smsData.isVerified,
            hasCredentials: !!smsData.credentials,
          }
        }
      }
    } catch {
      // SMS channel doesn't exist yet
    }

    // Get other channels from company document
    const response = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}`)

    let channels: Record<string, unknown> = {}
    if (response.ok) {
      const doc = await response.json()
      if (doc.fields) {
        const data = parseFirestoreFields(doc.fields)
        channels = (data.channels as Record<string, unknown>) || {}
      }
    }

    return NextResponse.json({
      success: true,
      channels: {
        sms: smsChannel,
        whatsapp: channels.whatsapp || null,
        messenger: channels.messenger || null,
        email: channels.email || null,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke hente kanalkonfigurasjon' },
      { status: 500 }
    )
  }
}

// POST - Save channel configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, channel, ...config } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID er påkrevd' },
        { status: 400 }
      )
    }

    if (!channel || !['sms', 'whatsapp', 'messenger', 'email'].includes(channel)) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig kanal' },
        { status: 400 }
      )
    }

    // Handle SMS separately (uses subcollection)
    if (channel === 'sms') {
      if (!config.phoneNumber) {
        return NextResponse.json(
          { success: false, error: 'Telefonnummer er påkrevd' },
          { status: 400 }
        )
      }

      const smsData = {
        fields: {
          provider: toFirestoreValue((config.provider || 'twilio') as SMSProvider),
          phoneNumber: toFirestoreValue(config.phoneNumber),
          isActive: toFirestoreValue(true),
          isVerified: toFirestoreValue(false),
          credentials: toFirestoreValue(config.credentials || {}),
          createdAt: toFirestoreValue(new Date()),
          updatedAt: toFirestoreValue(new Date()),
        }
      }

      const smsResponse = await fetch(
        `${FIRESTORE_BASE_URL}/companies/${companyId}/channels/sms`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(smsData),
        }
      )

      if (!smsResponse.ok) {
        throw new Error('Failed to save SMS channel')
      }

      return NextResponse.json({
        success: true,
        message: 'SMS konfigurert',
      })
    }

    // Handle other channels (stored in company document)
    const now = new Date()
    let channelData: Record<string, unknown> = {
      isActive: true,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    }

    switch (channel) {
      case 'whatsapp':
        if (!config.phoneNumber) {
          return NextResponse.json(
            { success: false, error: 'Telefonnummer er påkrevd' },
            { status: 400 }
          )
        }
        channelData = {
          ...channelData,
          provider: config.provider || 'meta',
          phoneNumber: config.phoneNumber,
          credentials: config.credentials || {},
        }
        break

      case 'messenger':
        if (!config.pageId || !config.pageName) {
          return NextResponse.json(
            { success: false, error: 'Page ID og Page Name er påkrevd' },
            { status: 400 }
          )
        }
        channelData = {
          ...channelData,
          pageId: config.pageId,
          pageName: config.pageName,
          credentials: config.credentials || {},
        }
        break

      case 'email':
        if (!config.emailAddress) {
          return NextResponse.json(
            { success: false, error: 'E-postadresse er påkrevd' },
            { status: 400 }
          )
        }
        channelData = {
          ...channelData,
          provider: config.provider || 'sendgrid',
          emailAddress: config.emailAddress,
          credentials: config.credentials || {},
        }
        break
    }

    // Get existing document first
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}`)
    let existingChannels: Record<string, unknown> = {}

    if (getResponse.ok) {
      const doc = await getResponse.json()
      if (doc.fields) {
        const data = parseFirestoreFields(doc.fields)
        existingChannels = (data.channels as Record<string, unknown>) || {}
      }
    }

    // Merge with new channel data
    const mergedChannels = {
      ...existingChannels,
      [channel]: channelData,
    }

    // Update Firestore using PATCH with updateMask
    const updateData = {
      fields: {
        channels: toFirestoreValue(mergedChannels),
        updatedAt: toFirestoreValue(now),
      }
    }

    const updateResponse = await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}?updateMask.fieldPaths=channels&updateMask.fieldPaths=updatedAt`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      }
    )

    if (!updateResponse.ok) {
      throw new Error('Failed to update channel')
    }

    return NextResponse.json({
      success: true,
      message: `${channel.charAt(0).toUpperCase() + channel.slice(1)} konfigurert`,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke lagre kanalkonfigurasjon' },
      { status: 500 }
    )
  }
}

// DELETE - Remove channel configuration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const channel = searchParams.get('channel') as ChannelType

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID er påkrevd' },
        { status: 400 }
      )
    }

    if (!channel || !['sms', 'whatsapp', 'messenger', 'email'].includes(channel)) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig kanal' },
        { status: 400 }
      )
    }

    // Handle SMS separately (uses subcollection)
    if (channel === 'sms') {
      // Deactivate SMS channel
      const smsData = {
        fields: {
          isActive: toFirestoreValue(false),
          updatedAt: toFirestoreValue(new Date()),
        }
      }

      await fetch(
        `${FIRESTORE_BASE_URL}/companies/${companyId}/channels/sms?updateMask.fieldPaths=isActive&updateMask.fieldPaths=updatedAt`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(smsData),
        }
      )

      return NextResponse.json({
        success: true,
        message: 'SMS frakoblet',
      })
    }

    // Handle other channels - get existing and update
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/companies/${companyId}`)
    let existingChannels: Record<string, unknown> = {}

    if (getResponse.ok) {
      const doc = await getResponse.json()
      if (doc.fields) {
        const data = parseFirestoreFields(doc.fields)
        existingChannels = (data.channels as Record<string, unknown>) || {}
      }
    }

    // Set channel to null/inactive
    const mergedChannels = {
      ...existingChannels,
      [channel]: null,
    }

    const updateData = {
      fields: {
        channels: toFirestoreValue(mergedChannels),
        updatedAt: toFirestoreValue(new Date()),
      }
    }

    await fetch(
      `${FIRESTORE_BASE_URL}/companies/${companyId}?updateMask.fieldPaths=channels&updateMask.fieldPaths=updatedAt`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      }
    )

    return NextResponse.json({
      success: true,
      message: `${channel.charAt(0).toUpperCase() + channel.slice(1)} frakoblet`,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Kunne ikke fjerne kanal' },
      { status: 500 }
    )
  }
}
