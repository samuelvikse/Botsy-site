import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { saveSMSChannel, getSMSChannel, deleteSMSChannel } from '@/lib/sms-firestore'
import type { ChannelType, SMSProvider } from '@/types'

// Initialize Firebase Admin
function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }
  return getFirestore()
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

    // Get SMS channel from subcollection (with encryption support)
    let smsChannel = null
    try {
      const sms = await getSMSChannel(companyId)
      if (sms) {
        smsChannel = {
          provider: sms.provider,
          phoneNumber: sms.phoneNumber,
          isActive: sms.isActive,
          isVerified: sms.isVerified,
          // Don't expose credentials in GET response
          hasCredentials: !!sms.credentials && Object.keys(sms.credentials).length > 0,
        }
      }
    } catch {
      // SMS channel doesn't exist yet
    }

    // Get other channels from company document
    const db = getAdminDb()
    const companyDoc = await db.collection('companies').doc(companyId).get()
    const data = companyDoc.exists ? companyDoc.data() : {}
    const channels = data?.channels || {}

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

    // Handle SMS separately (uses subcollection with encryption)
    if (channel === 'sms') {
      if (!config.phoneNumber) {
        return NextResponse.json(
          { success: false, error: 'Telefonnummer er påkrevd' },
          { status: 400 }
        )
      }

      await saveSMSChannel(companyId, {
        provider: (config.provider || 'twilio') as SMSProvider,
        phoneNumber: config.phoneNumber,
        isActive: true,
        isVerified: false,
        credentials: config.credentials || {},
      })

      return NextResponse.json({
        success: true,
        message: 'SMS konfigurert',
      })
    }

    // Handle other channels (stored in company document)
    const db = getAdminDb()
    const docRef = db.collection('companies').doc(companyId)

    let channelData: Record<string, unknown> = {
      isActive: true,
      isVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
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

    // Update Firestore
    await docRef.set(
      {
        channels: {
          [channel]: channelData,
        },
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

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
      await deleteSMSChannel(companyId)
      return NextResponse.json({
        success: true,
        message: 'SMS frakoblet',
      })
    }

    // Handle other channels
    const db = getAdminDb()
    const docRef = db.collection('companies').doc(companyId)

    // Remove the channel by setting it to null
    await docRef.set(
      {
        channels: {
          [channel]: null,
        },
        updatedAt: Timestamp.now(),
      },
      { merge: true }
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
