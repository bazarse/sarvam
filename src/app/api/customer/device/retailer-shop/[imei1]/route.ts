import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateDevice } from '@/lib/device-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ imei1: string }> }
) {
  try {
    const { imei1 } = await params

    const auth = await authenticateDevice(req, imei1)
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.reason, data: null }, { status: auth.status })
    }

    const device = await prisma.device.findUnique({
      where: { id: auth.device.id },
      include: { shop: true },
    })
    const shop = device?.shop ?? null

    return NextResponse.json({
      success: true,
      message: 'Shop details retrieved',
      data: {
        shopName: shop?.shopName ?? 'Sarvam Management',
        ownerName: shop?.ownerName ?? '',
        phone: shop?.phone ?? '',
        shopPhone: shop?.phone ?? '',
        address: shop?.address ?? '',
        shopAddress: shop?.address ?? '',
        email: shop?.email ?? '',
        shopEmail: shop?.email ?? '',
        upiId: shop?.upiId ?? null,
        shopUpiId: shop?.upiId ?? null,
      },
    })
  } catch (error) {
    console.error('Error fetching retailer shop:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
