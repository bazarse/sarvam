import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? 'ALL'

    const where: any = {}

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
      include: {
        emiSchedules: {
          orderBy: { installmentNo: 'asc' },
        },
        shop: {
          select: { shopName: true, upiId: true, phone: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      devices,
    })
  } catch (error) {
    console.error('Error listing devices:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
