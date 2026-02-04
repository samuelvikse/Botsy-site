/**
 * Botsy System Email Service
 *
 * Handles sending system emails for team invitations, ownership transfers, etc.
 * Uses Resend for reliable email delivery with React Email templates.
 */

import { Resend } from 'resend'
import { render } from '@react-email/components'
import { TeamInvitationEmail } from '@/emails/TeamInvitationEmail'
import { OwnershipTransferRequestEmail } from '@/emails/OwnershipTransferRequestEmail'
import { OwnershipTransferOfferEmail } from '@/emails/OwnershipTransferOfferEmail'
import { OwnershipTransferCompleteEmail } from '@/emails/OwnershipTransferCompleteEmail'
import { SubscriptionConfirmationEmail } from '@/emails/SubscriptionConfirmationEmail'
import { TrialExpiringEmail } from '@/emails/TrialExpiringEmail'
import { SubscriptionCancelledEmail } from '@/emails/SubscriptionCancelledEmail'
import { WelcomeToTeamEmail } from '@/emails/WelcomeToTeamEmail'
import { WeeklySummaryEmail } from '@/emails/WeeklySummaryEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Botsy <noreply@botsy.no>'

interface SendEmailResult {
  success: boolean
  error?: string
  id?: string
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail(params: {
  to: string
  inviterName: string
  companyName: string
  role: 'admin' | 'employee'
  inviteUrl: string
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      TeamInvitationEmail({
        inviterName: params.inviterName,
        companyName: params.companyName,
        role: params.role,
        inviteUrl: params.inviteUrl,
        expiresAt: '7 dager',
      })
    )

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Du er invitert til ${params.companyName} på Botsy`,
      html,
    })

    if (error) {
      console.error('Failed to send invitation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send ownership transfer request email to current owner
 */
export async function sendOwnershipTransferRequestEmail(params: {
  to: string
  ownerName: string
  companyName: string
  newOwnerName: string
  newOwnerEmail: string
  confirmUrl: string
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      OwnershipTransferRequestEmail({
        ownerName: params.ownerName,
        companyName: params.companyName,
        newOwnerName: params.newOwnerName,
        newOwnerEmail: params.newOwnerEmail,
        confirmUrl: params.confirmUrl,
        expiresAt: '24 timer',
      })
    )

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Bekreft overføring av eierskap for ${params.companyName}`,
      html,
    })

    if (error) {
      console.error('Failed to send transfer request email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending transfer request email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send ownership transfer offer email to new owner
 */
export async function sendOwnershipTransferOfferEmail(params: {
  to: string
  recipientName: string
  currentOwnerName: string
  companyName: string
  acceptUrl: string
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      OwnershipTransferOfferEmail({
        recipientName: params.recipientName,
        currentOwnerName: params.currentOwnerName,
        companyName: params.companyName,
        acceptUrl: params.acceptUrl,
        expiresAt: '24 timer',
      })
    )

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Du blir tilbudt eierskap av ${params.companyName}`,
      html,
    })

    if (error) {
      console.error('Failed to send transfer offer email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending transfer offer email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send ownership transfer complete email
 */
export async function sendOwnershipTransferCompleteEmail(params: {
  to: string
  recipientName: string
  companyName: string
  newOwnerName: string
  isNewOwner: boolean
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      OwnershipTransferCompleteEmail({
        recipientName: params.recipientName,
        companyName: params.companyName,
        newOwnerName: params.newOwnerName,
        isNewOwner: params.isNewOwner,
        dashboardUrl: 'https://botsy.no/admin',
      })
    )

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Eierskap av ${params.companyName} er overført`,
      html,
    })

    if (error) {
      console.error('Failed to send transfer complete email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending transfer complete email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send ownership transfer emails to both parties when transfer is initiated
 */
export async function sendOwnershipTransferEmails(params: {
  currentOwner: { email: string; name: string }
  newOwner: { email: string; name: string }
  companyName: string
  fromUserUrl: string
  toUserUrl: string
}): Promise<{ currentOwnerResult: SendEmailResult; newOwnerResult: SendEmailResult }> {
  const [currentOwnerResult, newOwnerResult] = await Promise.all([
    sendOwnershipTransferRequestEmail({
      to: params.currentOwner.email,
      ownerName: params.currentOwner.name,
      companyName: params.companyName,
      newOwnerName: params.newOwner.name,
      newOwnerEmail: params.newOwner.email,
      confirmUrl: params.fromUserUrl,
    }),
    sendOwnershipTransferOfferEmail({
      to: params.newOwner.email,
      recipientName: params.newOwner.name,
      currentOwnerName: params.currentOwner.name,
      companyName: params.companyName,
      acceptUrl: params.toUserUrl,
    }),
  ])

  return { currentOwnerResult, newOwnerResult }
}

/**
 * Send ownership transfer complete emails to both parties
 */
export async function sendOwnershipTransferCompleteEmails(params: {
  previousOwner: { email: string; name: string }
  newOwner: { email: string; name: string }
  companyName: string
}): Promise<{ previousOwnerResult: SendEmailResult; newOwnerResult: SendEmailResult }> {
  const [previousOwnerResult, newOwnerResult] = await Promise.all([
    sendOwnershipTransferCompleteEmail({
      to: params.previousOwner.email,
      recipientName: params.previousOwner.name,
      companyName: params.companyName,
      newOwnerName: params.newOwner.name,
      isNewOwner: false,
    }),
    sendOwnershipTransferCompleteEmail({
      to: params.newOwner.email,
      recipientName: params.newOwner.name,
      companyName: params.companyName,
      newOwnerName: params.newOwner.name,
      isNewOwner: true,
    }),
  ])

  return { previousOwnerResult, newOwnerResult }
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmationEmail(params: {
  to: string
  customerName: string
  companyName: string
  planName?: string
  price: string
  currency?: string
  billingPeriod?: string
  trialEndDate?: string | null
  nextBillingDate: string
  invoiceUrl?: string | null
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      SubscriptionConfirmationEmail({
        customerName: params.customerName,
        companyName: params.companyName,
        planName: params.planName || 'Botsy Standard',
        price: params.price,
        currency: params.currency || 'NOK',
        billingPeriod: params.billingPeriod || 'månedlig',
        trialEndDate: params.trialEndDate,
        nextBillingDate: params.nextBillingDate,
        invoiceUrl: params.invoiceUrl,
        dashboardUrl: 'https://botsy.no/admin',
      })
    )

    const isTrialing = !!params.trialEndDate
    const subject = isTrialing
      ? `Velkommen til Botsy! Din prøveperiode er startet`
      : `Betalingsbekreftelse - Ditt Botsy-abonnement er aktivt`

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject,
      html,
    })

    if (error) {
      console.error('Failed to send subscription confirmation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send trial expiring reminder email
 */
export async function sendTrialExpiringEmail(params: {
  to: string
  customerName: string
  companyName: string
  daysLeft: number
  trialEndDate: string
  price?: string
  currency?: string
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      TrialExpiringEmail({
        customerName: params.customerName,
        companyName: params.companyName,
        daysLeft: params.daysLeft,
        trialEndDate: params.trialEndDate,
        price: params.price || '699',
        currency: params.currency || 'NOK',
        billingUrl: 'https://botsy.no/admin/fakturering',
      })
    )

    const isUrgent = params.daysLeft <= 1
    const subject = isUrgent
      ? `⚠️ Din prøveperiode utløper ${params.daysLeft === 0 ? 'i dag' : 'i morgen'} - ${params.companyName}`
      : `⏰ ${params.daysLeft} dager igjen av prøveperioden - ${params.companyName}`

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject,
      html,
    })

    if (error) {
      console.error('Failed to send trial expiring email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending trial expiring email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send subscription cancelled email
 */
export async function sendSubscriptionCancelledEmail(params: {
  to: string
  customerName: string
  companyName: string
  cancellationDate: string
  accessUntil: string
  reason?: string
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      SubscriptionCancelledEmail({
        customerName: params.customerName,
        companyName: params.companyName,
        cancellationDate: params.cancellationDate,
        accessUntil: params.accessUntil,
        reason: params.reason,
        reactivateUrl: 'https://botsy.no/admin/fakturering',
      })
    )

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Abonnementet er kansellert - ${params.companyName}`,
      html,
    })

    if (error) {
      console.error('Failed to send cancellation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending cancellation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send welcome to team email
 */
export async function sendWelcomeToTeamEmail(params: {
  to: string
  memberName: string
  companyName: string
  role: 'admin' | 'employee'
  inviterName: string
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      WelcomeToTeamEmail({
        memberName: params.memberName,
        companyName: params.companyName,
        role: params.role,
        inviterName: params.inviterName,
        dashboardUrl: 'https://botsy.no/admin',
      })
    )

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Velkommen til ${params.companyName} på Botsy! 🎉`,
      html,
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send weekly summary email
 */
export async function sendWeeklySummaryEmail(params: {
  to: string
  recipientName: string
  companyName: string
  weekNumber: number
  weekDateRange: string
  stats: {
    totalConversations: number
    conversationsChange: number
    resolvedByBot: number
    resolvedByBotChange: number
    escalatedToHuman: number
    avgResponseTime: string
    customerSatisfaction?: number
  }
  topPerformers?: Array<{
    name: string
    points: number
    conversationsHandled: number
    avatarUrl?: string
  }>
  insights?: string[]
}): Promise<SendEmailResult> {
  try {
    const html = await render(
      WeeklySummaryEmail({
        recipientName: params.recipientName,
        companyName: params.companyName,
        weekNumber: params.weekNumber,
        weekDateRange: params.weekDateRange,
        stats: params.stats,
        topPerformers: params.topPerformers || [],
        insights: params.insights || [],
        dashboardUrl: 'https://botsy.no/admin',
        unsubscribeUrl: 'https://botsy.no/admin/innstillinger?tab=notifications',
      })
    )

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `📊 Ukentlig oppsummering uke ${params.weekNumber} - ${params.companyName}`,
      html,
    })

    if (error) {
      console.error('Failed to send weekly summary email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending weekly summary email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
