import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { sendDeviceCommand } from '@/lib/fcm'
import { cleanString, toFiniteNumber } from '@/lib/validate'
import { requireRoleWithName, assertDeviceInShop } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

class PaymentError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'CASH_PAID')
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    if (!(await assertDeviceInShop(id, authz.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const requestedAmount = toFiniteNumber(body?.amount)
    const remarks = cleanString(body?.remarks, 300) ?? 'Cash collected at shop counter'

    // Everything below runs in one transaction. The conditional update on the
    // installment (status != PAID) guarantees that a double click or two
    // parallel requests can never mark two installments for one cash payment.
    const result = await prisma.$transaction(async (tx) => {
      // Row lock: concurrent payments for the same device are processed one at a time
      await tx.$queryRaw`SELECT id FROM "Device" WHERE id = ${id} FOR UPDATE`

      // Duplicate-click guard: refuse a second cash entry within 15 seconds
      const recentPayment = await tx.emiSchedule.findFirst({
        where: { deviceId: id, status: 'PAID', paidAt: { gt: new Date(Date.now() - 15_000) } },
        select: { installmentNo: true },
      })
      if (recentPayment) {
        throw new PaymentError(
          `Installment #${recentPayment.installmentNo} was marked paid a few seconds ago. If this is a second payment, wait 15 seconds and try again.`,
          409
        )
      }

      const device = await tx.device.findUnique({
        where: { id },
        include: {
          emiSchedules: {
            where: { status: { not: 'PAID' } },
            orderBy: { installmentNo: 'asc' },
            take: 1,
          },
        },
      })
      if (!device) throw new PaymentError('Device not found', 404)

      const installment = device.emiSchedules[0]
      if (!installment) throw new PaymentError('All EMI installments for this device are already paid!', 400)

      if (requestedAmount !== null && Math.abs(requestedAmount - installment.amount) > 0.009) {
        throw new PaymentError(
          `Amount must equal the installment amount (₹${installment.amount}). Partial payments are not supported.`,
          400
        )
      }

      const receiptNo = `REC-${device.imei1.slice(-4)}-${installment.installmentNo}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`

      const claimed = await tx.emiSchedule.updateMany({
        where: { id: installment.id, status: { not: 'PAID' } },
        data: {
          status: 'PAID',
          paymentMode: 'CASH',
          paidAt: new Date(),
          receiptNumber: receiptNo,
          remarks,
        },
      })
      if (claimed.count !== 1) {
        throw new PaymentError('This installment was just marked paid by another request. Refresh and check.', 409)
      }

      // Only unlock if no other installment is already past due
      const stillOverdue = await tx.emiSchedule.count({
        where: { deviceId: id, status: { not: 'PAID' }, dueDate: { lt: new Date() } },
      })
      const shouldUnlock = stillOverdue === 0

      const updatedDevice = await tx.device.update({
        where: { id },
        data: {
          paidEmis: { increment: 1 },
          ...(shouldUnlock ? { isLocked: false, lockMessage: null, isSirenActive: false } : {}),
        },
      })

      await tx.deviceActivityLog.create({
        data: {
          deviceId: id,
          activityType: 'CASH_PAID',
          details: `Cash ₹${installment.amount} collected by ${authz.username} (Installment #${installment.installmentNo}, Receipt: ${receiptNo}). ${
            device.isLocked ? (shouldUnlock ? 'Device auto-unlocked.' : `Still locked: ${stillOverdue} more overdue installment(s).`) : ''
          }`,
        },
      })

      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'CASH_PAID',
        targetType: 'PAYMENT',
        targetId: id,
        metadata: {
          installmentNo: installment.installmentNo,
          amount: installment.amount,
          receiptNo,
          autoUnlocked: device.isLocked && shouldUnlock,
        },
      })

      return { device, installment, receiptNo, updatedDevice, shouldUnlock }
    })

    let pushNote = ''
    if (result.device.isLocked && result.shouldUnlock) {
      const push = await sendDeviceCommand(result.device.fcmToken, 'UNLOCK_DEVICE')
      if (result.device.isSirenActive) await sendDeviceCommand(result.device.fcmToken, 'STOP_SIREN')
      if (!push.sent) pushNote = ` (Unlock push not delivered: ${push.reason}. Phone will unlock on its next status check.)`
    }

    const { installment, receiptNo, updatedDevice, shouldUnlock } = result
    return NextResponse.json({
      success: true,
      message: `EMI #${installment.installmentNo} (₹${installment.amount}) marked paid in Cash! ${
        result.device.isLocked ? (shouldUnlock ? 'Device unlocked.' : 'Device stays locked: more installments are overdue.') : 'Device updated.'
      }${pushNote}`,
      receiptNumber: receiptNo,
      installmentNo: installment.installmentNo,
      device: updatedDevice,
    })
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('Error marking cash paid:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
