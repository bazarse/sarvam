'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Smartphone, 
  ArrowLeft, 
  Lock, 
  Unlock, 
  Volume2, 
  VolumeX, 
  Banknote, 
  Clock, 
  ShieldAlert, 
  Phone, 
  Battery, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  CreditCard,
  Trash2,
  Loader2,
  FileText
} from 'lucide-react'

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [device, setDevice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (id) fetchDeviceDetail()
  }, [id])

  const fetchDeviceDetail = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/devices/${id}`)
      const data = await res.json()
      if (data.success) {
        setDevice(data.device)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleLock = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/lock`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast('Phone locked remotely')
        fetchDeviceDetail()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnlock = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/unlock`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast('Phone unlocked successfully')
        fetchDeviceDetail()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleSiren = async (enable: boolean) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/siren`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(enable ? 'Loud siren alarm activated!' : 'Siren alarm stopped')
        fetchDeviceDetail()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleCashPaid = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/mark-cash-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: 'Cash collected at counter' }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message, 'success')
        fetchDeviceDetail()
      } else {
        showToast(data.message || 'Payment failed', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this device from Sarvam Management?')) return
    try {
      const res = await fetch(`/api/dashboard/devices/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        alert('Device deleted.')
        router.push('/devices')
      }
    } catch (e) {
      alert('Failed to delete')
    }
  }

  if (loading || !device) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm">Loading device profile and EMI ledger from Supabase...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium border ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
              : 'bg-rose-950 text-rose-200 border-rose-700'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/devices"
          className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Devices List</span>
        </Link>

        <button
          onClick={handleDelete}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold min-h-[40px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove Device</span>
        </button>
      </div>

      {/* Top Device Banner & Quick Remote Controls */}
      <div className="p-6 rounded-2xl bg-[#1C2541] border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-400 font-semibold border border-blue-500/30">
                {device.brand}
              </span>
              <span className="text-xs text-slate-400">Offline Timer: {device.offlineTimerHours}h</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {device.customerName}
            </h1>
            <p className="text-sm text-slate-300 font-mono mt-0.5">
              {device.deviceModel} • IMEI: {device.imei1}
            </p>
          </div>

          {/* Quick Counter Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mark Cash Paid Button */}
            <button
              disabled={actionLoading}
              onClick={handleCashPaid}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 min-h-[44px] transition-all cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>💵 Collect Cash & Unlock</span>
            </button>

            {/* Lock / Unlock Toggle */}
            {device.isLocked ? (
              <button
                disabled={actionLoading}
                onClick={handleUnlock}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md min-h-[44px] transition-all"
              >
                <Unlock className="w-4 h-4" />
                <span>Remote Unlock</span>
              </button>
            ) : (
              <button
                disabled={actionLoading}
                onClick={handleLock}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-md min-h-[44px] transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Remote Lock</span>
              </button>
            )}

            {/* Siren Toggle */}
            <button
              disabled={actionLoading}
              onClick={() => handleSiren(!device.isSirenActive)}
              className={`inline-flex items-center space-x-2 px-3 py-2.5 rounded-xl border text-sm font-semibold min-h-[44px] transition-all ${
                device.isSirenActive
                  ? 'bg-amber-500 text-black border-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {device.isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{device.isSirenActive ? 'Stop Siren' : 'Trigger Siren'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block">Current Status</span>
            <span className={`font-bold mt-1 inline-block ${device.isLocked ? 'text-rose-400' : 'text-emerald-400'}`}>
              {device.isLocked ? '🔒 Locked' : '🟢 Active Normal'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block">Battery & Network</span>
            <span className="font-semibold text-slate-200 mt-1 inline-block">
              🔋 {device.batteryLevel ?? 80}% • {device.simOperator ?? 'SIM Active'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block">Customer Mobile</span>
            <a href={`tel:${device.customerPhone}`} className="font-semibold text-cyan-400 mt-1 inline-block font-mono">
              📞 {device.customerPhone}
            </a>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block">EMI Recovery</span>
            <span className="font-bold text-amber-400 mt-1 inline-block">
              {device.paidEmis} of {device.totalEmis} Paid (₹{device.totalLoanAmount})
            </span>
          </div>
        </div>
      </div>

      {/* EMI Ledger Table & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Complete EMI Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Monthly EMI Ledger</h2>
              <p className="text-xs text-slate-400">Complete installment payment schedule & cash receipts</p>
            </div>
          </div>

          <div className="bg-[#1C2541] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Inst. #</th>
                    <th className="px-4 py-3.5">Due Date</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Receipt / Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {device.emiSchedules?.map((emi: any) => {
                    const isPaid = emi.status === 'PAID'
                    const isOverdue = emi.status === 'OVERDUE'

                    return (
                      <tr key={emi.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white">
                          #{emi.installmentNo}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-300">
                          {new Date(emi.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">
                          ₹{emi.amount}
                        </td>
                        <td className="px-4 py-3.5">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✓ Paid
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                          {isPaid ? (
                            <div>
                              <span className="text-emerald-400 font-bold block">{emi.paymentMode ?? 'CASH'}</span>
                              <span className="text-[10px] text-slate-500">{emi.receiptNumber ?? 'Receipt OK'}</span>
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Device Security & Activity Audit Log */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Security & Audit History</h2>
            <p className="text-xs text-slate-400">Chronological activity log of this device</p>
          </div>

          <div className="bg-[#1C2541] rounded-2xl border border-slate-800 shadow-xl p-4 divide-y divide-slate-800 max-h-[480px] overflow-y-auto">
            {device.activityLogs?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No activity records yet.</p>
            ) : (
              device.activityLogs?.map((log: any) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-400">{log.activityType}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
