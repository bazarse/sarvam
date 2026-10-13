import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getActingUser } from '@/lib/authz'

// A phone is considered online if it contacted the server in the last 2 hours
const ONLINE_WINDOW_MS = 2 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const user = await getActingUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Please sign in again' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') ?? '').slice(0, 100)
    const status = searchParams.get('status') ?? 'ALL'

    // Scope every list to the acting user's shop — no cross-shop visibility.
    const where: Prisma.DeviceWhereInput = { shopId: user.shopId }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { imei1: { contains: search } },
        { deviceModel: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status === 'LOCKED') {
      where.isLocked = true
    } else if (status === 'ACTIVE') {
      where.isLocked = false
    }

    const devices = await prisma.device.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      // Never send Aadhaar numbers or push tokens to the browser in list views
      omit: { customerAadhaar: true, fcmToken: true },
      include: {
        emiSchedules: {
          orderBy: { installmentNo: 'asc' },
        },
        shop: {
          select: { id: true, shopName: true, phone: true, address: true, ownerName: true },
        },
      },
    })

    const now = Date.now()
    return NextResponse.json({
      success: true,
      devices: devices.map((d) => ({
        ...d,
        isOnline: now - d.lastPingAt.getTime() < ONLINE_WINDOW_MS,
      })),
    })
  } catch (error) {
    console.error('Error listing devices:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
