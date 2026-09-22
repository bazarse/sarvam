import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const days = parseInt(body.days || '2')

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

    // Push first pending installment due date by `days`
    const pendingInstallment = device.emiSchedules.find((e) => e.status !== 'PAID')
    if (pendingInstallment) {
      const newDueDate = new Date(pendingInstallment.dueDate.getTime() + days * 24 * 60 * 60 * 1000)
      await prisma.emiSchedule.update({
        where: { id: pendingInstallment.id },
        data: {
          dueDate: newDueDate,
          status: 'PENDING', // clear overdue flag
        },
      })
    }

    const updated = await prisma.device.update({
      where: { id },
      data: {
        gracePeriodDays: device.gracePeriodDays + days,
        isLocked: false, // ensure unlocked during grace period
        lockMessage: null,
      },
    })

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: 'GRACE_PERIOD_EXTENDED',
        details: `Shopkeeper granted +${days} days grace period. Due date extended.`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Granted +${days} days grace period. Device unlocked.`,
      device: updated,
    })
  } catch (error) {
    console.error('Error extending grace period:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
