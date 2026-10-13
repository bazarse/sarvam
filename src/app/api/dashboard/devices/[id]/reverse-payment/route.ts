import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cleanString } from '@/lib/validate'
import { requireRoleWithName, assertDeviceInShop } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

// OWNER-only. Reverses a previously-paid installment back to PENDING, with a
// required reason. Never deletes payment history — the original CASH_PAID audit
// row stays; this records a separate PAYMENT_REVERSED event.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'PAYMENT_REVERSED') // OWNER-only
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    if (!(await assertDeviceInShop(id, authz.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const installmentNo = Number(body?.installmentNo)
    const reason = cleanString(body?.reason, 300)

    if (!Number.isInteger(installmentNo) || installmentNo < 1) {
      return NextResponse.json({ success: false, message: 'A valid installmentNo is required' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ success: false, message: 'A reason is required to reverse a payment' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.emiSchedule.findFirst({
        where: { deviceId: id, installmentNo, status: 'PAID' },
      })
      if (!installment) {
        return { error: 'No paid installment with that number was found for this device' as const }
      }

      await tx.emiSchedule.update({
        where: { id: installment.id },
        data: { status: 'PENDING', paidAt: null, paymentMode: null, receiptNumber: null },
      })

      const updated = await tx.device.update({
        where: { id },
        data: { paidEmis: { decrement: 1 } },
      })
      // Guard against going below zero.
      if (updated.paidEmis < 0) {
        await tx.device.update({ where: { id }, data: { paidEmis: 0 } })
      }

      await tx.deviceActivityLog.create({
        data: {
          deviceId: id,
          activityType: 'PAYMENT_REVERSED',
          details: `${authz.username} (OWNER) reversed installment #${installmentNo} (₹${installment.amount}). Reason: ${reason}`,
        },
      })

      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'PAYMENT_REVERSED',
        targetType: 'PAYMENT',
        targetId: id,
        reason,
        metadata: { installmentNo, amount: installment.amount, receiptNumber: installment.receiptNumber },
      })

      return { amount: installment.amount }
    })

    if ('error' in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Installment #${installmentNo} (₹${result.amount}) reversed to PENDING.`,
    })
  } catch (error) {
    console.error('Error reversing payment:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
