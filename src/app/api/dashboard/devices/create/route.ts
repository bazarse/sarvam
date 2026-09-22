import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      imei1,
      imei2,
      customerName,
      customerPhone,
      customerAadhaar,
      deviceModel,
      brand,
      totalLoanAmount,
      emiAmount,
      totalEmis,
      firstDueDate,
    } = body

    if (!imei1 || !customerName || !customerPhone || !deviceModel) {
      return NextResponse.json(
        { success: false, message: 'IMEI, Customer Name, Phone, and Model are required' },
        { status: 400 }
      )
    }

    const existing = await prisma.device.findUnique({
      where: { imei1 },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Device with this IMEI already exists' },
        { status: 400 }
      )
    }

    const shop = await prisma.shop.findFirst()

    const device = await prisma.device.create({
      data: {
        imei1,
        imei2,
        customerName,
        customerPhone,
        customerAadhaar,
        deviceModel,
        brand: brand || 'Android',
        totalLoanAmount: parseFloat(totalLoanAmount || '15000'),
        emiAmount: parseFloat(emiAmount || '2500'),
        totalEmis: parseInt(totalEmis || '6'),
        shopId: shop?.id,
      },
    })

    // Generate EMI Schedule
    const startDate = firstDueDate ? new Date(firstDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const emiCount = parseInt(totalEmis || '6')
    const installmentAmt = parseFloat(emiAmount || '2500')

    for (let i = 1; i <= emiCount; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + (i - 1))

      await prisma.emiSchedule.create({
        data: {
          deviceId: device.id,
          installmentNo: i,
          dueDate,
          amount: installmentAmt,
          status: 'PENDING',
        },
      })
    }

    // Add activity log
    await prisma.deviceActivityLog.create({
      data: {
        deviceId: device.id,
        activityType: 'DEVICE_ENROLLED',
        details: `Customer ${customerName} registered with ${emiCount} EMIs`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Device enrolled successfully',
      device,
    })
  } catch (error) {
    console.error('Error creating device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
