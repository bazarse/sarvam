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
  FileText,
  Database,
  Store,
  MapPin,
  RefreshCw
} from 'lucide-react'

interface ShopItem {
  id: string
  shopName: string
  phone: string
  address: string
  ownerName?: string
}

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [device, setDevice] = useState<any>(null)
  const [shops, setShops] = useState<ShopItem[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (id) {
      fetchDeviceDetail()
      fetchShops()
    }
  }, [id])

  const fetchDeviceDetail = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/devices/${id}`)
      const data = await res.json()
      if (data.success) {
        setDevice(data.device)
        setSelectedShopId(data.device.shopId || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/dashboard/shops')
      const data = await res.json()
      if (data.success && data.shops) {
        setShops(data.shops)
      }
    } catch (e) {
      console.error('Failed to fetch shops', e)
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

  const handleAssignShop = async (newShopId: string) => {
    if (!newShopId || newShopId === device?.shopId) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/assign-shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: newShopId }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message, 'success')
        fetchDeviceDetail()
      } else {
        showToast(data.message || 'Failed to switch store', 'error')
      }
    } catch (e) {
      showToast('Error switching store', 'error')
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
        alert('Device deleted from Supabase.')
        router.push('/devices')
      }
    } catch (e) {
      alert('Failed to delete')
    }
  }

  if (loading || !device) {
    return (
      <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium">Loading device profile and live EMI ledger from Supabase...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-sm font-semibold border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/devices"
          className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Devices List</span>
        </Link>

        <button
          onClick={handleDelete}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold min-h-[40px] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove Device</span>
        </button>
      </div>

      {/* Top Device Banner & Quick Remote Controls */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {device.brand}
              </span>
              <span className="text-xs text-slate-500 font-medium">Offline Timer: {device.offlineTimerHours}h</span>
              {device.shop && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                  <Store className="w-3 h-3 text-emerald-600" />
                  <span>{device.shop.shopName}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {device.customerName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5 flex flex-wrap gap-x-2">
              <span>{device.deviceModel}</span>
              <span>•</span>
              <span>IMEI 1: {device.imei1}</span>
              {device.imei2 && (
                <>
                  <span>•</span>
                  <span>IMEI 2: {device.imei2}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Counter Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mark Cash Paid Button */}
            <button
              disabled={actionLoading}
              onClick={handleCashPaid}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm min-h-[44px] transition-all cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>💵 Collect Cash & Unlock</span>
            </button>

            {/* Lock / Unlock Toggle */}
            {device.isLocked ? (
              <button
                disabled={actionLoading}
                onClick={handleUnlock}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-sm min-h-[44px] transition-all cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Remote Unlock</span>
              </button>
            ) : (
              <button
                disabled={actionLoading}
                onClick={handleLock}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-sm min-h-[44px] transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Remote Lock</span>
              </button>
            )}

            {/* Siren Toggle */}
            <button
              disabled={actionLoading}
              onClick={() => handleSiren(!device.isSirenActive)}
              className={`inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl border text-sm font-bold min-h-[44px] transition-all cursor-pointer ${
                device.isSirenActive
                  ? 'bg-amber-500 text-slate-900 border-amber-600 font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {device.isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{device.isSirenActive ? 'Stop Siren' : 'Trigger Siren'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Chips (2 cols mobile, 4 cols desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block">Current Status</span>
            <span className={`font-bold mt-1 inline-block ${device.isLocked ? 'text-rose-700' : 'text-emerald-700'}`}>
              {device.isLocked ? '🔒 Locked' : '🟢 Active Normal'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block">Battery & Network</span>
            <span className="font-semibold text-slate-800 mt-1 inline-block">
              🔋 {device.batteryLevel ?? 80}% • {device.simOperator ?? 'SIM Active'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block">Customer Mobile</span>
            <a href={`tel:${device.customerPhone}`} className="font-bold text-blue-600 mt-1 inline-block font-mono hover:underline">
              📞 {device.customerPhone}
            </a>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block">EMI Recovery</span>
            <span className="font-bold text-amber-700 mt-1 inline-block">
              {device.paidEmis} of {device.totalEmis} Paid (₹{device.totalLoanAmount})
            </span>
          </div>
        </div>
      </div>

      {/* Store Branch Assignment Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Assigned Store Branch: {device.shop?.shopName ?? 'Devi Mobile & Accessories'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{device.shop?.address ?? 'Main Market'}</span>
          </p>
          <div className="flex items-center gap-3 pt-1 text-xs">
            <a
              href={`tel:${device.shop?.phone ?? '9876543210'}`}
              className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100"
            >
              <Phone className="w-3 h-3" />
              <span>Dial Store: {device.shop?.phone ?? '9876543210'}</span>
            </a>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 font-medium">Owner: {device.shop?.ownerName ?? 'Devi Mobile'}</span>
          </div>
        </div>

        {/* Change Store Branch Dropdown */}
        <div className="flex items-center space-x-2 pt-2 md:pt-0">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 block">Switch Store Branch:</label>
            <select
              value={selectedShopId}
              onChange={(e) => {
                setSelectedShopId(e.target.value)
                handleAssignShop(e.target.value)
              }}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 min-h-[44px]"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shopName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* EMI Ledger Table & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Complete EMI Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Monthly EMI Ledger (Live DB)</h2>
              <p className="text-xs text-slate-500">All installment statuses recorded in Supabase</p>
            </div>
          </div>

          {/* 1. Mobile Cards for EMI installments (md:hidden) */}
          <div className="md:hidden space-y-2.5">
            {device.emiSchedules?.map((emi: any) => {
              const isPaid = emi.status === 'PAID'
              const isOverdue = emi.status === 'OVERDUE'

              return (
                <div
                  key={emi.id}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">
                      Installment #{emi.installmentNo}
                    </span>
                    {isPaid ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ Paid
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Due Date: {new Date(emi.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="text-base font-extrabold text-slate-900">₹{emi.amount}</span>
                  </div>

                  {isPaid && (
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Mode: {emi.paymentMode ?? 'CASH'}</span>
                      <span>Receipt: {emi.receiptNumber ?? 'Receipt OK'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 2. Desktop Table for EMI installments (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Inst. #</th>
                    <th className="px-4 py-3.5">Due Date</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Receipt / Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {device.emiSchedules?.map((emi: any) => {
                    const isPaid = emi.status === 'PAID'
                    const isOverdue = emi.status === 'OVERDUE'

                    return (
                      <tr key={emi.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          #{emi.installmentNo}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700">
                          {new Date(emi.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          ₹{emi.amount}
                        </td>
                        <td className="px-4 py-3.5">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Paid
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                          {isPaid ? (
                            <div>
                              <span className="text-emerald-700 font-bold block">{emi.paymentMode ?? 'CASH'}</span>
                              <span className="text-[10px] text-slate-400">{emi.receiptNumber ?? 'Receipt OK'}</span>
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
            <h2 className="text-lg font-bold text-slate-900">Security & Audit History</h2>
            <p className="text-xs text-slate-500">Real-time action logs from Supabase</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {device.activityLogs?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-medium">No activity records yet.</p>
            ) : (
              device.activityLogs?.map((log: any) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700">{log.activityType}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
