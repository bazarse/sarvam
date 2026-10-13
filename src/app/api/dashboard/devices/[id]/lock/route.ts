import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDeviceCommand } from '@/lib/fcm'
import { cleanString } from '@/lib/validate'
import { requireRoleWithName, assertDeviceInShop } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

const DEFAULT_LOCK_MESSAGE = 'ईएमआई बकाया: कृपया सर्वम मैनेजमेंट पर संपर्क करें। फोन लॉक कर दिया गया है।'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'LOCK')
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    if (!(await assertDeviceInShop(id, authz.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const customMessage = cleanString(body?.message, 500) ?? DEFAULT_LOCK_MESSAGE

    const existing = await prisma.device.findUnique({
      where: { id },
      include: {
        shop: { select: { upiId: true } },
        emiSchedules: {
          where: { status: { not: 'PAID' } },
          orderBy: { installmentNo: 'asc' },
          take: 1,
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const device = await prisma.$transaction(async (tx) => {
      const d = await tx.device.update({
        where: { id },
        data: { isLocked: true, lockMessage: customMessage },
      })
      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'LOCK',
        targetType: 'DEVICE',
        targetId: id,
        metadata: { message: customMessage },
      })
      return d
    })

    const push = await sendDeviceCommand(existing.fcmToken, 'LOCK_DEVICE', {
      message: customMessage,
      upiId: existing.shop?.upiId,
      amount: existing.emiSchedules[0]?.amount ?? existing.emiAmount,
    })

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: id,
        activityType: 'MANUAL_LOCK',
        details: `${authz.username} (${authz.user.role}) locked device: "${customMessage}". Push: ${push.sent ? 'sent' : `NOT sent (${push.reason})`}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: push.sent
        ? 'Device locked successfully'
        : `Marked locked on server, but the lock command was NOT delivered to the phone: ${push.reason}`,
      pushSent: push.sent,
      device,
    })
  } catch (error) {
    console.error('Error locking device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
