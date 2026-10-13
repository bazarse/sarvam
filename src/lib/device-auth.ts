// Per-device token authentication for customer endpoints.
//
// The phone sends its raw secret in the `X-Device-Token` header on every
// request, along with `X-Imei`. The server stores only sha256hex(token) in
// Device.deviceTokenHash and compares in constant time.
//
// Security protections implemented:
// 1. Dual IMEI & Header cross-verification (rejects X-Imei header mismatch).
// 2. Timing-safe comparison (safeEqual) against cryptographic SHA-256 hash.
// 3. Sliding-window brute-force rate limiter on failed attempts (429 Too Many Requests).
// 4. Inactive/Archived device rejection.
// 5. Automatic telemetry heartbeat & online state refresh on verified success.

import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import type { Device } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { safeEqual } from '@/lib/auth'
import { isValidDeviceId } from '@/lib/validate'

export const DEVICE_TOKEN_HEADER = 'x-device-token'
export const DEVICE_IMEI_HEADER = 'x-imei'

export function sha256hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export type DeviceAuthResult =
  | { ok: true; device: Device }
  | { ok: false; status: 400 | 401 | 403 | 404 | 429; reason: string }

// Sliding-window rate limiting for failed authentication attempts.
// Max 10 failed attempts within 60 seconds per IMEI.
interface FailedAttempt {
  count: number
  firstAttemptAt: number
}
const failedAttempts = new Map<string, FailedAttempt>()
const MAX_FAILED_ATTEMPTS = 10
const WINDOW_MS = 60 * 1000

function recordFailure(imei: string): boolean {
  const now = Date.now()
  const current = failedAttempts.get(imei)
  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    failedAttempts.set(imei, { count: 1, firstAttemptAt: now })
    return false
  }
  current.count++
  return current.count >= MAX_FAILED_ATTEMPTS
}

function clearFailure(imei: string) {
  failedAttempts.delete(imei)
}

function isThrottled(imei: string): boolean {
  const now = Date.now()
  const current = failedAttempts.get(imei)
  if (!current) return false
  if (now - current.firstAttemptAt > WINDOW_MS) {
    failedAttempts.delete(imei)
    return false
  }
  return current.count >= MAX_FAILED_ATTEMPTS
}

export function resetFailedAuthAttemptsForTest() {
  failedAttempts.clear()
}

// Authenticates a customer-device request for a given imei1.
// - invalid imei               -> 400
// - missing/short token        -> 401
// - unknown device             -> 404
// - device not claimed         -> 403 (must claim first via /claim)
// - archived/inactive device   -> 403
// - x-imei header mismatch     -> 403 (spoofing)
// - token/hash mismatch        -> 403 (or 429 if throttled)
// On success, updates Device.lastAuthAt, isOnline, and lastPingAt.
export async function authenticateDevice(
  req: NextRequest,
  imei1: string
): Promise<DeviceAuthResult> {
  if (!isValidDeviceId(imei1)) {
    return { ok: false, status: 400, reason: 'invalid imei' }
  }

  if (isThrottled(imei1)) {
    return { ok: false, status: 429, reason: 'too many failed authentication attempts. please wait' }
  }

  // Cross-verify X-Imei header if provided by client (Android MDM sends both)
  const headerImei = req.headers.get(DEVICE_IMEI_HEADER)?.trim()
  if (headerImei && headerImei !== imei1) {
    recordFailure(imei1)
    console.error(`[device-auth] x-imei header mismatch: header=${headerImei}, param=${imei1}`)
    return { ok: false, status: 403, reason: 'x-imei header mismatch' }
  }

  const token = req.headers.get(DEVICE_TOKEN_HEADER)?.trim()
  if (!token || token.length < 32 || token.length > 256) {
    return { ok: false, status: 401, reason: 'missing or malformed device token' }
  }

  const device = await prisma.device.findUnique({ where: { imei1 } })
  if (!device) {
    return { ok: false, status: 404, reason: 'device not found' }
  }
  if (!device.deviceTokenHash) {
    return { ok: false, status: 403, reason: 'device not claimed' }
  }
  if (device.status === 'ARCHIVED' || device.status === 'DELETED') {
    return { ok: false, status: 403, reason: 'device is inactive' }
  }

  const presented = sha256hex(token)
  if (!safeEqual(presented, device.deviceTokenHash)) {
    const throttled = recordFailure(imei1)
    console.error(`[device-auth] token/imei mismatch for imei1=${imei1} (throttled=${throttled})`)
    return {
      ok: false,
      status: throttled ? 429 : 403,
      reason: throttled ? 'too many failed authentication attempts. please wait' : 'token/imei mismatch',
    }
  }

  // Authentication succeeded - clear any failed attempts
  clearFailure(imei1)

  const authed = await prisma.device.update({
    where: { id: device.id },
    data: { lastAuthAt: new Date(), isOnline: true, lastPingAt: new Date() },
  })

  return { ok: true, device: authed }
}
