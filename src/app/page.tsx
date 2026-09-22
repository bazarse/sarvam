import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { 
  Smartphone, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  PlusCircle, 
  QrCode, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Banknote
} from 'lucide-react'

// Server component with revalidation
export const revalidate = 10

export default async function DashboardPage() {
  const totalDevices = await prisma.device.count()
  const lockedDevices = await prisma.device.count({ where: { isLocked: true } })
  const activeDevices = await prisma.device.count({ where: { isLocked: false } })

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const offlineDevices = await prisma.device.count({
    where: { lastPingAt: { lt: twoHoursAgo } },
  })

  const paidEmis = await prisma.emiSchedule.aggregate({
    _sum: { amount: true },
    where: { status: 'PAID' },
  })

  const pendingEmis = await prisma.emiSchedule.aggregate({
    _sum: { amount: true },
    where: { status: { in: ['PENDING', 'OVERDUE'] } },
  })

  const recentAlerts = await prisma.deviceActivityLog.findMany({
    take: 6,
    orderBy: { timestamp: 'desc' },
    include: {
      device: {
        select: { customerName: true, deviceModel: true, imei1: true, id: true },
      },
    },
  })

  const devicesList = await prisma.device.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      emiSchedules: {
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { installmentNo: 'asc' },
        take: 1,
      },
    },
  })

  const stats = [
    {
      title: 'Total Enrolled',
      value: totalDevices,
      sub: 'All Android devices',
      icon: Smartphone,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Active & Paid',
      value: activeDevices,
      sub: 'Phones running normally',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Locked Devices',
      value: lockedDevices,
      sub: 'Overdue or manual lock',
      icon: ShieldAlert,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      title: 'Total Collected',
      value: `₹${(paidEmis._sum.amount ?? 0).toLocaleString('en-IN')}`,
      sub: 'Cash & UPI payments',
      icon: IndianRupee,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1C2541] via-[#162039] to-[#1C2541] border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-cyan-400 border border-blue-500/30">
              Retailer Command Center
            </span>
            <span className="text-xs text-slate-400">Manual EMI & Anti-Theft</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Sarvam Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            1-Click Lock, Unlock, Cash Receipt, aur Anti-Theft Siren System
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/devices"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/30 min-h-[44px]"
          >
            <Smartphone className="w-4 h-4" />
            <span>Manage Devices</span>
          </Link>

          <Link
            href="/enroll"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0B132B] hover:bg-slate-900 border border-slate-700 text-cyan-300 font-medium text-sm transition-all min-h-[44px]"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Setup QR</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl bg-[#1C2541] border ${stat.bg} shadow-lg relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                <div className={`p-2 rounded-xl bg-slate-900/60 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span>{stat.sub}</span>
              </p>
            </div>
          )
        })}
      </div>

      {/* Main Split Section: Devices Table & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Devices Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Recent Customer Devices</h2>
              <p className="text-xs text-slate-400">Quick view of customer phone status & upcoming dues</p>
            </div>
            <Link
              href="/devices"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 min-h-[44px]"
            >
              <span>View All Devices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Table Card */}
          <div className="bg-[#1C2541] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Customer & Phone</th>
                    <th className="px-4 py-3.5">Device Model</th>
                    <th className="px-4 py-3.5">Next Due</th>
                    <th className="px-4 py-3.5">Lock Status</th>
                    <th className="px-4 py-3.5 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {devicesList.map((d) => {
                    const nextEmi = d.emiSchedules[0]
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <Link href={`/devices/${d.id}`} className="font-semibold text-white hover:text-cyan-300 block">
                            {d.customerName}
                          </Link>
                          <span className="text-xs text-slate-400 font-mono">{d.customerPhone}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-200 font-medium block">{d.deviceModel}</span>
                          <span className="text-[11px] text-slate-400 font-mono">IMEI: ...{d.imei1.slice(-6)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {nextEmi ? (
                            <div>
                              <span className="text-amber-400 font-bold">₹{nextEmi.amount}</span>
                              <span className="text-[11px] text-slate-400 block">
                                Inst. #{nextEmi.installmentNo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium">All Paid 🎉</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {d.isLocked ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              🔒 Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              🟢 Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/devices/${d.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600/20 text-cyan-300 hover:bg-blue-600/40 text-xs font-medium border border-blue-500/30 transition-all min-h-[38px]"
                          >
                            Open Ledger
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Live Security & Activity Logs */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Live Activity & Alerts</h2>
            <p className="text-xs text-slate-400">Real-time SIM changes, payments, & locks</p>
          </div>

          <div className="bg-[#1C2541] rounded-2xl border border-slate-800 shadow-xl p-4 divide-y divide-slate-800">
            {recentAlerts.map((log) => {
              const isSimAlert = log.activityType.includes('SIM')
              const isCash = log.activityType === 'CASH_PAID'
              const isLock = log.activityType.includes('LOCK')

              return (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      isSimAlert
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : isCash
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-cyan-400 border border-blue-500/20'
                    }`}
                  >
                    {isSimAlert ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : isCash ? (
                      <Banknote className="w-4 h-4" />
                    ) : (
                      <ShieldAlert className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white truncate">
                        {log.device?.customerName ?? 'Device Alert'}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {log.details ?? log.activityType}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {log.device?.deviceModel} (IMEI: ...{log.device?.imei1.slice(-4)})
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
