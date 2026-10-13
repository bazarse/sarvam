import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cleanString, toFiniteNumber, toLatLng } from '@/lib/validate'
import { authenticateDevice } from '@/lib/device-auth'
import { writeAudit } from '@/lib/audit'

// Activity types the Android app is known to send, plus generic ones.
const ALLOWED_ACTIVITY = /^[A-Z_]{2,40}$/
const SIM_LOCK_MESSAGE = 'अनधिकृत सिम कार्ड का पता चला। कृपया अधिकृत सिम कार्ड पुनः डालें।'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const imei1 = body?.imei1

    const auth = await authenticateDevice(req, imei1)
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.reason }, { status: auth.status })
    }

    const device = auth.device
    const battery = toFiniteNumber(body?.batteryLevel)
    const loc = toLatLng(body?.latitude, body?.longitude)
    const reportedSimIccid = cleanString(body?.simIccid, 30)
    const reportedSimOperator = cleanString(body?.simOperator, 60)
    const appVersion = cleanString(body?.appVersion, 30)

    let simTampered = false
    // SIM Security Check:
    if (reportedSimIccid) {
      if (!device.simIccid) {
        // First SIM seen: securely bind to device record
        await prisma.device.update({
          where: { id: device.id },
          data: {
            simIccid: reportedSimIccid,
            ...(reportedSimOperator ? { simOperator: reportedSimOperator } : {}),
          },
        })
      } else if (device.simIccid !== reportedSimIccid) {
        // Mismatch against bound SIM -> Unauthorized SIM swap!
        simTampered = true
        await prisma.device.update({
          where: { id: device.id },
          data: {
            isLocked: true,
            lockMessage: SIM_LOCK_MESSAGE,
          },
        })

        if (device.shopId) {
          await writeAudit(prisma, {
            actor: { system: true },
            shopId: device.shopId,
            action: 'SIM_SWAP_ALERT',
            targetType: 'DEVICE',
            targetId: device.id,
            reason: `SIM ICCID mismatch. Bound=${device.simIccid}, Reported=${reportedSimIccid}`,
            metadata: { imei1, boundSim: device.simIccid, reportedSim: reportedSimIccid },
          }).catch(() => {})
        }
      }
    }

    await prisma.device.update({
      where: { id: device.id },
      data: {
        isOnline: true,
        lastPingAt: new Date(),
        ...(battery !== null && battery >= 0 && battery <= 100 ? { batteryLevel: Math.round(battery) } : {}),
        ...(loc ? { lastKnownLat: loc.lat, lastKnownLng: loc.lng } : {}),
        ...(appVersion ? { appVersion } : {}),
      },
    })

    const activityType = typeof body?.activityType === 'string' ? body.activityType.toUpperCase() : null
    const finalActivityType = simTampered ? 'SIM_SWAP_DETECTED' : activityType

    if (finalActivityType && ALLOWED_ACTIVITY.test(finalActivityType) && finalActivityType !== 'HEARTBEAT') {
      await prisma.deviceActivityLog.create({
        data: {
          deviceId: device.id,
          activityType: finalActivityType,
          details: cleanString(body?.details, 300) ?? (simTampered ? 'Unauthorized SIM swap detected' : 'Reported by phone'),
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 45) ?? null,
        },
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: 'Activity recorded',
      isLocked: simTampered ? true : device.isLocked,
    })
  } catch (error) {
    console.error('Error recording activity:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
