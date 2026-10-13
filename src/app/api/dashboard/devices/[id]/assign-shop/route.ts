import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cleanString } from '@/lib/validate'
import { requireRoleWithName } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'SHOP_MANAGE') // OWNER-only
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }

    const body = await req.json().catch(() => null)
    const shopId = cleanString(body?.shopId, 40)

    if (!shopId) {
      return NextResponse.json({ success: false, message: 'Shop ID is required' }, { status: 400 })
    }

    const [device, targetShop] = await Promise.all([
      prisma.device.findUnique({ where: { id }, select: { id: true, shopId: true, imei1: true } }),
      prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, shopName: true } }),
    ])

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }
    if (!targetShop) {
      return NextResponse.json({ success: false, message: 'Target shop not found' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.device.update({
        where: { id },
        data: { shopId },
        include: { shop: true },
      })

      await tx.deviceActivityLog.create({
        data: {
          deviceId: id,
          activityType: 'STORE_ASSIGNED',
          details: `Reassigned to store: ${targetShop.shopName} by ${authz.username}`,
        },
      })

      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'DEVICE_ASSIGNED',
        targetType: 'DEVICE',
        targetId: id,
        metadata: { oldShopId: device.shopId, newShopId: shopId, shopName: targetShop.shopName },
      })

      return d
    })

    return NextResponse.json({
      success: true,
      message: `Device successfully assigned to ${updated.shop?.shopName}`,
      device: updated,
    })
  } catch (error) {
    console.error('Error assigning shop to device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
