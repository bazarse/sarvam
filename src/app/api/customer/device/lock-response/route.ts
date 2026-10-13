import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cleanString } from '@/lib/validate'
import { authenticateDevice } from '@/lib/device-auth'
import { writeAudit } from '@/lib/audit'

const SIM_LOCK_MESSAGE = 'अनधिकृत सिम कार्ड का पता चला। कृपया अधिकृत सिम कार्ड पुनः डालें।'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const imei1 = body?.imei1

    const auth = await authenticateDevice(req, imei1)
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.reason }, { status: auth.status })
    }

    const device = { id: auth.device.id }

    const action = cleanString(body?.action, 40) ?? 'LOCK_STATUS'
    const activityType = /^[A-Za-z_]+$/.test(action) ? action.toUpperCase() : 'LOCK_STATUS'
    const errorMessage = cleanString(body?.errorMessage, 300)
    const lockSuccess = body?.lockSuccess === true

    await prisma.deviceActivityLog.create({
      data: {
        deviceId: device.id,
        activityType,
        details: errorMessage ? `${errorMessage} (Success: ${lockSuccess})` : `Action executed: ${action} (Success: ${lockSuccess})`,
      },
    })

    // The phone locks itself on SIM swap; keep the server state in sync
    if (action.toLowerCase() === 'sim_swapped') {
      await prisma.device.update({
        where: { id: device.id },
        data: { isLocked: true, lockMessage: SIM_LOCK_MESSAGE },
      })

      if (auth.device.shopId) {
        await writeAudit(prisma, {
          actor: { system: true },
          shopId: auth.device.shopId,
          action: 'SIM_SWAP_ALERT',
          targetType: 'DEVICE',
          targetId: device.id,
          reason: 'Unauthorized SIM swap detected by phone sensor. Device locked automatically.',
          metadata: { imei1, action, errorMessage },
        }).catch(() => {})
      }
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { isOnline: true, lastPingAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Lock response processed successfully',
    })
  } catch (error) {
    console.error('Error in lock-response:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
