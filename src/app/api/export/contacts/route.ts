import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateContactListExcel, timestampToDate } from '@/lib/excel-export'
import { verifyAuth, requireCompanyAccess, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'
import { adminCorsHeaders } from '@/lib/cors'

export async function OPTIONS() {
  return NextResponse.json({}, { headers: adminCorsHeaders })
}

export async function GET(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return unauthorizedResponse()

  const companyId = request.nextUrl.searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  const access = await requireCompanyAccess(user.uid, companyId, user.token)
  if (!access) return forbiddenResponse()

  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
  }

  try {
    const contacts: Array<{
      identifier: string
      channel: 'sms' | 'widget' | 'email' | 'messenger'
      firstContact: Date
      lastContact: Date
      conversationCount: number
      messageCount: number
    }> = []

    // Get SMS contacts
    const smsChatsRef = collection(db, 'companies', companyId, 'smsChats')
    const smsChatsSnap = await getDocs(smsChatsRef)

    smsChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []
      const timestamps = messages
        .map((m: { timestamp: unknown }) => timestampToDate(m.timestamp))
        .filter((d: Date) => !isNaN(d.getTime()))

      if (timestamps.length > 0) {
        contacts.push({
          identifier: data.customerPhone || doc.id,
          channel: 'sms',
          firstContact: new Date(Math.min(...timestamps.map((d: Date) => d.getTime()))),
          lastContact: new Date(Math.max(...timestamps.map((d: Date) => d.getTime()))),
          conversationCount: 1,
          messageCount: messages.length,
        })
      }
    })

    // Get Widget contacts (anonymous, use session ID)
    const widgetChatsRef = collection(db, 'companies', companyId, 'customerChats')
    const widgetChatsSnap = await getDocs(widgetChatsRef)

    widgetChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []

      const createdAt = timestampToDate(data.createdAt)
      const updatedAt = timestampToDate(data.updatedAt)

      contacts.push({
        identifier: `Besøkende ${doc.id.slice(0, 8)}`,
        channel: 'widget',
        firstContact: createdAt,
        lastContact: updatedAt,
        conversationCount: 1,
        messageCount: messages.length,
      })
    })

    // Get Email contacts
    const emailChatsRef = collection(db, 'companies', companyId, 'emailChats')
    const emailChatsSnap = await getDocs(emailChatsRef)

    emailChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []

      const timestamps = messages
        .map((m: { timestamp?: unknown; receivedAt?: unknown }) =>
          timestampToDate(m.timestamp || m.receivedAt)
        )
        .filter((d: Date) => !isNaN(d.getTime()))

      if (timestamps.length > 0) {
        contacts.push({
          identifier: data.customerEmail || doc.id,
          channel: 'email',
          firstContact: new Date(Math.min(...timestamps.map((d: Date) => d.getTime()))),
          lastContact: new Date(Math.max(...timestamps.map((d: Date) => d.getTime()))),
          conversationCount: 1,
          messageCount: messages.length,
        })
      }
    })

    // Get Messenger contacts
    const messengerChatsRef = collection(db, 'companies', companyId, 'messengerChats')
    const messengerChatsSnap = await getDocs(messengerChatsRef)

    messengerChatsSnap.forEach((doc) => {
      const data = doc.data()
      const messages = data.messages || []

      const createdAt = timestampToDate(data.createdAt)
      const lastMessageAt = timestampToDate(data.lastMessageAt || data.updatedAt)

      contacts.push({
        identifier: `Messenger ${doc.id.slice(0, 8)}`,
        channel: 'messenger',
        firstContact: createdAt,
        lastContact: lastMessageAt,
        conversationCount: 1,
        messageCount: messages.length,
      })
    })

    // Sort by last contact (most recent first)
    contacts.sort((a, b) => b.lastContact.getTime() - a.lastContact.getTime())

    // Generate Excel file
    const excelBuffer = await generateContactListExcel(contacts)

    // Return as downloadable file
    const filename = `botsy-kontakter-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating contact export:', error)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
