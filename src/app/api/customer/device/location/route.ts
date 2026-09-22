import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imei1, latitude, longitude } = body

    if (!imei1 || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ success: false, message: 'IMEI, latitude, and longitude required' }, { status: 400 })
    }

    await prisma.device.updateMany({
      where: { imei1 },
      data: {
        lastKnownLat: latitude,
        lastKnownLng: longitude,
        isOnline: true,
        lastPingAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
    })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
