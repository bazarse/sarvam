import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toLatLng } from '@/lib/validate'
import { authenticateDevice } from '@/lib/device-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const imei1 = body?.imei1
    const loc = toLatLng(body?.latitude, body?.longitude)

    const auth = await authenticateDevice(req, imei1)
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.reason }, { status: auth.status })
    }

    if (!loc) {
      return NextResponse.json({ success: false, message: 'latitude and longitude required' }, { status: 400 })
    }

    await prisma.device.update({
      where: { id: auth.device.id },
      data: {
        lastKnownLat: loc.lat,
        lastKnownLng: loc.lng,
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
