import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { fcmToken, imei1, latitude, longitude } = body

    if (!imei1) {
      return NextResponse.json({ success: false, message: 'IMEI is required' }, { status: 400 })
    }

    const updated = await prisma.device.upsert({
      where: { imei1 },
      update: {
        fcmToken,
        isOnline: true,
        lastPingAt: new Date(),
        ...(latitude ? { lastKnownLat: latitude } : {}),
        ...(longitude ? { lastKnownLng: longitude } : {}),
      },
      create: {
        imei1,
        customerName: 'New Device User',
        customerPhone: '9999999999',
        deviceModel: 'Android Device',
        fcmToken,
        isOnline: true,
        lastPingAt: new Date(),
        ...(latitude ? { lastKnownLat: latitude } : {}),
        ...(longitude ? { lastKnownLng: longitude } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      data: { deviceId: updated.id },
    })
  } catch (error) {
    console.error('Error updating FCM token:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
