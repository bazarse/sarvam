import { NextRequest, NextResponse } from 'next/server'
import { getActingUser } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getActingUser(req)
    if (!sessionUser) {
      return NextResponse.json({ success: false, user: null }, { status: 401 })
    }

    const [user, shop] = await Promise.all([
      prisma.user.findUnique({
        where: { id: sessionUser.userId },
        select: { id: true, username: true, role: true, isActive: true },
      }),
      prisma.shop.findUnique({
        where: { id: sessionUser.shopId },
        select: { id: true, shopName: true, phone: true, upiId: true },
      }),
    ])

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, user: null }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        shopId: sessionUser.shopId,
        shopName: shop?.shopName ?? 'Main Shop',
      },
    })
  } catch (error) {
    console.error('Error fetching auth session:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
