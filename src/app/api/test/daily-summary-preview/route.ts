import { NextRequest, NextResponse } from 'next/server'
import { renderDailySummaryEmail } from '@/emails/DailySummaryEmail'

/**
 * POST - Generate a preview of the daily summary email
 * For developer testing only
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Generate sample data for preview
    const today = new Date()
    const dateStr = today.toLocaleDateString('nb-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const sampleData = {
      companyName: 'Test Bedrift AS',
      date: dateStr,
      stats: {
        totalConversations: 24,
        resolvedByBot: 78,
        escalatedToHuman: 22,
        avgResponseTime: '2.3s',
      },
      employeeOfTheDay: {
        name: 'Anna Johansen',
        points: 145,
        conversationsHandled: 12,
      },
      insights: [
        'Botsy håndterte 78% av samtalene automatisk i dag - godt jobbet!',
        '24 samtaler i dag - høy aktivitet!',
        'Anna Johansen var mest aktiv med 145 poeng.',
      ],
      recentEscalations: [
        {
          customerName: 'Besøkende a1b2c3',
          message: 'Jeg vil gjerne snakke med en ansatt om returer',
          time: '14:32',
          channel: 'Widget',
        },
        {
          customerName: 'Facebook d4e5f6',
          message: 'Trenger hjelp med bestillingen min',
          time: '13:15',
          channel: 'Messenger',
        },
      ],
      unsubscribeUrl: 'https://botsy.no/admin?settings=notifications',
    }

    const html = renderDailySummaryEmail(sampleData)

    return NextResponse.json({
      success: true,
      html,
    })
  } catch (error) {
    console.error('[Daily Summary Preview] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
