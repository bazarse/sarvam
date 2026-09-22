import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imei1, lockSuccess, action, errorMessage } = body

    if (!imei1) {
      return NextResponse.json({ success: false, message: 'IMEI is required' }, { status: 400 })
    }

    const device = await prisma.device.findUnique({
      where: { imei1 },
    })

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found' }, { status: 404 })
    }

    // Record activity log
    const activityType = (action ?? 'LOCK_STATUS').toUpperCase()
    await prisma.deviceActivityLog.create({
      data: {
        deviceId: device.id,
        activityType,
        details: errorMessage ? `${errorMessage} (Success: ${lockSuccess})` : `Action executed: ${action}`,
      },
    })

    // If sim swap was reported, mark locked
    if (action === 'sim_swapped') {
      await prisma.device.update({
        where: { id: device.id },
        data: {
          isLocked: true,
          lockMessage: 'अनधिकृत सिम कार्ड का पता चला। कृपया अधिकृत सिम कार्ड पुनः डालें।',
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Lock response processed successfully',
    })
  } catch (error) {
    console.error('Error in lock-response:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
