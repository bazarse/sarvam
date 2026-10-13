import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { safeEqual } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

// Scheduled job (e.g. Vercel cron hitting this route). Locks devices whose EMI
// is overdue beyond their grace period and are not already locked. The phone
// picks up the lock on its next status poll — no FCM dependency.
//
// Auth: not behind the admin session (cron has no cookie). Requires
//   Authorization: Bearer <CRON_SECRET>
// compared in constant time against process.env.CRON_SECRET.
const OVERDUE_LOCK_MESSAGE = 'ईएमआई बकाया: किस्त की देय तिथि निकल गई है। कृपया भुगतान करें। फोन लॉक कर दिया गया है।'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ success: false, message: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') ?? ''
  const presented = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!presented || !safeEqual(presented, secret)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  try {
    // Candidate devices: not already locked, and with at least one unpaid,
    // past-due installment. gracePeriodDays is already folded into dueDate when
    // grace is granted, so a dueDate in the past means overdue beyond grace.
    const candidates = await prisma.device.findMany({
      where: {
        isLocked: false,
        emiSchedules: {
          some: { status: { not: 'PAID' }, dueDate: { lt: now } },
        },
      },
      select: { id: true, imei1: true, shopId: true },
    })

    let locked = 0
    const failed: string[] = []

    for (const device of candidates) {
      try {
        await prisma.$transaction(async (tx) => {
          // Re-check inside the transaction to avoid racing a payment.
          const stillOverdue = await tx.emiSchedule.count({
            where: { deviceId: device.id, status: { not: 'PAID' }, dueDate: { lt: now } },
          })
          const current = await tx.device.findUnique({ where: { id: device.id }, select: { isLocked: true } })
          if (!current || current.isLocked || stillOverdue === 0) return

          await tx.device.update({
            where: { id: device.id },
            data: { isLocked: true, lockMessage: OVERDUE_LOCK_MESSAGE },
          })
          await tx.deviceActivityLog.create({
            data: {
              deviceId: device.id,
              activityType: 'AUTO_LOCK',
              details: `Auto-locked by EMI cron: ${stillOverdue} overdue installment(s).`,
            },
          })
          await writeAudit(tx, {
            actor: { system: true },
            shopId: device.shopId ?? 'unknown',
            action: 'LOCK',
            targetType: 'DEVICE',
            targetId: device.id,
            reason: 'EMI overdue beyond grace (automatic)',
            metadata: { overdueCount: stillOverdue },
          })
          locked += 1
        })
      } catch (e) {
        console.error(`[cron/emi-autolock] failed for device ${device.id}:`, e)
        failed.push(device.id)
      }
    }

    return NextResponse.json({ success: true, scanned: candidates.length, locked, failed })
  } catch (error) {
    console.error('Error in emi-autolock cron:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
