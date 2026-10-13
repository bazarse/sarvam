'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Lock, 
  Unlock, 
  Volume2, 
  VolumeX, 
  Banknote, 
  Phone, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  Loader2,
  Store,
  MapPin,
  ShieldCheck,
  RotateCcw,
  Cpu
} from 'lucide-react'

interface ShopItem {
  id: string
  shopName: string
  phone: string
  address: string
  ownerName?: string
}

interface EmiItem {
  id: string
  installmentNo: number
  dueDate: string
  amount: number
  status: string
  paymentMode?: string | null
  paidAt?: string | null
  receiptNumber?: string | null
  remarks?: string | null
}

interface ActivityLogItem {
  id: string
  activityType: string
  details?: string | null
  ipAddress?: string | null
  timestamp: string
}

interface DeviceDetail {
  id: string
  imei1: string
  imei2?: string | null
  customerName: string
  customerPhone: string
  customerAadhaar?: string | null
  deviceModel: string
  brand: string
  status: string
  isLocked: boolean
  lockMessage?: string | null
  isSirenActive: boolean
  batteryLevel?: number | null
  isOnline: boolean
  lastPingAt: string
  lastKnownLat?: number | null
  lastKnownLng?: number | null
  simIccid?: string | null
  simOperator?: string | null
  serialNumber?: string | null
  appVersion?: string | null
  androidVersion?: string | null
  deviceTokenHash?: string | null
  tokenBoundAt?: string | null
  lastAuthAt?: string | null
  offlineTimerHours: number
  totalLoanAmount: number
  emiAmount: number
  totalEmis: number
  paidEmis: number
  gracePeriodDays: number
  shopId?: string | null
  shop?: ShopItem | null
  emiSchedules?: EmiItem[]
  activityLogs?: ActivityLogItem[]
}

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [device, setDevice] = useState<DeviceDetail | null>(null)
  const [shops, setShops] = useState<ShopItem[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    let ignore = false
    if (id) {
      fetch(`/api/dashboard/devices/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore && data.success) {
            setDevice(data.device)
            setSelectedShopId(data.device.shopId || '')
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false)
        })

      fetch('/api/dashboard/shops')
        .then((res) => res.json())
        .then((data) => {
          if (!ignore && data.success && data.shops) setShops(data.shops)
        })
        .catch(() => {})
    }
    return () => {
      ignore = true
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
        showToast(data.pushSent ? 'Phone locked remotely' : data.message, data.pushSent ? 'success' : 'error')
        fetchDeviceDetail()
      } else {
        showToast(data.message || 'Failed to lock phone', 'error')
      }
    } catch {
      showToast('Network error while locking', 'error')
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
        showToast(data.pushSent ? 'Phone unlocked successfully' : data.message, data.pushSent ? 'success' : 'error')
        fetchDeviceDetail()
      } else {
        showToast(data.message || 'Failed to unlock phone', 'error')
      }
    } catch {
      showToast('Network error while unlocking', 'error')
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
        if (data.pushSent) showToast(enable ? 'Loud siren alarm activated!' : 'Siren alarm stopped')
        else showToast(data.message, 'error')
        fetchDeviceDetail()
      } else {
        showToast(data.message || 'Failed to toggle siren', 'error')
      }
    } catch {
      showToast('Network error while toggling siren', 'error')
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
    } catch {
      showToast('Error switching store', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetToken = async () => {
    if (!confirm('Are you sure you want to revoke the security token for this device? This will clear the TOFU lock and allow legitimate re-enrollment via QR setup.')) {
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/reset-token`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast('Device security token reset! Device can now be re-enrolled via QR setup.', 'success')
        fetchDeviceDetail()
      } else {
        showToast(data.message || 'Failed to reset token', 'error')
      }
    } catch {
      showToast('Network error while resetting token', 'error')
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
      } else {
        alert(data.message || 'Failed to delete')
      }
    } catch {
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
              🔋 {device.batteryLevel != null ? `${device.batteryLevel}%` : 'Unknown'} • {device.simOperator ?? 'SIM info not reported'}
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

      {/* Device Security & TOFU Hardware Identity Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Enterprise TOFU Security & Hardware Binding</span>
                {device.tokenBoundAt ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🟢 Bound & Active
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    🟡 Unclaimed (Awaiting QR Setup)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Cryptographic per-device SHA-256 token authentication & dual IMEI anti-spoofing
              </p>
            </div>
          </div>

          <button
            disabled={actionLoading}
            onClick={handleResetToken}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all min-h-[44px] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset TOFU Token (Re-enroll)</span>
          </button>
        </div>

        {/* Security Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-500 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>TOFU Secret Status</span>
            </div>
            <div className="text-slate-800 font-medium">
              {device.tokenBoundAt ? (
                <>
                  <p className="font-bold text-emerald-700">SHA-256 Token Enforced</p>
                  <p className="text-[11px] text-slate-500">
                    Bound: {new Date(device.tokenBoundAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </>
              ) : (
                <p className="text-amber-700 font-semibold">Pending Enrollment</p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-semibold block">Hardware Identifiers</span>
            <div className="font-mono text-slate-800 space-y-0.5 text-[11px]">
              <p><span className="text-slate-400">IMEI 1:</span> {device.imei1}</p>
              <p><span className="text-slate-400">IMEI 2:</span> {device.imei2 || 'Not detected'}</p>
              {device.serialNumber && <p><span className="text-slate-400">Serial:</span> {device.serialNumber}</p>}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-semibold block">SIM Card Protection</span>
            <div className="text-slate-800 space-y-0.5 text-[11px]">
              <p className="font-mono truncate"><span className="text-slate-400">ICCID:</span> {device.simIccid || 'Awaiting SIM info'}</p>
              <p><span className="text-slate-400">Operator:</span> {device.simOperator || 'Not reported'}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">🛡️ Auto-locks on SIM swap</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-semibold block">MDM Client Integrity</span>
            <div className="text-slate-800 space-y-0.5 text-[11px]">
              <p><span className="text-slate-400">App:</span> {device.appVersion || 'v1.0.0-production'}</p>
              <p><span className="text-slate-400">OS:</span> {device.androidVersion || 'Android 13+'}</p>
              <p className="text-[10px] text-blue-600 font-semibold">⏱️ Deadman timer: {device.offlineTimerHours} hrs</p>
            </div>
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
            {device.emiSchedules?.map((emi: EmiItem) => {
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
                  {device.emiSchedules?.map((emi: EmiItem) => {
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
              device.activityLogs?.map((log: ActivityLogItem) => (
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
