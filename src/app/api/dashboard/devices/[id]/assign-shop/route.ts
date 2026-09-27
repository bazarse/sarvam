import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { shopId } = body

    if (!shopId) {
      return NextResponse.json({ success: false, message: 'Shop ID is required' }, { status: 400 })
    }

    const updatedDevice = await prisma.device.update({
      where: { id },
      data: { shopId },
      include: { shop: true },
    })

    // Log activity
    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: 'STORE_ASSIGNED',
        details: `Assigned to store: ${updatedDevice.shop?.shopName}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Device successfully assigned to ${updatedDevice.shop?.shopName}`,
      device: updatedDevice,
    })
  } catch (error) {
    console.error('Error assigning shop to device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
