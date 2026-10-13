import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDeviceCommand } from '@/lib/fcm'
import { requireRoleWithName, assertDeviceInShop } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Siren is a lock-style pressure action; STAFF are allowed (same as LOCK).
    const authz = await requireRoleWithName(req, 'LOCK')
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    if (!(await assertDeviceInShop(id, authz.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const enable = body?.enable === undefined ? true : body.enable === true

    const existing = await prisma.device.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const device = await prisma.$transaction(async (tx) => {
      const d = await tx.device.update({
        where: { id },
        data: { isSirenActive: enable },
      })
      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'LOCK',
        targetType: 'DEVICE',
        targetId: id,
        metadata: { siren: enable },
      })
      return d
    })

    const push = await sendDeviceCommand(existing.fcmToken, enable ? 'SIREN' : 'STOP_SIREN')

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: enable ? 'SIREN_TRIGGERED' : 'SIREN_STOPPED',
        details: `${enable ? 'Emergency loud siren alarm activated' : 'Siren alarm stopped'}. Push: ${push.sent ? 'sent' : `NOT sent (${push.reason})`}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: push.sent
        ? enable ? 'Siren activated successfully' : 'Siren stopped successfully'
        : `Saved on server, but the siren command was NOT delivered to the phone: ${push.reason}`,
      pushSent: push.sent,
      device,
    })
  } catch (error) {
    console.error('Error toggling siren:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
