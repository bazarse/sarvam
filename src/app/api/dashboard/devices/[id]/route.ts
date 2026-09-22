import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        emiSchedules: {
          orderBy: { installmentNo: 'asc' },
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        shop: true,
      },
    })

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, device })
  } catch (error) {
    console.error('Error fetching device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.device.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Device deleted successfully' })
  } catch (error) {
    console.error('Error deleting device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
