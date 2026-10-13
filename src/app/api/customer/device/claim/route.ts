import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { isValidDeviceId, cleanString } from '@/lib/validate'
import { sha256hex } from '@/lib/device-auth'
import { safeEqual } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

// Sliding window brute-force defense for device claims.
// Max 10 failed attempts within 5 minutes per IP or IMEI.
interface ClaimFailTracker {
  count: number
  firstAttemptAt: number
}
const failedClaims = new Map<string, ClaimFailTracker>()
const MAX_CLAIM_FAILS = 10
const CLAIM_WINDOW_MS = 5 * 60 * 1000

function recordClaimFailure(key: string): boolean {
  const now = Date.now()
  const entry = failedClaims.get(key)
  if (!entry || now - entry.firstAttemptAt > CLAIM_WINDOW_MS) {
    failedClaims.set(key, { count: 1, firstAttemptAt: now })
    return false
  }
  entry.count++
  return entry.count >= MAX_CLAIM_FAILS
}

function isClaimThrottled(key: string): boolean {
  const now = Date.now()
  const entry = failedClaims.get(key)
  if (!entry) return false
  if (now - entry.firstAttemptAt > CLAIM_WINDOW_MS) {
    failedClaims.delete(key)
    return false
  }
  return entry.count >= MAX_CLAIM_FAILS
}

