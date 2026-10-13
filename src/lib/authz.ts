// Role-based authorization for dashboard route handlers. This is defence in
// depth: the proxy already blocks unauthenticated requests, but each sensitive
// handler re-checks the acting user's role and shop scope here. The dashboard
// hiding buttons is cosmetic; this is the real enforcement boundary.

import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, getSessionUser, type SessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const MAX_GRACE_DAYS = 30
export const STAFF_MAX_GRACE_DAYS = 2

// Actions STAFF are allowed to perform. Everything else is OWNER-only.
const STAFF_ALLOWED = new Set<Action>([
  'VIEW',
  'CASH_PAID',
  'LOCK',
  'GRACE_GRANTED', // capped separately at STAFF_MAX_GRACE_DAYS
])

export type Action =
  | 'VIEW'
  | 'CASH_PAID'
  | 'LOCK'
  | 'UNLOCK'
  | 'PAYMENT_REVERSED'
  | 'GRACE_GRANTED'
  | 'EMI_EDITED'
  | 'DEVICE_DELETED'
  | 'DEVICE_CREATED'
  | 'SHOP_MANAGE'
  | 'USER_MANAGE'
  | 'ENROLLMENT_KEY_ROTATE'
  | 'TOKEN_RESET'

export type AuthzResult =
  | { ok: true; user: SessionUser }
  | { ok: false; status: 401 | 403; message: string }

// Resolve the acting user from the session cookie. v1 (legacy) sessions have no
// identity and are rejected from role-gated handlers — the holder must log in
// again against a real account.
export async function getActingUser(req: NextRequest): Promise<SessionUser | null> {
  const session = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value)
  if (!session || 'legacy' in session) return null
  return session
}

// Gate an action by role. Returns the acting user on success.
export async function requireRole(req: NextRequest, action: Action): Promise<AuthzResult> {
  const user = await getActingUser(req)
  if (!user) {
    return { ok: false, status: 401, message: 'Please sign in again' }
  }
  if (user.role === 'OWNER') return { ok: true, user }
  if (user.role === 'STAFF' && STAFF_ALLOWED.has(action)) return { ok: true, user }
  return { ok: false, status: 403, message: 'Not permitted for your role' }
}

// Like requireRole, but also fetches the acting user's current username so
// audit entries can denormalize it. One extra query, used by write handlers.
export type AuthzResultWithName =
  | { ok: true; user: SessionUser; username: string }
  | { ok: false; status: 401 | 403; message: string }

export async function requireRoleWithName(req: NextRequest, action: Action): Promise<AuthzResultWithName> {
  const res = await requireRole(req, action)
  if (!res.ok) return res
  const row = await prisma.user.findUnique({ where: { id: res.user.userId }, select: { username: true } })
  if (!row) return { ok: false, status: 401, message: 'Please sign in again' }
  return { ok: true, user: res.user, username: row.username }
}

// Ensure a device belongs to the acting user's shop. OWNER and STAFF are both
// scoped to their own shop (no cross-shop access). Returns true if allowed.
export async function assertDeviceInShop(deviceId: string, user: SessionUser): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { shopId: true },
  })
  if (!device) return false
  // A device with no shop is only reachable by... nobody via scoped routes.
  // Treat unassigned devices as visible to any OWNER whose shop later claims
  // them is out of scope; require an exact shop match.
  return device.shopId === user.shopId
}
