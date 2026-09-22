import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imei1, activityType, details } = body

    if (!imei1) {
      return NextResponse.json({ success: false, message: 'IMEI is required' }, { status: 400 })
    }

    const device = await prisma.device.findUnique({
      where: { imei1 },
    })

    if (device) {
      await prisma.device.update({
        where: { id: device.id },
        data: {
          isOnline: true,
          lastPingAt: new Date(),
        },
      })

      if (activityType) {
        await prisma.deviceActivityLog.create({
          data: {
            deviceId: device.id,
            activityType: activityType.toUpperCase(),
            details: details ?? 'Heartbeat ping',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Activity recorded',
    })
  } catch (error) {
    console.error('Error recording activity:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
