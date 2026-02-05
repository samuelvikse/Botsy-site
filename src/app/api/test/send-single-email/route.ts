/**
 * Send a single email template for testing
 * POST /api/test/send-single-email
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { TeamInvitationEmail } from '@/emails/TeamInvitationEmail'
import { OwnershipTransferRequestEmail } from '@/emails/OwnershipTransferRequestEmail'
import { OwnershipTransferOfferEmail } from '@/emails/OwnershipTransferOfferEmail'
import { OwnershipTransferCompleteEmail } from '@/emails/OwnershipTransferCompleteEmail'
import { DailySummaryEmail, renderDailySummaryEmail } from '@/emails/DailySummaryEmail'
import { SubscriptionConfirmationEmail } from '@/emails/SubscriptionConfirmationEmail'
import { TrialExpiringEmail } from '@/emails/TrialExpiringEmail'
import { SubscriptionCancelledEmail } from '@/emails/SubscriptionCancelledEmail'
import { WelcomeToTeamEmail } from '@/emails/WelcomeToTeamEmail'
import { WeeklySummaryEmail } from '@/emails/WeeklySummaryEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = 'Botsy <noreply@botsy.no>'

// Sample data for each template
const sampleData = {
  companyName: 'Demo Bedrift AS',
  customerName: 'Test Bruker',
  ownerName: 'Ola Nordmann',
  inviterName: 'Kari Hansen',
  memberName: 'Per Olsen',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, email } = body

    if (!templateId || !email) {
      return NextResponse.json(
        { success: false, error: 'templateId og email er påkrevd' },
        { status: 400 }
      )
    }

    let html: string
    let subject: string

    switch (templateId) {
      case 'team-invitation':
        html = await render(
          TeamInvitationEmail({
            inviterName: sampleData.inviterName,
            companyName: sampleData.companyName,
            role: 'admin',
            inviteUrl: 'https://botsy.no/invite/demo-token-123',
            expiresAt: '7 dager',
          })
        )
        subject = `[TEST] Team-invitasjon - Du er invitert til ${sampleData.companyName}`
        break

      case 'welcome-to-team':
        html = await render(
          WelcomeToTeamEmail({
            memberName: sampleData.memberName,
            companyName: sampleData.companyName,
            role: 'employee',
            inviterName: sampleData.inviterName,
            dashboardUrl: 'https://botsy.no/admin',
          })
        )
        subject = `[TEST] Velkommen til ${sampleData.companyName} på Botsy!`
        break

      case 'ownership-transfer-request':
        html = await render(
          OwnershipTransferRequestEmail({
            ownerName: sampleData.ownerName,
            companyName: sampleData.companyName,
            newOwnerName: sampleData.memberName,
            newOwnerEmail: 'per@demo.no',
            confirmUrl: 'https://botsy.no/transfer/confirm-demo-123',
            expiresAt: '24 timer',
          })
        )
        subject = `[TEST] Bekreft overføring av eierskap for ${sampleData.companyName}`
        break

      case 'ownership-transfer-offer':
        html = await render(
          OwnershipTransferOfferEmail({
            recipientName: sampleData.memberName,
            currentOwnerName: sampleData.ownerName,
            companyName: sampleData.companyName,
            acceptUrl: 'https://botsy.no/transfer/accept-demo-123',
            expiresAt: '24 timer',
          })
        )
        subject = `[TEST] Du blir tilbudt eierskap av ${sampleData.companyName}`
        break

      case 'ownership-transfer-complete':
        html = await render(
          OwnershipTransferCompleteEmail({
            recipientName: sampleData.memberName,
            companyName: sampleData.companyName,
            newOwnerName: sampleData.memberName,
            isNewOwner: true,
            dashboardUrl: 'https://botsy.no/admin',
          })
        )
        subject = `[TEST] Eierskap av ${sampleData.companyName} er overført`
        break

      case 'subscription-confirmation':
        html = await render(
          SubscriptionConfirmationEmail({
            customerName: sampleData.customerName,
            companyName: sampleData.companyName,
            planName: 'Botsy Standard',
            price: '699',
            currency: 'NOK',
            billingPeriod: 'månedlig',
            trialEndDate: '15. mars 2026',
            nextBillingDate: '15. mars 2026',
            invoiceUrl: null,
            dashboardUrl: 'https://botsy.no/admin',
          })
        )
        subject = `[TEST] Velkommen til Botsy! Din prøveperiode er startet`
        break

      case 'trial-expiring':
        html = await render(
          TrialExpiringEmail({
            customerName: sampleData.customerName,
            companyName: sampleData.companyName,
            daysLeft: 3,
            trialEndDate: '15. mars 2026',
            price: '699',
            currency: 'NOK',
            billingUrl: 'https://botsy.no/admin/fakturering',
          })
        )
        subject = `[TEST] ⏰ 3 dager igjen av prøveperioden - ${sampleData.companyName}`
        break

      case 'subscription-cancelled':
        html = await render(
          SubscriptionCancelledEmail({
            customerName: sampleData.customerName,
            companyName: sampleData.companyName,
            cancellationDate: '1. mars 2026',
            accessUntil: '31. mars 2026',
            reason: undefined,
            reactivateUrl: 'https://botsy.no/admin/fakturering',
          })
        )
        subject = `[TEST] Abonnementet er kansellert - ${sampleData.companyName}`
        break

      case 'daily-summary':
        html = renderDailySummaryEmail({
          companyName: sampleData.companyName,
          date: new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }),
          stats: {
            totalConversations: 47,
            resolvedByBot: 38,
            escalatedToHuman: 9,
            avgResponseTime: '< 1 sek',
          },
          employeeOfTheDay: {
            name: 'Kari Hansen',
            points: 156,
            conversationsHandled: 9,
          },
          insights: [
            'Boten løste 81% av alle henvendelser automatisk',
            'Mest aktive time: 14:00-15:00 med 12 henvendelser',
            'Produktspørsmål økte med 23% fra forrige uke',
          ],
          recentEscalations: [
            { customerName: 'Ole Berg', message: 'Jeg vil klage på leveransen...', time: '15:32', channel: 'Messenger' },
            { customerName: 'Lisa Sund', message: 'Kan jeg få refusjon for...', time: '13:45', channel: 'E-post' },
          ],
          unsubscribeUrl: 'https://botsy.no/admin/innstillinger',
        })
        subject = `[TEST] 📊 Daglig oppsummering - ${sampleData.companyName}`
        break

      case 'weekly-summary':
        html = await render(
          WeeklySummaryEmail({
            recipientName: sampleData.customerName,
            companyName: sampleData.companyName,
            weekNumber: 6,
            weekDateRange: '3. - 9. februar 2026',
            stats: {
              totalConversations: 312,
              conversationsChange: 15,
              resolvedByBot: 251,
              resolvedByBotChange: 8,
              escalatedToHuman: 61,
              avgResponseTime: '< 1 sek',
              customerSatisfaction: 94,
            },
            topPerformers: [
              { name: 'Kari Hansen', points: 847, conversationsHandled: 28 },
              { name: 'Per Olsen', points: 623, conversationsHandled: 21 },
              { name: 'Lisa Berg', points: 512, conversationsHandled: 18 },
            ],
            insights: [
              'Boten løste 80% av alle henvendelser automatisk denne uken',
              'Kundtilfredsheten økte fra 91% til 94%',
              'Messenger var den mest brukte kanalen med 156 samtaler',
            ],
            dashboardUrl: 'https://botsy.no/admin',
            unsubscribeUrl: 'https://botsy.no/admin/innstillinger',
          })
        )
        subject = `[TEST] 📊 Ukentlig oppsummering uke 6 - ${sampleData.companyName}`
        break

      default:
        return NextResponse.json(
          { success: false, error: `Ukjent template: ${templateId}` },
          { status: 400 }
        )
    }

    // Send the email
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    })

    if (error) {
      console.error(`[Send Single Email] Error sending ${templateId}:`, error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`[Send Single Email] Sent ${templateId} to ${email}`)
    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('[Send Single Email] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ukjent feil' },
      { status: 500 }
    )
  }
}
