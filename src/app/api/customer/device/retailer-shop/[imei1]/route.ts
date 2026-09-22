import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ imei1: string }> }
) {
  try {
    const { imei1 } = await params

    const device = await prisma.device.findUnique({
      where: { imei1 },
      include: { shop: true },
    })

    const shop = device?.shop ?? (await prisma.shop.findFirst())

    return NextResponse.json({
      success: true,
      message: 'Shop details retrieved',
      data: {
        shopName: shop?.shopName ?? 'Sarvam Management',
        ownerName: shop?.ownerName ?? 'Admin Partner',
        phone: shop?.phone ?? '9876543210',
        email: shop?.email ?? 'support@sarvam.com',
        upiId: shop?.upiId ?? 'sarvam@upi',
      },
    })
  } catch (error) {
    console.error('Error fetching retailer shop:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
