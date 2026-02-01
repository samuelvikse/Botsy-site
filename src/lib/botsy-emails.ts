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
