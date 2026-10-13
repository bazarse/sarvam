import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { sha256hex } from '@/lib/device-auth'
import { requireRoleWithName } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

// OWNER-only. Generates a fresh per-shop enrollment key, stores only its hash,
// and returns the raw key ONCE so it can be embedded in the provisioning QR.
// Rotating invalidates old QRs but does NOT affect already-claimed devices
// (those authenticate with their own per-device token).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authz = await requireRoleWithName(req, 'ENROLLMENT_KEY_ROTATE') // OWNER-only
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }
    // An OWNER may only rotate their own shop's key.
    if (id !== authz.user.shopId) {
      return NextResponse.json({ success: false, message: 'You can only manage your own shop' }, { status: 403 })
    }

    const shop = await prisma.shop.findUnique({ where: { id }, select: { id: true } })
    if (!shop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 })
    }

    const rawKey = randomBytes(24).toString('base64url') // 32-char url-safe key
    const keyHash = sha256hex(rawKey)

    await prisma.$transaction(async (tx) => {
      await tx.shop.update({ where: { id }, data: { enrollmentKeyHash: keyHash } })
      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: id,
        action: 'ENROLLMENT_KEY_ROTATED',
        targetType: 'SHOP',
        targetId: id,
      })
    })

    return NextResponse.json({
      success: true,
      message: 'New enrollment key generated. Copy it now — it will not be shown again.',
      enrollmentKey: rawKey,
    })
  } catch (error) {
    console.error('Error rotating enrollment key:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
