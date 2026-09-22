import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const totalDevices = await prisma.device.count()
    const lockedDevices = await prisma.device.count({ where: { isLocked: true } })
    const activeDevices = await prisma.device.count({ where: { isLocked: false } })

    // Consider offline if lastPingAt > 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const offlineDevices = await prisma.device.count({
      where: { lastPingAt: { lt: twoHoursAgo } },
    })

    // EMI collections
    const paidEmis = await prisma.emiSchedule.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID' },
    })

    const pendingEmis = await prisma.emiSchedule.aggregate({
      _sum: { amount: true },
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
    })

    const overdueCount = await prisma.emiSchedule.count({
      where: { status: 'OVERDUE' },
    })

    // Recent security alerts (SIM swaps, Lock actions)
    const recentAlerts = await prisma.deviceActivityLog.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        device: {
          select: { customerName: true, deviceModel: true, imei1: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalDevices,
        activeDevices,
        lockedDevices,
        offlineDevices,
        overdueCount,
        totalCollected: paidEmis._sum.amount ?? 0,
        pendingAmount: pendingEmis._sum.amount ?? 0,
        recentAlerts,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
