import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActingUser } from '@/lib/authz'

// Per-staff daily cash collection report, sourced from the append-only
// AuditLog (action = CASH_PAID). OWNER sees every staff member in their own
// shop; STAFF sees only their own totals. Using AuditLog (not EmiSchedule)
// means the report reflects WHO recorded each payment even after staff changes.
export async function GET(req: NextRequest) {
  try {
    const user = await getActingUser(req)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Please sign in again' }, { status: 401 })
    }

    const dateParam = req.nextUrl.searchParams.get('date')
    const base = dateParam ? new Date(dateParam) : new Date()
    if (Number.isNaN(base.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid date' }, { status: 400 })
    }
    // Day window in server local time.
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

    const rows = await prisma.auditLog.findMany({
      where: {
        shopId: user.shopId,
        action: 'CASH_PAID',
        createdAt: { gte: start, lt: end },
        ...(user.role === 'STAFF' ? { actorId: user.userId } : {}),
      },
      select: { actorId: true, actorName: true, metadata: true },
    })

    const perStaffMap = new Map<string, { actorId: string; actorName: string; count: number; totalAmount: number }>()
    let shopTotal = 0

    for (const row of rows) {
      let amount = 0
      if (row.metadata) {
        try {
          const parsed = JSON.parse(row.metadata)
          amount = typeof parsed?.amount === 'number' ? parsed.amount : 0
        } catch { /* ignore malformed metadata */ }
      }
      shopTotal += amount
      const entry = perStaffMap.get(row.actorId) ?? {
        actorId: row.actorId,
        actorName: row.actorName,
        count: 0,
        totalAmount: 0,
      }
      entry.count += 1
      entry.totalAmount += amount
      perStaffMap.set(row.actorId, entry)
    }

    return NextResponse.json({
      success: true,
      date: start.toISOString().slice(0, 10),
      perStaff: Array.from(perStaffMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
      shopTotal,
    })
  } catch (error) {
    console.error('Error building daily cash report:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
