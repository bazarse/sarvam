import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDeviceCommand } from '@/lib/fcm'
import { cleanString } from '@/lib/validate'
import {
  requireRoleWithName,
  assertDeviceInShop,
  MAX_GRACE_DAYS,
  STAFF_MAX_GRACE_DAYS,
} from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'GRACE_GRANTED')
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    if (!(await assertDeviceInShop(id, authz.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const days = body?.days === undefined ? 2 : Number(body.days)
    const reason = cleanString(body?.reason, 300)

    if (!Number.isInteger(days) || days < 1 || days > MAX_GRACE_DAYS) {
      return NextResponse.json(
        { success: false, message: `Grace days must be a whole number between 1 and ${MAX_GRACE_DAYS}` },
        { status: 400 }
      )
    }

    // STAFF are capped at a small grace; OWNER may go up to MAX_GRACE_DAYS.
    if (authz.user.role === 'STAFF' && days > STAFF_MAX_GRACE_DAYS) {
      return NextResponse.json(
        { success: false, message: `Staff can grant at most ${STAFF_MAX_GRACE_DAYS} days of grace. Ask the owner for more.` },
        { status: 403 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
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
      if (!device) return null

      const pending = device.emiSchedules[0]
      if (pending) {
        await tx.emiSchedule.update({
          where: { id: pending.id },
          data: {
            dueDate: new Date(pending.dueDate.getTime() + days * 24 * 60 * 60 * 1000),
            status: 'PENDING', // clear overdue flag
          },
        })
      }

      const updated = await tx.device.update({
        where: { id },
        data: {
          gracePeriodDays: { increment: days },
          isLocked: false, // unlocked during grace period
          lockMessage: null,
        },
      })

      await tx.deviceActivityLog.create({
        data: {
          deviceId: id,
          activityType: 'GRACE_PERIOD_EXTENDED',
          details: `${authz.username} (${authz.user.role}) granted +${days} days grace period. Due date extended.`,
        },
      })

      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'GRACE_GRANTED',
        targetType: 'DEVICE',
        targetId: id,
        reason: reason,
        metadata: { days },
      })

      return { device, updated }
    })

    if (!result) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    if (result.device.isLocked) {
      await sendDeviceCommand(result.device.fcmToken, 'UNLOCK_DEVICE')
    }

    return NextResponse.json({
      success: true,
      message: `Granted +${days} days grace period. Device unlocked.`,
      device: result.updated,
    })
  } catch (error) {
    console.error('Error extending grace period:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
