import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const enable = body.enable !== undefined ? body.enable : true

    const device = await prisma.device.update({
      where: { id },
      data: {
        isSirenActive: enable,
      },
    })

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: enable ? 'SIREN_TRIGGERED' : 'SIREN_STOPPED',
        details: enable ? 'Emergency loud siren alarm activated' : 'Siren alarm stopped',
      },
    })

    return NextResponse.json({
      success: true,
      message: enable ? 'Siren activated successfully' : 'Siren stopped successfully',
      device,
    })
  } catch (error) {
    console.error('Error toggling siren:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
