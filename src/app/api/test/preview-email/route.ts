/**
 * Preview an email template
 * GET /api/test/preview-email?templateId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/components'
import { TeamInvitationEmail } from '@/emails/TeamInvitationEmail'
import { OwnershipTransferRequestEmail } from '@/emails/OwnershipTransferRequestEmail'
import { OwnershipTransferOfferEmail } from '@/emails/OwnershipTransferOfferEmail'
import { OwnershipTransferCompleteEmail } from '@/emails/OwnershipTransferCompleteEmail'
import { renderDailySummaryEmail } from '@/emails/DailySummaryEmail'
import { SubscriptionConfirmationEmail } from '@/emails/SubscriptionConfirmationEmail'
import { TrialExpiringEmail } from '@/emails/TrialExpiringEmail'
import { SubscriptionCancelledEmail } from '@/emails/SubscriptionCancelledEmail'
import { WelcomeToTeamEmail } from '@/emails/WelcomeToTeamEmail'
import { WeeklySummaryEmail } from '@/emails/WeeklySummaryEmail'

// Sample data for previews
const sampleData = {
  companyName: 'Demo Bedrift AS',
  customerName: 'Test Bruker',
  ownerName: 'Ola Nordmann',
  inviterName: 'Kari Hansen',
  memberName: 'Per Olsen',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'templateId er påkrevd' },
        { status: 400 }
      )
    }

    let html: string

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
        break

      default:
        return NextResponse.json(
          { success: false, error: `Ukjent template: ${templateId}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, html })
  } catch (error) {
    console.error('[Preview Email] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ukjent feil' },
      { status: 500 }
    )
  }
}
