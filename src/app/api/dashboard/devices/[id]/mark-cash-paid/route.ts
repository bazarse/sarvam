import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const customAmount = body.amount ? parseFloat(body.amount) : null
    const remarks = body.remarks || 'Cash collected at shop counter'

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        emiSchedules: {
          orderBy: { installmentNo: 'asc' },
        },
      },
    })

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    // Find the first unpaid installment (PENDING or OVERDUE)
    const pendingInstallment = device.emiSchedules.find((e) => e.status !== 'PAID')

    if (!pendingInstallment) {
      return NextResponse.json({
        success: false,
        message: 'All EMI installments for this device are already paid!',
      }, { status: 400 })
    }

    const receiptNo = `REC-${device.imei1.slice(-4)}-${pendingInstallment.installmentNo}-${Date.now().toString().slice(-4)}`
    const paidAmount = customAmount ?? pendingInstallment.amount

    // 1. Update EMI Schedule
    await prisma.emiSchedule.update({
      where: { id: pendingInstallment.id },
      data: {
        status: 'PAID',
        paymentMode: 'CASH',
        paidAt: new Date(),
        receiptNumber: receiptNo,
        remarks,
      },
    })

    // 2. Update Device state: increment paid count and automatically UNLOCK if locked!
    const wasLocked = device.isLocked
    const updatedDevice = await prisma.device.update({
      where: { id },
      data: {
        paidEmis: device.paidEmis + 1,
        isLocked: false,          // Instantly unlock
        lockMessage: null,
        isSirenActive: false,
      },
    })

    // 3. Create Audit Log
    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: 'CASH_PAID',
        details: `Cash ₹${paidAmount} collected (Installment #${pendingInstallment.installmentNo}, Receipt: ${receiptNo}). ${wasLocked ? 'Device auto-unlocked.' : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `EMI #${pendingInstallment.installmentNo} (₹${paidAmount}) marked paid in Cash! Device ${wasLocked ? 'unlocked automatically.' : 'updated.'}`,
      receiptNumber: receiptNo,
      installmentNo: pendingInstallment.installmentNo,
      device: updatedDevice,
    })
  } catch (error) {
    console.error('Error marking cash paid:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
