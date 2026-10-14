import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDeviceCommand } from '@/lib/fcm'
import { amapiApplyUnlockPolicy } from '@/lib/amapi'
import { requireRoleWithName, assertDeviceInShop } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

// OWNER-only. STAFF cannot unlock directly — a device only unlocks for STAFF as
// the automatic side-effect of a cash payment that clears the overdue amount
// (handled inside mark-cash-paid).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'UNLOCK')
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    if (!(await assertDeviceInShop(id, authz.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const existing = await prisma.device.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const device = await prisma.$transaction(async (tx) => {
      const d = await tx.device.update({
        where: { id },
        data: { isLocked: false, lockMessage: null, isSirenActive: false },
      })
      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'UNLOCK',
        targetType: 'DEVICE',
        targetId: id,
      })
      return d
    })

    // The phone also polls /api/customer/device/status while its lock screen is
    // showing, so it will unlock itself even if this push is not delivered.
    const push = await sendDeviceCommand(existing.fcmToken, 'UNLOCK_DEVICE')
    if (existing.isSirenActive) await sendDeviceCommand(existing.fcmToken, 'STOP_SIREN')

    // Also restore normal policy via AMAPI for AMAPI-enrolled devices
    if (existing.amapiDeviceName) {
      await amapiApplyUnlockPolicy(existing.amapiDeviceName)
    }

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: 'MANUAL_UNLOCK',
        details: `${authz.username} (${authz.user.role}) unlocked device. Push: ${push.sent ? 'sent' : `NOT sent (${push.reason})`}. AMAPI: ${existing.amapiDeviceName ? 'policy restored' : 'n/a'}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: push.sent
        ? 'Device unlocked successfully'
        : `Unlocked on server. Push not delivered (${push.reason}); the phone will unlock on its next status check.`,
      pushSent: push.sent,
      device,
    })
  } catch (error) {
    console.error('Error unlocking device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
