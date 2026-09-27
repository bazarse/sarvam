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
        shopName: shop?.shopName ?? 'Devi Mobile & Accessories',
        ownerName: shop?.ownerName ?? 'Devi Lal',
        phone: shop?.phone ?? '9876543210',
        shopPhone: shop?.phone ?? '9876543210',
        address: shop?.address ?? 'Shop 14, Near Clock Tower, Main Market',
        shopAddress: shop?.address ?? 'Shop 14, Near Clock Tower, Main Market',
        email: shop?.email ?? 'devimobile.main@gmail.com',
        shopEmail: shop?.email ?? 'devimobile.main@gmail.com',
      },
    })
  } catch (error) {
    console.error('Error fetching retailer shop:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
