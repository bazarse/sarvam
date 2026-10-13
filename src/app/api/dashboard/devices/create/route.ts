import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMonthsClamped, cleanString, isValidDeviceId, toFiniteNumber } from '@/lib/validate'
import { requireRoleWithName } from '@/lib/authz'
import { writeAudit, actorFromSession } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const authz = await requireRoleWithName(req, 'DEVICE_CREATED') // OWNER-only
    if (!authz.ok) {
      return NextResponse.json({ success: false, message: authz.message }, { status: authz.status })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
    }

    const imei1 = cleanString(body.imei1, 64)
    const imei2 = cleanString(body.imei2, 64)
    const customerName = cleanString(body.customerName, 100)
    const customerPhone = cleanString(body.customerPhone, 15)
    const customerAadhaar = cleanString(body.customerAadhaar, 14)
    const deviceModel = cleanString(body.deviceModel, 100)
    const brand = cleanString(body.brand, 50) ?? 'Android'
    const shopId = cleanString(body.shopId, 40)

    if (!imei1 || !customerName || !customerPhone || !deviceModel) {
      return NextResponse.json(
        { success: false, message: 'IMEI, Customer Name, Phone, and Model are required' },
        { status: 400 }
      )
    }
    if (!isValidDeviceId(imei1) || (imei2 && !isValidDeviceId(imei2))) {
      return NextResponse.json({ success: false, message: 'IMEI must be 8-64 letters/digits' }, { status: 400 })
    }
    if (!/^[0-9+\- ]{6,15}$/.test(customerPhone)) {
      return NextResponse.json({ success: false, message: 'Invalid customer phone number' }, { status: 400 })
    }

    const totalLoanAmount = toFiniteNumber(body.totalLoanAmount ?? 15000)
    const emiAmount = toFiniteNumber(body.emiAmount ?? 2500)
    const totalEmis = toFiniteNumber(body.totalEmis ?? 6)

    if (totalLoanAmount === null || totalLoanAmount <= 0 || totalLoanAmount > 10_000_000) {
      return NextResponse.json({ success: false, message: 'Invalid total loan amount' }, { status: 400 })
    }
    if (emiAmount === null || emiAmount <= 0 || emiAmount > totalLoanAmount) {
      return NextResponse.json({ success: false, message: 'Invalid EMI amount' }, { status: 400 })
    }
    if (totalEmis === null || !Number.isInteger(totalEmis) || totalEmis < 1 || totalEmis > 60) {
      return NextResponse.json({ success: false, message: 'Number of EMIs must be between 1 and 60' }, { status: 400 })
    }

    let startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    if (body.firstDueDate) {
      const parsed = new Date(body.firstDueDate)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, message: 'Invalid first due date' }, { status: 400 })
      }
      startDate = parsed
    }

    const existing = await prisma.device.findUnique({ where: { imei1 } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Device with this IMEI already exists' },
        { status: 400 }
      )
    }

    // A device is always bound to the acting owner's own shop. The client
    // cannot create a device in some other shop by passing a different shopId.
    void shopId
    const device = await prisma.$transaction(async (tx) => {
      const created = await tx.device.create({
        data: {
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
          batteryLevel: null,
          isOnline: false,
          shopId: authz.user.shopId,
        },
      })

      await tx.emiSchedule.createMany({
        data: Array.from({ length: totalEmis }, (_, i) => ({
          deviceId: created.id,
          installmentNo: i + 1,
          dueDate: addMonthsClamped(startDate, i),
          amount: emiAmount,
          status: 'PENDING',
        })),
      })

      await tx.deviceActivityLog.create({
        data: {
          deviceId: created.id,
          activityType: 'DEVICE_ENROLLED',
          details: `Customer ${customerName} registered with ${totalEmis} EMIs by ${authz.username}`,
        },
      })

      await writeAudit(tx, {
        actor: actorFromSession(authz.user, authz.username),
        shopId: authz.user.shopId,
        action: 'DEVICE_CREATED',
        targetType: 'DEVICE',
        targetId: created.id,
        metadata: { imei1, customerName, totalEmis, totalLoanAmount },
      })

      return created
    })

    const { customerAadhaar: _omit, fcmToken: _omit2, ...safeDevice } = device
    void _omit
    void _omit2

    return NextResponse.json({
      success: true,
      message: 'Device enrolled successfully',
      device: safeDevice,
    })
  } catch (error) {
    console.error('Error creating device:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
