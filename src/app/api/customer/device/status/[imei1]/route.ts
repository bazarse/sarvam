import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ imei1: string }> }
) {
  try {
    const { imei1 } = await params

    const device = await prisma.device.findUnique({
      where: { imei1 },
      include: {
        shop: true,
        emiSchedules: {
          orderBy: { installmentNo: 'asc' },
        },
      },
    })

    if (!device) {
      return NextResponse.json({
        success: false,
        message: 'Device not found',
        data: null,
      }, { status: 404 })
    }

    // Update lastPingAt and isOnline status
    await prisma.device.update({
      where: { id: device.id },
      data: {
        isOnline: true,
        lastPingAt: new Date(),
      },
    })

    // Calculate overdue / pending EMI
    const nextPendingEmi = device.emiSchedules.find((e) => e.status !== 'PAID')

    return NextResponse.json({
      success: true,
      message: 'Device status retrieved successfully',
      data: {
        isLocked: device.isLocked,
        lockMessage: device.lockMessage,
        isSirenActive: device.isSirenActive,
        offlineTimerHours: device.offlineTimerHours,
        emiAmount: nextPendingEmi ? nextPendingEmi.amount : device.emiAmount,
        dueDate: nextPendingEmi ? nextPendingEmi.dueDate.toISOString() : null,
        paidEmis: device.paidEmis,
        totalEmis: device.totalEmis,
        shopName: device.shop?.shopName ?? 'Sarvam Management',
        shopUpiId: device.shop?.upiId ?? 'sarvam@upi',
        shopPhone: device.shop?.phone ?? '9876543210',
      },
    })
  } catch (error) {
    console.error('Error fetching device status:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
