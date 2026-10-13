import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toLatLng } from '@/lib/validate'
import { authenticateDevice } from '@/lib/device-auth'

// Called by the Android app to register/update its FCM token. The device must
// already be claimed (it got its device token from POST /api/customer/device/claim
// during enrollment), so this endpoint is authenticated and no longer
// self-registers unknown IMEIs — that path moved behind the enrollment key.
//
// FCM is optional and non-authoritative in this system: google-services.json is
// a placeholder, so a token may never actually be usable. Storing it is
// harmless and lets a real Firebase project (if ever configured) nudge the
// phone to poll sooner.
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const imei1 = body?.imei1
    const fcmToken = typeof body?.fcmToken === 'string' ? body.fcmToken.trim() : ''

    const auth = await authenticateDevice(req, imei1)
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.reason }, { status: auth.status })
    }

    if (fcmToken.length > 4096) {
      return NextResponse.json({ success: false, message: 'Invalid FCM token' }, { status: 400 })
    }

    const loc = toLatLng(body?.latitude, body?.longitude)
    const device = await prisma.device.update({
      where: { id: auth.device.id },
      data: {
        ...(fcmToken ? { fcmToken } : {}),
        isOnline: true,
        lastPingAt: new Date(),
        ...(loc ? { lastKnownLat: loc.lat, lastKnownLng: loc.lng } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      data: { deviceId: device.id, isLocked: device.isLocked },
    })
  } catch (error) {
    console.error('Error updating FCM token:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
