import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActingUser } from '@/lib/authz'

export async function GET(req: NextRequest) {
  try {
    const user = await getActingUser(req)
    const shopFilter = user?.shopId ? { shopId: user.shopId } : undefined
    const emiShopFilter = user?.shopId ? { device: { shopId: user.shopId } } : undefined

    const [
      totalDevices,
      lockedDevices,
      activeDevices,
      offlineDevices,
      paidEmis,
      pendingEmis,
      overdueCount,
      recentAlerts,
    ] = await Promise.all([
      prisma.device.count({ where: shopFilter }),
      prisma.device.count({ where: { ...shopFilter, isLocked: true } }),
      prisma.device.count({ where: { ...shopFilter, isLocked: false } }),
      prisma.device.count({
        where: {
          ...shopFilter,
          lastPingAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
      }),
      prisma.emiSchedule.aggregate({
        _sum: { amount: true },
        where: { ...emiShopFilter, status: 'PAID' },
      }),
      prisma.emiSchedule.aggregate({
        _sum: { amount: true },
        where: { ...emiShopFilter, status: { in: ['PENDING', 'OVERDUE'] } },
      }),
      prisma.emiSchedule.count({
        where: { ...emiShopFilter, status: 'OVERDUE' },
      }),
      prisma.deviceActivityLog.findMany({
        where: emiShopFilter,
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          device: {
            select: { customerName: true, deviceModel: true, imei1: true },
          },
        },
      }),
    ])

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