// Trust-on-first-use device claim. The phone presents its imei1 plus the
// per-shop enrollment key embedded in its QR provisioning extras. On the first
// claim for an imei1 with no bound token, the server issues a random secret,
// stores only its hash, binds the device to the matching shop, captures initial
// hardware & SIM telemetry, and returns the raw token ONCE.
//
// A re-claim of an already-bound device is rejected (409); the owner must reset
// it from the dashboard first via POST /api/dashboard/devices/[id]/reset-token.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const imei1 = body?.imei1
    const enrollmentKey = cleanString(body?.enrollmentKey, 128)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    if (!isValidDeviceId(imei1)) {
      return NextResponse.json({ success: false, message: 'Valid IMEI is required' }, { status: 400 })
    }
    if (!enrollmentKey || enrollmentKey.length < 16) {
      return NextResponse.json({ success: false, message: 'Enrollment key is required' }, { status: 400 })
    }

    // Rate-limit check against dictionary attacks
    const throttleKey = `${ip}:${imei1}`
    if (isClaimThrottled(throttleKey) || isClaimThrottled(imei1)) {
      return NextResponse.json(
        { success: false, message: 'Too many failed claim attempts. Please wait 5 minutes.' },
        { status: 429 }
      )
    }

    // Optional hardware and SIM telemetry captured during initial enrollment
    const imei2 = cleanString(body?.imei2, 20)
    const serialNumber = cleanString(body?.serialNumber, 100)
    const simIccid = cleanString(body?.simIccid, 30)
    const simOperator = cleanString(body?.simOperator, 60)
    const deviceModel = cleanString(body?.deviceModel, 100)
    const brand = cleanString(body?.brand, 50)
    const appVersion = cleanString(body?.appVersion, 30)
    const androidVersion = cleanString(body?.androidVersion, 30)

    // Resolve the shop by matching the enrollment key hash (constant-time
    // against every shop that has a key set).
    const keyHash = sha256hex(enrollmentKey)
    const shops = await prisma.shop.findMany({
      where: { enrollmentKeyHash: { not: null } },
      select: { id: true, shopName: true, enrollmentKeyHash: true },
    })
    const matchedShop = shops.find((s) => s.enrollmentKeyHash && safeEqual(keyHash, s.enrollmentKeyHash))

    if (!matchedShop) {
      recordClaimFailure(throttleKey)
      recordClaimFailure(imei1)
      // Fixed delay to slow key guessing
      await new Promise((r) => setTimeout(r, 800))
      try {
        await writeAudit(prisma, {
          actor: { system: true },
          shopId: 'unknown',
          action: 'CLAIM_REJECTED',
          targetType: 'DEVICE',
          targetId: imei1,
          reason: 'enrollment key did not match any shop',
          metadata: { ip, imei1 },
        })
      } catch { /* ignore audit failure on a rejected claim */ }
      return NextResponse.json({ success: false, message: 'Invalid enrollment key' }, { status: 403 })
    }

    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = sha256hex(rawToken)

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.device.findUnique({ where: { imei1 } })

      if (existing && existing.deviceTokenHash) {
        return { conflict: true as const, existingId: existing.id }
      }

      if (existing) {
        const updated = await tx.device.update({
          where: { id: existing.id },
          data: {
            deviceTokenHash: tokenHash,
            tokenBoundAt: new Date(),
            lastAuthAt: new Date(),
            isOnline: true,
            lastPingAt: new Date(),
            ...(existing.shopId ? {} : { shopId: matchedShop.id }),
            ...(imei2 && !existing.imei2 ? { imei2 } : {}),
            ...(serialNumber && !existing.serialNumber ? { serialNumber } : {}),
            ...(simIccid && !existing.simIccid ? { simIccid } : {}),
            ...(simOperator && !existing.simOperator ? { simOperator } : {}),
            ...(deviceModel && existing.deviceModel === 'Android Device' ? { deviceModel } : {}),
            ...(brand && existing.brand === 'Android' ? { brand } : {}),
            ...(appVersion ? { appVersion } : {}),
            ...(androidVersion ? { androidVersion } : {}),
          },
        })
        return { device: updated }
      }

      const created = await tx.device.create({
        data: {
          imei1,
          imei2: imei2 || null,
          serialNumber: serialNumber || null,
          simIccid: simIccid || null,
          simOperator: simOperator || null,
          customerName: 'New Device (fill details)',
          customerPhone: '0000000000',
          deviceModel: deviceModel || 'Android Device',
          brand: brand || 'Android',
          appVersion: appVersion || null,
          androidVersion: androidVersion || null,
          batteryLevel: null,
          shopId: matchedShop.id,
          deviceTokenHash: tokenHash,
          tokenBoundAt: new Date(),
          lastAuthAt: new Date(),
          isOnline: true,
          lastPingAt: new Date(),
        },
      })
      return { device: created }
    })

    if ('conflict' in result) {
      try {
        await writeAudit(prisma, {
          actor: { system: true },
          shopId: matchedShop.id,
          action: 'CLAIM_REJECTED',
          targetType: 'DEVICE',
          targetId: result.existingId || imei1,
          reason: 'Device already claimed. Token reset required before re-enrolling.',
          metadata: { ip, imei1 },
        })
      } catch { /* ignore audit failure */ }

      return NextResponse.json(
        { success: false, message: 'Device already claimed. Ask the shop owner to reset it before re-enrolling.' },
        { status: 409 }
      )
    }

    // Claim succeeded: clear failure counter
    failedClaims.delete(throttleKey)
    failedClaims.delete(imei1)

    // Append-only audit record of successful device enrollment & TOFU binding
    await writeAudit(prisma, {
      actor: { system: true },
      shopId: matchedShop.id,
      action: 'CLAIM_ACCEPTED',
      targetType: 'DEVICE',
      targetId: result.device.id,
      reason: 'Device claimed and TOFU secret token generated',
      metadata: {
        imei1,
        serialNumber: result.device.serialNumber,
        simIccid: result.device.simIccid,
        ip,
      },
    }).catch(() => { /* non-fatal audit log failure */ })

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: result.device.id,
        activityType: 'DEVICE_CLAIMED',
        details: `Device enrolled via TOFU. Bound to store "${matchedShop.shopName}".`,
      },
    }).catch(() => { /* non-fatal telemetry */ })

    // Raw token returned exactly once; never stored server-side, never logged.
    return NextResponse.json({
      success: true,
      message: 'Device claimed successfully',
      data: {
        deviceId: result.device.id,
        deviceToken: rawToken,
        shopId: matchedShop.id,
      },
    })
  } catch (error) {
    console.error('Error claiming device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
