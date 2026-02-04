/**
 * Send demo versions of all email templates
 * POST /api/test/email-demos
 *
 * Sends all 10 email templates to specified email address for review
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { TeamInvitationEmail } from '@/emails/TeamInvitationEmail'
import { OwnershipTransferRequestEmail } from '@/emails/OwnershipTransferRequestEmail'
import { OwnershipTransferOfferEmail } from '@/emails/OwnershipTransferOfferEmail'
import { OwnershipTransferCompleteEmail } from '@/emails/OwnershipTransferCompleteEmail'
import { DailySummaryEmail } from '@/emails/DailySummaryEmail'
import { SubscriptionConfirmationEmail } from '@/emails/SubscriptionConfirmationEmail'
import { TrialExpiringEmail } from '@/emails/TrialExpiringEmail'
import { SubscriptionCancelledEmail } from '@/emails/SubscriptionCancelledEmail'
import { WelcomeToTeamEmail } from '@/emails/WelcomeToTeamEmail'
import { WeeklySummaryEmail } from '@/emails/WeeklySummaryEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = 'Botsy <noreply@botsy.no>'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const targetEmail = body.email || 'hei@botsy.no'

    console.log(`[Email Demos] Sending all email demos to ${targetEmail}`)

    const results: Array<{ template: string; success: boolean; error?: string }> = []

    // Helper to add delay between emails (Resend rate limit: 2 req/sec)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // 1. Team Invitation Email
    try {
      const html = await render(
        TeamInvitationEmail({
          inviterName: 'Ola Nordmann',
          companyName: 'Demo Bedrift AS',
          role: 'admin',
          inviteUrl: 'https://botsy.no/invite/demo-token-123',
          expiresAt: '7 dager',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 1/10] Team-invitasjon - Du er invitert til Demo Bedrift AS',
        html,
      })

      results.push({
        template: 'TeamInvitationEmail',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'TeamInvitationEmail',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 2. Ownership Transfer Request Email (to current owner)
    try {
      const html = await render(
        OwnershipTransferRequestEmail({
          ownerName: 'Kari Hansen',
          companyName: 'Demo Bedrift AS',
          newOwnerName: 'Per Olsen',
          newOwnerEmail: 'per@demo.no',
          confirmUrl: 'https://botsy.no/transfer/confirm-demo-123',
          expiresAt: '24 timer',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 2/10] Eierskapsoverføring - Bekreft overføring av Demo Bedrift AS',
        html,
      })

      results.push({
        template: 'OwnershipTransferRequestEmail',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'OwnershipTransferRequestEmail',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 3. Ownership Transfer Offer Email (to new owner)
    try {
      const html = await render(
        OwnershipTransferOfferEmail({
          recipientName: 'Per Olsen',
          currentOwnerName: 'Kari Hansen',
          companyName: 'Demo Bedrift AS',
          acceptUrl: 'https://botsy.no/transfer/accept-demo-123',
          expiresAt: '24 timer',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 3/10] Eierskapstilbud - Du tilbys eierskap av Demo Bedrift AS',
        html,
      })

      results.push({
        template: 'OwnershipTransferOfferEmail',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'OwnershipTransferOfferEmail',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 4. Ownership Transfer Complete Email (new owner version)
    try {
      const html = await render(
        OwnershipTransferCompleteEmail({
          recipientName: 'Per Olsen',
          companyName: 'Demo Bedrift AS',
          newOwnerName: 'Per Olsen',
          isNewOwner: true,
          dashboardUrl: 'https://botsy.no/admin',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 4/10] Eierskap fullført (ny eier) - Du er nå eier av Demo Bedrift AS',
        html,
      })

      results.push({
        template: 'OwnershipTransferCompleteEmail (new owner)',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'OwnershipTransferCompleteEmail (new owner)',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 5. Ownership Transfer Complete Email (previous owner version)
    try {
      const html = await render(
        OwnershipTransferCompleteEmail({
          recipientName: 'Kari Hansen',
          companyName: 'Demo Bedrift AS',
          newOwnerName: 'Per Olsen',
          isNewOwner: false,
          dashboardUrl: 'https://botsy.no/admin',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 5/10] Eierskap fullført (tidligere eier) - Eierskap av Demo Bedrift AS er overført',
        html,
      })

      results.push({
        template: 'OwnershipTransferCompleteEmail (previous owner)',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'OwnershipTransferCompleteEmail (previous owner)',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 6. Daily Summary Email
    try {
      const html = await render(
        DailySummaryEmail({
          companyName: 'Demo Bedrift AS',
          date: new Date().toLocaleDateString('nb-NO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          stats: {
            totalConversations: 47,
            resolvedByBot: 78,
            escalatedToHuman: 22,
            avgResponseTime: '< 1 sek',
          },
          employeeOfTheDay: {
            name: 'Anna Berg',
            points: 156,
            conversationsHandled: 12,
          },
          insights: [
            'Flest henvendelser kom mellom kl. 10-12, vurder å øke bemanning i denne perioden.',
            'Spørsmål om returpolicy utgjorde 34% av alle henvendelser. Vurder å gjøre denne informasjonen mer synlig.',
            '3 kunder spurte om produktet "Premium Widget X" som ikke er på lager. Vurder å sende varsler når det er tilbake.',
          ],
          recentEscalations: [
            {
              customerName: 'Erik Johansen',
              message: 'Jeg har ventet i 2 uker på bestillingen min og har ikke hørt noe...',
              time: 'for 2 timer siden',
              channel: 'Widget',
            },
            {
              customerName: 'Maria Svendsen',
              message: 'Produktet kom ødelagt. Hva gjør jeg nå?',
              time: 'for 4 timer siden',
              channel: 'E-post',
            },
            {
              customerName: 'Thomas Andersen',
              message: 'Jeg prøver å logge inn men får feilmelding hver gang',
              time: 'for 6 timer siden',
              channel: 'Messenger',
            },
          ],
          unsubscribeUrl: 'https://botsy.no/admin/innstillinger?tab=notifications',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 6/10] Daglig oppsummering - Demo Bedrift AS',
        html,
      })

      results.push({
        template: 'DailySummaryEmail',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'DailySummaryEmail',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 7. Subscription Confirmation Email (trial version)
    try {
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 14)

      const html = await render(
        SubscriptionConfirmationEmail({
          customerName: 'Ola Nordmann',
          companyName: 'Demo Bedrift AS',
          planName: 'Botsy Standard',
          price: '699',
          currency: 'NOK',
          billingPeriod: 'månedlig',
          trialEndDate: trialEndDate.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          nextBillingDate: trialEndDate.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          invoiceUrl: null,
          dashboardUrl: 'https://botsy.no/admin',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 7/10] Abonnementsbekreftelse (prøveperiode) - Velkommen til Botsy!',
        html,
      })

      results.push({
        template: 'SubscriptionConfirmationEmail (trial)',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'SubscriptionConfirmationEmail (trial)',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 8. Subscription Confirmation Email (paid version)
    try {
      const nextBillingDate = new Date()
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

      const html = await render(
        SubscriptionConfirmationEmail({
          customerName: 'Kari Hansen',
          companyName: 'Demo Bedrift AS',
          planName: 'Botsy Standard',
          price: '699',
          currency: 'NOK',
          billingPeriod: 'månedlig',
          trialEndDate: null,
          nextBillingDate: nextBillingDate.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          invoiceUrl: 'https://pay.stripe.com/invoice/demo-123',
          dashboardUrl: 'https://botsy.no/admin',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 8/10] Abonnementsbekreftelse (betalt) - Betaling bekreftet!',
        html,
      })

      results.push({
        template: 'SubscriptionConfirmationEmail (paid)',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'SubscriptionConfirmationEmail (paid)',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 9. Trial Expiring Email (3 days left)
    try {
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 3)

      const html = await render(
        TrialExpiringEmail({
          customerName: 'Ola Nordmann',
          companyName: 'Demo Bedrift AS',
          daysLeft: 3,
          trialEndDate: trialEndDate.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          price: '699',
          currency: 'NOK',
          billingUrl: 'https://botsy.no/admin/fakturering',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 9/10] Prøveperiode-påminnelse (3 dager) - ⏰ 3 dager igjen',
        html,
      })

      results.push({
        template: 'TrialExpiringEmail (3 days)',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'TrialExpiringEmail (3 days)',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 10. Trial Expiring Email (1 day left - urgent)
    try {
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 1)

      const html = await render(
        TrialExpiringEmail({
          customerName: 'Kari Hansen',
          companyName: 'Demo Bedrift AS',
          daysLeft: 1,
          trialEndDate: trialEndDate.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          price: '699',
          currency: 'NOK',
          billingUrl: 'https://botsy.no/admin/fakturering',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 10/10] Prøveperiode-påminnelse (1 dag) - ⚠️ Utløper i morgen!',
        html,
      })

      results.push({
        template: 'TrialExpiringEmail (1 day - urgent)',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'TrialExpiringEmail (1 day - urgent)',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 11. Subscription Cancelled Email
    try {
      const accessUntil = new Date()
      accessUntil.setMonth(accessUntil.getMonth() + 1)

      const html = await render(
        SubscriptionCancelledEmail({
          customerName: 'Ola Nordmann',
          companyName: 'Demo Bedrift AS',
          cancellationDate: new Date().toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          accessUntil: accessUntil.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          reason: 'Bytter til annen løsning',
          reactivateUrl: 'https://botsy.no/admin/fakturering',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 11/13] Abonnement kansellert - Vi savner deg!',
        html,
      })

      results.push({
        template: 'SubscriptionCancelledEmail',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'SubscriptionCancelledEmail',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 12. Welcome to Team Email
    try {
      const html = await render(
        WelcomeToTeamEmail({
          memberName: 'Ny Ansatt',
          companyName: 'Demo Bedrift AS',
          role: 'employee',
          inviterName: 'Ola Nordmann',
          dashboardUrl: 'https://botsy.no/admin',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 12/13] Velkommen til teamet!',
        html,
      })

      results.push({
        template: 'WelcomeToTeamEmail',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'WelcomeToTeamEmail',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    await delay(600) // Wait to avoid rate limit

    // 13. Weekly Summary Email
    try {
      const html = await render(
        WeeklySummaryEmail({
          recipientName: 'Ola Nordmann',
          companyName: 'Demo Bedrift AS',
          weekNumber: 5,
          weekDateRange: '27. januar - 2. februar 2026',
          stats: {
            totalConversations: 156,
            conversationsChange: 12,
            resolvedByBot: 78,
            resolvedByBotChange: 5,
            escalatedToHuman: 22,
            avgResponseTime: '< 1 sek',
            customerSatisfaction: 94,
          },
          topPerformers: [
            { name: 'Anna Berg', points: 256, conversationsHandled: 42 },
            { name: 'Per Olsen', points: 198, conversationsHandled: 35 },
            { name: 'Kari Hansen', points: 156, conversationsHandled: 28 },
          ],
          insights: [
            'Antall henvendelser økte med 12% denne uken - flott at flere kunder tar kontakt!',
            'Chatboten løser 78% av henvendelsene automatisk - god effektivitet.',
            'Flest henvendelser kom mellom kl. 10-14, vurder å øke bemanning i denne perioden.',
          ],
          dashboardUrl: 'https://botsy.no/admin',
          unsubscribeUrl: 'https://botsy.no/admin/innstillinger?tab=notifications',
        })
      )

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: targetEmail,
        subject: '[DEMO 13/13] Ukentlig oppsummering uke 5',
        html,
      })

      results.push({
        template: 'WeeklySummaryEmail',
        success: !error,
        error: error?.message,
      })
    } catch (err) {
      results.push({
        template: 'WeeklySummaryEmail',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    // Summary
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`[Email Demos] Sent ${successCount}/${results.length} emails successfully`)

    return NextResponse.json({
      success: failCount === 0,
      message: `Sendte ${successCount} av ${results.length} demo-e-poster til ${targetEmail}`,
      targetEmail,
      results,
    })
  } catch (error) {
    console.error('[Email Demos] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send demo emails' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to send demo emails',
    usage: {
      method: 'POST',
      body: { email: 'target@email.com (optional, defaults to hei@botsy.no)' },
    },
    templates: [
      'TeamInvitationEmail - Team-invitasjon',
      'OwnershipTransferRequestEmail - Bekreftelse til nåværende eier',
      'OwnershipTransferOfferEmail - Tilbud til ny eier',
      'OwnershipTransferCompleteEmail (new owner) - Fullført for ny eier',
      'OwnershipTransferCompleteEmail (previous owner) - Fullført for tidligere eier',
      'DailySummaryEmail - Daglig oppsummering',
      'SubscriptionConfirmationEmail (trial) - Abonnementsbekreftelse med prøveperiode',
      'SubscriptionConfirmationEmail (paid) - Abonnementsbekreftelse etter betaling',
      'TrialExpiringEmail (3 days) - Prøveperiode-påminnelse (3 dager igjen)',
      'TrialExpiringEmail (1 day) - Prøveperiode-påminnelse (utløper i morgen)',
      'SubscriptionCancelledEmail - Abonnement kansellert',
      'WelcomeToTeamEmail - Velkommen til teamet',
      'WeeklySummaryEmail - Ukentlig oppsummering',
    ],
  })
}
