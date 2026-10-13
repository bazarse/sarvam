import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleWithName, assertDeviceInShop } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

// Resets a device's bound secret token. This enables legitimate re-enrollment
// (e.g. after customer device reset, repair, or re-provisioning) by clearing
// the TOFU lock.
//
// Security Constraints:
// - Role: OWNER only (STAFF rejected with 403).
// - Scope: Must belong to the acting owner's shop.
// - Audit: Atomically recorded in immutable AuditLog + DeviceActivityLog.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await requireRoleWithName(req, 'TOKEN_RESET')
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    if (!(await assertDeviceInShop(id, auth.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const device = await prisma.device.findUnique({
      where: { id },
      select: { id: true, imei1: true, deviceTokenHash: true, shopId: true },
    })

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    if (!device.deviceTokenHash) {
      return NextResponse.json(
        { success: false, message: 'Device is not currently claimed; token reset is unnecessary' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.device.update({
        where: { id: device.id },
        data: {
          deviceTokenHash: null,
          tokenBoundAt: null,
        },
      })

      await writeAudit(tx, {
        actor: actorFromSession(auth.user, auth.username),
        shopId: auth.user.shopId,
        action: 'DEVICE_TOKEN_RESET',
        targetType: 'DEVICE',
        targetId: device.id,
        reason: 'Device security token revoked by shop owner. Ready for TOFU re-claim.',
        metadata: { imei1: device.imei1 },
      })

      await tx.deviceActivityLog.create({
        data: {
          deviceId: device.id,
          activityType: 'TOKEN_RESET',
          details: `Security token revoked by owner ${auth.username}. Ready for TOFU re-claim.`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Device security token reset. The device can now be re-enrolled via QR setup.',
    })
  } catch (error) {
    console.error('Error resetting device token:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
