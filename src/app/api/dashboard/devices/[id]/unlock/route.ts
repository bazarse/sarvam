import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const device = await prisma.device.update({
      where: { id },
      data: {
        isLocked: false,
        lockMessage: null,
        isSirenActive: false,
      },
    })

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: 'MANUAL_UNLOCK',
        details: 'Shopkeeper manually unlocked device',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Device unlocked successfully',
      device,
    })
  } catch (error) {
    console.error('Error unlocking device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
