import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { devices: true },
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
    const body = await req.json()
    const { shopName, ownerName, phone, address, email } = body

    if (!shopName || !phone) {
      return NextResponse.json({ success: false, message: 'Shop name and phone are required' }, { status: 400 })
    }

    const newShop = await prisma.shop.create({
      data: {
        shopName,
        ownerName: ownerName || 'Store Owner',
        phone,
        address: address || '',
        email: email || '',
      },
    })

    return NextResponse.json({ success: true, message: 'Store created successfully', shop: newShop })
  } catch (error) {
    console.error('Error creating shop:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
