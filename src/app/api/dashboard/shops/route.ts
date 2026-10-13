import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cleanString } from '@/lib/validate'
import { requireRoleWithName } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { devices: true, users: true },
        },
      },
    })
    return NextResponse.json({ success: true, shops })
  } catch (error) {
    console.error('Error fetching shops:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireRoleWithName(req, 'SHOP_MANAGE') // OWNER-only
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
    }

    const shopName = cleanString(body.shopName, 100)
    const ownerName = cleanString(body.ownerName, 100) || 'Store Owner'
    const phone = cleanString(body.phone, 15)
    const address = cleanString(body.address, 300) || ''
    const email = cleanString(body.email, 100) || ''
    const upiId = cleanString(body.upiId, 100) || 'sarvam@upi'

    if (!shopName || !phone) {
      return NextResponse.json({ success: false, message: 'Shop name and phone are required' }, { status: 400 })
    }

    const newShop = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          shopName,
          ownerName,
          phone,
          address,
          email,
          upiId,
        },
      })

      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: shop.id,
        action: 'SHOP_CREATED',
        targetType: 'SHOP',
        targetId: shop.id,
        metadata: { shopName, phone },
      })

      return shop
    })

    return NextResponse.json({ success: true, message: 'Store created successfully', shop: newShop })
  } catch (error) {
    console.error('Error creating shop:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
