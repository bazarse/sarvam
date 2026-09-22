import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const customMessage = body.message || 'ईएमआई बकाया: कृपया सर्वम मैनेजमेंट पर संपर्क करें। फोन लॉक कर दिया गया है।'

    const device = await prisma.device.update({
      where: { id },
      data: {
        isLocked: true,
        lockMessage: customMessage,
      },
    })

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: 'MANUAL_LOCK',
        details: `Shopkeeper manually locked device: "${customMessage}"`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Device locked successfully',
      device,
    })
  } catch (error) {
    console.error('Error locking device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
