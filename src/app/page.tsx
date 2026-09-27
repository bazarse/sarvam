import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { 
  Smartphone, 
  ShieldAlert, 
  CheckCircle2, 
  IndianRupee, 
  QrCode, 
  ArrowRight,
  AlertTriangle,
  Banknote,
  Database,
  Store,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react'

// Force dynamic execution at runtime to avoid build-time database connection failures
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const totalDevices = await prisma.device.count()
  const lockedDevices = await prisma.device.count({ where: { isLocked: true } })
  const activeDevices = await prisma.device.count({ where: { isLocked: false } })

  const paidEmis = await prisma.emiSchedule.aggregate({
    _sum: { amount: true },
    where: { status: 'PAID' },
  })

  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { devices: true },
      },
    },
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
    take: 6,
    orderBy: { updatedAt: 'desc' },
    include: {
      shop: {
        select: { shopName: true, phone: true },
      },
      emiSchedules: {
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { installmentNo: 'asc' },
        take: 1,
      },
    },
  })

  const stats = [
    {
      title: 'Total Phones',
      value: totalDevices,
      sub: 'All Android devices',
      icon: Smartphone,
      color: 'text-blue-600',
      bg: 'bg-blue-50/60 border-blue-200/60',
      iconBg: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Active & Paid',
      value: activeDevices,
      sub: 'Running normally',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/60 border-emerald-200/60',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Locked Phones',
      value: lockedDevices,
      sub: 'Overdue installment',
      icon: ShieldAlert,
      color: 'text-rose-600',
      bg: 'bg-rose-50/60 border-rose-200/60',
      iconBg: 'bg-rose-100 text-rose-700',
    },
    {
      title: 'Cash Collected',
      value: `₹${(paidEmis._sum.amount ?? 0).toLocaleString('en-IN')}`,
      sub: 'In-store cash received',
      icon: IndianRupee,
      color: 'text-amber-600',
      bg: 'bg-amber-50/60 border-amber-200/60',
      iconBg: 'bg-amber-100 text-amber-700',
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Devi Mobile & Accessories
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>2 Stores Active</span>
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Live Supabase Cloud</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Counter & Locker Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Dukan par cash aane par 1-click me unlock karein aur sabhi stores ke phones remotely control karein.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/devices"
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm min-h-[44px]"
          >
            <Smartphone className="w-4 h-4" />
            <span>Manage Devices</span>
          </Link>

          <Link
            href="/stores"
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-all border border-slate-200 min-h-[44px]"
          >
            <Store className="w-4 h-4 text-slate-700" />
            <span>View Stores</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-2xl bg-white border ${stat.bg} shadow-xs relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-semibold text-slate-500">{stat.title}</p>
                <div className={`p-2 sm:p-2.5 rounded-xl ${stat.iconBg}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {stat.value}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium truncate">
                {stat.sub}
              </p>
            </div>
          )
        })}
      </div>

      {/* Store Branches Quick Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />
            <span>Retail Store Branches (Live Call Numbers)</span>
          </h2>
          <Link href="/stores" className="text-xs font-bold text-blue-600 hover:underline min-h-[44px] flex items-center">
            Manage Stores →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {shops.map((s, idx) => (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Branch #{idx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{s.shopName}</h3>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{s.address}</span>
                </p>
                <p className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dialer: {s.phone}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {s._count.devices} Phones
                </span>
                <a
                  href={`tel:${s.phone}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold min-h-[38px] flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Split Section: Customer Devices & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer Devices Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Customer Devices (Real Data)</h2>
              <p className="text-xs text-slate-500">Synced in real-time with Devi Mobile database</p>
            </div>
            <Link
              href="/devices"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 min-h-[44px]"
            >
              <span>View All Devices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Customer & Phone</th>
                    <th className="px-4 py-3.5">Assigned Store</th>
                    <th className="px-4 py-3.5">Device & IMEI</th>
                    <th className="px-4 py-3.5">Next Due</th>
                    <th className="px-4 py-3.5">Lock Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devicesList.map((d) => {
                    const nextEmi = d.emiSchedules[0]
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <Link href={`/devices/${d.id}`} className="font-bold text-slate-900 hover:text-blue-600 block">
                            {d.customerName}
                          </Link>
                          <span className="text-xs text-slate-500 font-mono">{d.customerPhone}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 block truncate max-w-[150px]">
                            {d.shop?.shopName ?? 'Devi Mobile'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-800 font-medium block">{d.deviceModel}</span>
                          <span className="text-[11px] text-slate-400 font-mono">IMEI: ...{d.imei1.slice(-6)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {nextEmi ? (
                            <div>
                              <span className="text-amber-700 font-bold">₹{nextEmi.amount}</span>
                              <span className="text-[11px] text-slate-500 block">
                                #{nextEmi.installmentNo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-700 font-semibold">All Paid 🎉</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {d.isLocked ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              🔒 Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/devices/${d.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-all min-h-[38px]"
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

          {/* Mobile Card-Based View (md:hidden - Glitch-Free on Phones!) */}
          <div className="md:hidden space-y-3">
            {devicesList.map((d) => {
              const nextEmi = d.emiSchedules[0]
              return (
                <div
                  key={d.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/devices/${d.id}`} className="font-bold text-slate-900 text-base hover:text-blue-600">
                        {d.customerName}
                      </Link>
                      <a href={`tel:${d.customerPhone}`} className="text-xs text-blue-600 block font-mono font-medium mt-0.5">
                        📞 {d.customerPhone}
                      </a>
                    </div>
                    {d.isLocked ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        🔒 Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🟢 Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Branch</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {d.shop?.shopName?.replace('Devi Mobile & Accessories', '').trim() || 'Main Branch'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Device</span>
                      <span className="font-semibold text-slate-800 truncate block">{d.deviceModel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">IMEI</span>
                      <span className="font-mono text-slate-600">...{d.imei1.slice(-6)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pending EMI</span>
                      <span className="font-bold text-amber-700">
                        {nextEmi ? `₹${nextEmi.amount}` : 'All Paid'}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/devices/${d.id}`}
                    className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 min-h-[44px]"
                  >
                    <span>View Full Details & Controls</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Col: Live Activity & Logs */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Live Activity & Alerts</h2>
            <p className="text-xs text-slate-500">Real-time SIM swaps, cash entries, and lock events</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 divide-y divide-slate-100">
            {recentAlerts.map((log) => {
              const isSimAlert = log.activityType.includes('SIM')
              const isCash = log.activityType === 'CASH_PAID'

              return (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      isSimAlert
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : isCash
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
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
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {log.device?.customerName ?? 'Device Alert'}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {log.details ?? log.activityType}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
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
