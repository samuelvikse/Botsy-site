/**
 * Botsy Audit Log System
 *
 * Logs important actions for security, compliance and debugging.
 * Stores logs in Firestore under companies/{companyId}/auditLogs
 */

import { addDocumentRest } from './firebase-rest'

export type AuditAction =
  // Authentication
  | 'user.login'
  | 'user.logout'
  | 'user.login_failed'
  | 'user.password_reset'
  | 'user.2fa_enabled'
  | 'user.2fa_disabled'
  // Membership
  | 'member.invited'
  | 'member.joined'
  | 'member.left'
  | 'member.removed'
  | 'member.role_changed'
  | 'member.permissions_changed'
  // Ownership
  | 'ownership.transfer_initiated'
  | 'ownership.transfer_confirmed'
  | 'ownership.transfer_completed'
  | 'ownership.transfer_cancelled'
  // Subscription
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.reactivated'
  | 'subscription.payment_succeeded'
  | 'subscription.payment_failed'
  // Data
  | 'data.exported'
  | 'data.deleted'
  // Settings
  | 'settings.updated'
  | 'chatbot.updated'
  // API
  | 'api.key_created'
  | 'api.key_revoked'

export interface AuditLogEntry {
  action: AuditAction
  actorId: string // User ID who performed the action
  actorEmail?: string
  targetId?: string // User/resource ID affected
  targetEmail?: string
  companyId: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  try {
    const logEntry: Record<string, unknown> = {
      action: entry.action,
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      targetId: entry.targetId,
      targetEmail: entry.targetEmail,
      companyId: entry.companyId,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      timestamp: new Date(),
    }

    await addDocumentRest('companies', entry.companyId, 'auditLogs', logEntry)

    // Also log to console for server-side visibility
    console.log(`[Audit] ${entry.action}`, {
      actor: entry.actorEmail || entry.actorId,
      target: entry.targetEmail || entry.targetId,
      company: entry.companyId,
      metadata: entry.metadata,
    })
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('[Audit] Failed to log event:', error)
  }
}

/**
 * Log a login event
 */
export async function logLogin(params: {
  userId: string
  email: string
  companyId: string
  success: boolean
  ipAddress?: string
  userAgent?: string
  method?: 'email' | 'google' | 'apple' | 'microsoft' | 'phone'
}): Promise<void> {
  await logAuditEvent({
    action: params.success ? 'user.login' : 'user.login_failed',
    actorId: params.userId,
    actorEmail: params.email,
    companyId: params.companyId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: {
      method: params.method || 'email',
    },
  })
}

/**
 * Log a membership change
 */
export async function logMembershipChange(params: {
  action: 'member.invited' | 'member.joined' | 'member.left' | 'member.removed' | 'member.role_changed' | 'member.permissions_changed'
  actorId: string
  actorEmail?: string
  targetId: string
  targetEmail?: string
  companyId: string
  oldRole?: string
  newRole?: string
  permissions?: Record<string, boolean>
}): Promise<void> {
  await logAuditEvent({
    action: params.action,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    targetId: params.targetId,
    targetEmail: params.targetEmail,
    companyId: params.companyId,
    metadata: {
      oldRole: params.oldRole,
      newRole: params.newRole,
      permissions: params.permissions,
    },
  })
}

/**
 * Log a subscription event
 */
export async function logSubscriptionEvent(params: {
  action: 'subscription.created' | 'subscription.updated' | 'subscription.cancelled' | 'subscription.reactivated' | 'subscription.payment_succeeded' | 'subscription.payment_failed'
  companyId: string
  subscriptionId?: string
  status?: string
  amount?: number
  currency?: string
}): Promise<void> {
  await logAuditEvent({
    action: params.action,
    actorId: 'system',
    companyId: params.companyId,
    metadata: {
      subscriptionId: params.subscriptionId,
      status: params.status,
      amount: params.amount,
      currency: params.currency,
    },
  })
}

/**
 * Log an ownership transfer event
 */
export async function logOwnershipTransfer(params: {
  action: 'ownership.transfer_initiated' | 'ownership.transfer_confirmed' | 'ownership.transfer_completed' | 'ownership.transfer_cancelled'
  actorId: string
  actorEmail?: string
  fromUserId: string
  fromEmail?: string
  toUserId: string
  toEmail?: string
  companyId: string
}): Promise<void> {
  await logAuditEvent({
    action: params.action,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    companyId: params.companyId,
    metadata: {
      fromUserId: params.fromUserId,
      fromEmail: params.fromEmail,
      toUserId: params.toUserId,
      toEmail: params.toEmail,
    },
  })
}

/**
 * Log 2FA status change
 */
export async function log2FAChange(params: {
  userId: string
  email: string
  companyId: string
  enabled: boolean
}): Promise<void> {
  await logAuditEvent({
    action: params.enabled ? 'user.2fa_enabled' : 'user.2fa_disabled',
    actorId: params.userId,
    actorEmail: params.email,
    companyId: params.companyId,
  })
}
