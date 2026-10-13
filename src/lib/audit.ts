// Append-only audit trail. Every sensitive action writes exactly one AuditLog
// row, inside the same transaction as the action it records, so the action and
// its audit entry commit (or roll back) atomically. There is deliberately no
// update/delete helper here — the model is append-only at the API layer, with a
// DB trigger as defence in depth.

import type { Prisma } from '@prisma/client'
import type { SessionUser } from '@/lib/auth'

export type AuditAction =
  | 'LOCK'
  | 'UNLOCK'
  | 'CASH_PAID'
  | 'PAYMENT_REVERSED'
  | 'GRACE_GRANTED'
  | 'DEVICE_CREATED'
  | 'DEVICE_DELETED'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'SHOP_CREATED'
  | 'SHOP_DELETED'
  | 'EMI_EDITED'
  | 'CLAIM_REJECTED'
  | 'ENROLLMENT_KEY_ROTATED'
  | 'DEVICE_ASSIGNED'
  | 'DEVICE_TOKEN_RESET'
  | 'CLAIM_ACCEPTED'
  | 'SIM_SWAP_ALERT'
  | 'SPOOF_ATTEMPT'

export type AuditActor =
  | { userId: string; actorName: string; role: 'OWNER' | 'STAFF' }
  | { system: true } // for cron / server-initiated actions

type WriteAuditInput = {
  actor: AuditActor
  shopId: string
  action: AuditAction
  targetType: 'DEVICE' | 'USER' | 'SHOP' | 'PAYMENT'
  targetId: string
  reason?: string | null
  metadata?: Record<string, unknown> | null
}

// Prisma transaction client type (works with both prisma and tx).
type Tx = Prisma.TransactionClient | {
  auditLog: { create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => Promise<unknown> }
}

export async function writeAudit(tx: Tx, input: WriteAuditInput): Promise<void> {
  const actor =
    'system' in input.actor
      ? { actorId: 'system:cron', actorName: 'system', actorRole: 'SYSTEM' }
      : { actorId: input.actor.userId, actorName: input.actor.actorName, actorRole: input.actor.role }

  await tx.auditLog.create({
    data: {
      actorId: actor.actorId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      shopId: input.shopId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  })
}

// Convenience to build an AuditActor from a SessionUser once we know the
// username (looked up or carried alongside the session).
export function actorFromSession(user: SessionUser, username: string): AuditActor {
  return { userId: user.userId, actorName: username, role: user.role }
}
