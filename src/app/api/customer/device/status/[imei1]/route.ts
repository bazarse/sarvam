import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateDevice } from '@/lib/device-auth'

// Polled by the phone's lock screen (~60s) and the WorkManager backup (~15min).
// The SERVER is the source of truth for isLocked / isSirenActive / offline
// threshold. Authenticated with the per-device token; a bad/missing token or an
// imei the token is not bound to is rejected. Response shape stays compatible
// with the APK (data.isLocked is what decides whether the phone unlocks).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ imei1: string }> }
) {
  try {
    const { imei1 } = await params

    const auth = await authenticateDevice(req, imei1)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.reason, data: null },
        { status: auth.status }
      )
    }

    // authenticateDevice already refreshed lastAuthAt / isOnline / lastPingAt.
    const device = await prisma.device.findUnique({
      where: { id: auth.device.id },
      include: {
        shop: { select: { shopName: true, upiId: true, phone: true, frpGoogleAccountId: true } },
        emiSchedules: {
          where: { status: { not: 'PAID' } },
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

    const nextPendingEmi = device.emiSchedules[0]

    return NextResponse.json({
      success: true,
      message: 'Device status retrieved successfully',
      data: {
        customerId: device.id,
        isLocked: device.isLocked,
        lockMessage: device.lockMessage,
        isSirenActive: device.isSirenActive,
        offlineTimerHours: device.offlineTimerHours,
        hasPendingEmis: device.emiSchedules.length > 0,
        pendingEmiCount: device.emiSchedules.length,
        emiAmount: nextPendingEmi ? nextPendingEmi.amount : device.emiAmount,
        dueDate: nextPendingEmi ? nextPendingEmi.dueDate.toISOString() : null,
        paidEmis: device.paidEmis,
        totalEmis: device.totalEmis,
        shopName: device.shop?.shopName ?? 'Sarvam Management',
        shopUpiId: device.shop?.upiId ?? null,
        shopPhone: device.shop?.phone ?? null,
        frpGoogleAccountId: device.shop?.frpGoogleAccountId ?? null,
        registeredAt: device.createdAt.toISOString(),
        lastUpdated: device.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching device status:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
