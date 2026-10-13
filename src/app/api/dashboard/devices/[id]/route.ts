import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maskAadhaar } from '@/lib/validate'
import { requireRoleWithName, assertDeviceInShop, getActingUser } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

const ONLINE_WINDOW_MS = 2 * 60 * 60 * 1000

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Any signed-in user of the owning shop can view. v1 legacy sessions are
    // rejected (no shop scope).
    const user = await getActingUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Please sign in again' }, { status: 401 })
    }
    if (!(await assertDeviceInShop(id, user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const device = await prisma.device.findUnique({
      where: { id },
      omit: { fcmToken: true },
      include: {
        emiSchedules: {
          orderBy: { installmentNo: 'asc' },
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        shop: true,
      },
    })

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      device: {
        ...device,
        customerAadhaar: maskAadhaar(device.customerAadhaar),
        isOnline: Date.now() - device.lastPingAt.getTime() < ONLINE_WINDOW_MS,
      },
    })
  } catch (error) {
    console.error('Error fetching device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'DEVICE_DELETED') // OWNER-only
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    if (!(await assertDeviceInShop(id, authz.user))) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    const device = await prisma.device.findUnique({ where: { id }, select: { isLocked: true, imei1: true } })
    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }
    // If a locked phone's record is deleted, the phone can never fetch an
    // "unlocked" status again and stays locked forever.
    if (device.isLocked) {
      return NextResponse.json(
        { success: false, message: 'Unlock the phone first. Deleting a locked device would leave the customer phone locked permanently.' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Audit first (the device row is about to be deleted; keep the record).
      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'DEVICE_DELETED',
        targetType: 'DEVICE',
        targetId: id,
        metadata: { imei1: device.imei1 },
      })
      await tx.device.delete({ where: { id } })
    })

    return NextResponse.json({ success: true, message: 'Device deleted successfully' })
  } catch (error) {
    console.error('Error deleting device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
