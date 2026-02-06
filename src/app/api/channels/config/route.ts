import { NextRequest, NextResponse } from 'next/server'
import type { ChannelType, SMSProvider } from '@/types'
import { parseFirestoreFields, toFirestoreValue } from '@/lib/firestore-utils'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'botsy-no'
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

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

    if (!channel || !['sms', 'messenger', 'instagram', 'email'].includes(channel)) {
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

    if (!channel || !['sms', 'messenger', 'instagram', 'email'].includes(channel)) {
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
