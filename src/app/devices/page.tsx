'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Smartphone, 
  Search, 
  Lock, 
  Unlock, 
  Volume2, 
  VolumeX, 
  Banknote, 
  Clock, 
  Plus, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Phone,
  Battery,
  Loader2,
  X,
  QrCode,
  Download,
  Store,
  ChevronRight
} from 'lucide-react'

interface ShopItem {
  id: string
  shopName: string
  phone: string
  address: string
  ownerName?: string
  _count?: { devices: number }
}

interface DeviceItem {
  id: string
  imei1: string
  imei2?: string | null
  customerName: string
  customerPhone: string
  deviceModel: string
  isLocked: boolean
  isSirenActive: boolean
  batteryLevel: number | null
  isOnline: boolean
  lastPingAt: string
  totalLoanAmount: number
  emiAmount: number
  totalEmis: number
  paidEmis: number
  gracePeriodDays: number
  shopId?: string | null
  shop?: {
    id: string
    shopName: string
    phone: string
    address: string
    ownerName?: string
  } | null
  emiSchedules: {
    id: string
    installmentNo: number
    dueDate: string
    amount: number
    status: string
  }[]
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [shops, setShops] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [storeFilter, setStoreFilter] = useState('ALL')
  
  // Modals & Action States
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Cash Paid Modal
  const [cashModalDevice, setCashModalDevice] = useState<DeviceItem | null>(null)
  const [cashRemarks, setCashRemarks] = useState('')

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false)

  // New Device Modal with Dual IMEI & Store Selection
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [newDeviceForm, setNewDeviceForm] = useState({
    customerName: '',
    customerPhone: '',
    imei1: '',
    imei2: '',
    deviceModel: '',
    brand: 'Samsung',
    totalLoanAmount: '15000',
    emiAmount: '2500',
    totalEmis: '6',
    shopId: '',
  })

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/devices')
      const data = await res.json()
      if (data.success) {
        setDevices(data.devices)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchShops = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/shops')
      const data = await res.json()
      if (data.success && data.shops) {
        setShops(data.shops)
        if (data.shops.length > 0) {
          setNewDeviceForm(prev => ({ ...prev, shopId: prev.shopId || data.shops[0].id }))
        }
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let ignore = false
    fetch('/api/dashboard/devices')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) setDevices(data.devices)
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    fetch('/api/dashboard/shops')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && data.shops) {
          setShops(data.shops)
          if (data.shops.length > 0) {
            setNewDeviceForm((prev) => ({ ...prev, shopId: prev.shopId || data.shops[0].id }))
          }
        }
      })
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [])

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Action: 1-Click Lock
  const handleLock = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/lock`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        if (data.pushSent) showToast('Phone locked successfully! Customer will see payment screen.')
        else showToast(data.message, 'error')
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to lock phone', 'error')
      }
    } catch {
      showToast('Network error while locking', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Action: 1-Click Unlock
  const handleUnlock = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/unlock`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        if (data.pushSent) showToast('Phone unlocked successfully!')
        else showToast(data.message, 'error')
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to unlock phone', 'error')
      }
    } catch {
      showToast('Network error while unlocking', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Action: Siren Toggle
  const handleSiren = async (id: string, currentlyActive: boolean) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/siren`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !currentlyActive }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.pushSent) showToast(!currentlyActive ? '🚨 Siren Alarm activated on phone!' : 'Siren stopped.')
        else showToast(data.message, 'error')
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to toggle siren', 'error')
      }
    } catch {
      showToast('Error toggling siren', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Action: Cash Paid (Auto Unlock)
  const handleConfirmCashPaid = async () => {
    if (!cashModalDevice) return
    setActionLoading(cashModalDevice.id)
    try {
      const res = await fetch(`/api/dashboard/devices/${cashModalDevice.id}/mark-cash-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: cashRemarks }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message, 'success')
        setCashModalDevice(null)
        setCashRemarks('')
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to process payment', 'error')
      }
    } catch {
      showToast('Network error processing cash payment', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Action: Extend Grace Period (+2 Days)
  const handleGracePeriod = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/dashboard/devices/${id}/grace-period`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 2 }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Extended +2 days grace period. Phone is unlocked.')
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to extend grace period', 'error')
      }
    } catch {
      showToast('Error extending grace period', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Action: Enroll New Device with Dual IMEI & Store
  const handleEnrollDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/dashboard/devices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeviceForm),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Customer device with Dual IMEI registered in Supabase!')
        setIsEnrollModalOpen(false)
        setNewDeviceForm({
          customerName: '',
          customerPhone: '',
          imei1: '',
          imei2: '',
          deviceModel: '',
          brand: 'Samsung',
          totalLoanAmount: '15000',
          emiAmount: '2500',
          totalEmis: '6',
          shopId: shops[0]?.id || '',
        })
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to register', 'error')
      }
    } catch {
      showToast('Error registering device', 'error')
    }
  }

  // Filtered List
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.customerPhone.includes(search) ||
      d.imei1.includes(search) ||
      (d.imei2 && d.imei2.includes(search)) ||
      d.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
      (d.shop?.shopName && d.shop.shopName.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'LOCKED' && d.isLocked) ||
      (statusFilter === 'ACTIVE' && !d.isLocked)

    const matchesStore =
      storeFilter === 'ALL' ||
      d.shopId === storeFilter ||
      d.shop?.id === storeFilter

    return matchesSearch && matchesStatus && matchesStore
  })

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-sm font-semibold border animate-in slide-in-from-top duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header with Search & Enroll Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Devices & EMI Management</h1>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
              Devi Mobile
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
              Live DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dukan par cash aane par 1-click me unlock karein aur sabhi store branches ke phones remotely control karein
          </p>
        </div>

        {/* Top Header Buttons: QR Setup + Register Phone */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowQrModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-all border border-slate-300 min-h-[44px] cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-slate-700" />
            <span>📲 Setup QR</span>
          </button>

          <button
            onClick={() => {
              fetchShops()
              setIsEnrollModalOpen(true)
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Phone</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, phone, IMEI 1 / 2, model, or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white min-h-[44px]"
          />
        </div>

        {/* Filter Pills Row: Stores + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Store Branch Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Store className="w-3.5 h-3.5" />
              <span>Store:</span>
            </span>
            <button
              onClick={() => setStoreFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[38px] cursor-pointer ${
                storeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Stores
            </button>
            {shops.map((s) => (
              <button
                key={s.id}
                onClick={() => setStoreFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[38px] cursor-pointer ${
                  storeFilter === s.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {s.shopName.includes('(') ? s.shopName.replace('Devi Mobile & Accessories ', '') : s.shopName}
              </button>
            ))}
          </div>

          {/* Device Status Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'ACTIVE', 'LOCKED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[38px] cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL' ? 'All Status' : tab === 'ACTIVE' ? '🟢 Active' : '🔒 Locked'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium">Connecting to Supabase PostgreSQL and fetching devices...</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs py-16 text-center text-slate-500">
          <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-bold text-slate-800">No devices found</p>
          <p className="text-xs text-slate-500 mt-1">Try another search keyword or enroll a new device</p>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* 1. MOBILE RESPONSIVE CARDS VIEW (md:hidden)               */}
          {/* Eliminates mobile overflow & table horizontal glitches!   */}
          {/* ======================================================== */}
          <div className="md:hidden space-y-3">
            {filteredDevices.map((d) => {
              const pendingInstallment = d.emiSchedules.find((e) => e.status !== 'PAID')
              const isOperating = actionLoading === d.id

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3"
                >
                  {/* Top Bar: Name & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/devices/${d.id}`}
                      className="font-extrabold text-slate-900 text-base hover:text-blue-600 flex items-center space-x-1"
                    >
                      <span>{d.customerName}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    {d.isLocked ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        🔒 Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        🟢 Active
                      </span>
                    )}
                  </div>

                  {/* Customer Phone + Battery Row */}
                  <div className="flex items-center justify-between text-xs">
                    <a
                      href={`tel:${d.customerPhone}`}
                      className="inline-flex items-center space-x-1.5 text-blue-600 font-bold font-mono py-1 px-2 rounded-lg bg-blue-50/70 hover:bg-blue-100 min-h-[36px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>{d.customerPhone}</span>
                    </a>

                    <div className="flex items-center space-x-2 text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{d.batteryLevel != null ? `${d.batteryLevel}%` : '--'}</span>
                      </span>
                      <span>•</span>
                      <span className={d.isOnline ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {d.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Store Branch & Device Model */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{d.deviceModel}</span>
                      {d.shop && (
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                          <Store className="w-3 h-3 text-blue-600" />
                          <span>{d.shop.shopName.includes('(') ? d.shop.shopName.split('(')[1].replace(')', '') : d.shop.shopName}</span>
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                      <span>IMEI 1: {d.imei1}</span>
                      {d.imei2 && <span>IMEI 2: {d.imei2}</span>}
                    </div>
                  </div>

                  {/* EMI Ledger Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block">EMI Recovery:</span>
                      <span className="font-bold text-slate-800">
                        {d.paidEmis} of {d.totalEmis} Paid
                      </span>
                    </div>

                    <div className="text-right">
                      {pendingInstallment ? (
                        <>
                          <span className="text-slate-500 block">Due Amount:</span>
                          <span className="text-amber-700 font-extrabold text-sm">
                            ₹{pendingInstallment.amount}
                          </span>
                        </>
                      ) : (
                        <span className="text-emerald-700 font-bold">Loan Cleared ✅</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Bar: Min 44px Touch Targets */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Mark Cash Paid (Opens Modal) */}
                    <button
                      disabled={isOperating}
                      onClick={() => setCashModalDevice(d)}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs min-h-[44px] cursor-pointer"
                    >
                      <Banknote className="w-4 h-4" />
                      <span>💵 Mark Paid</span>
                    </button>

                    {/* Remote Lock / Unlock */}
                    {d.isLocked ? (
                      <button
                        disabled={isOperating}
                        onClick={() => handleUnlock(d.id)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs min-h-[44px] cursor-pointer"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>🔓 Unlock</span>
                      </button>
                    ) : (
                      <button
                        disabled={isOperating}
                        onClick={() => handleLock(d.id)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs min-h-[44px] cursor-pointer"
                      >
                        <Lock className="w-4 h-4" />
                        <span>🔒 Lock</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      disabled={isOperating}
                      onClick={() => handleSiren(d.id, d.isSirenActive)}
                      className={`flex-1 flex items-center justify-center space-x-1 px-2.5 py-2 rounded-lg border font-semibold min-h-[40px] cursor-pointer ${
                        d.isSirenActive
                          ? 'bg-amber-500 text-slate-900 border-amber-600 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {d.isSirenActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{d.isSirenActive ? 'Stop Siren' : 'Siren'}</span>
                    </button>

                    <button
                      disabled={isOperating}
                      onClick={() => handleGracePeriod(d.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-300 text-blue-700 font-semibold min-h-[40px] cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>+2d Grace</span>
                    </button>

                    <Link
                      href={`/devices/${d.id}`}
                      className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold min-h-[40px]"
                    >
                      <span>Ledger</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ======================================================== */}
          {/* 2. DESKTOP TABLE VIEW (hidden md:block)                   */}
          {/* ======================================================== */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Customer Details</th>
                    <th className="px-4 py-3.5">Assigned Store</th>
                    <th className="px-4 py-3.5">Device & Dual IMEI</th>
                    <th className="px-4 py-3.5">EMI Ledger</th>
                    <th className="px-4 py-3.5">Lock Status</th>
                    <th className="px-4 py-3.5 text-center">Counter Actions (Cash / Lock)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDevices.map((d) => {
                    const pendingInstallment = d.emiSchedules.find((e) => e.status !== 'PAID')
                    const isOperating = actionLoading === d.id

                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Customer Info */}
                        <td className="px-4 py-4">
                          <Link
                            href={`/devices/${d.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 flex items-center space-x-1.5"
                          >
                            <span>{d.customerName}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                          <div className="flex items-center space-x-2 mt-1">
                            <a
                              href={`tel:${d.customerPhone}`}
                              className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-mono font-medium"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{d.customerPhone}</span>
                            </a>
                          </div>
                        </td>

                        {/* Store Branch */}
                        <td className="px-4 py-4">
                          {d.shop ? (
                            <div>
                              <span className="font-bold text-xs text-slate-900 block flex items-center gap-1">
                                <Store className="w-3.5 h-3.5 text-blue-600" />
                                <span>{d.shop.shopName}</span>
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                                📞 {d.shop.phone}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Devi Mobile (Main)</span>
                          )}
                        </td>

                        {/* Device Model & Dual IMEI */}
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-800 block">{d.deviceModel}</span>
                          <div className="text-[11px] text-slate-500 font-mono block space-y-0.5 mt-0.5">
                            <div>IMEI 1: {d.imei1}</div>
                            {d.imei2 && <div>IMEI 2: {d.imei2}</div>}
                          </div>
                          <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium">
                              <Battery className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{d.batteryLevel != null ? `${d.batteryLevel}%` : '--'}</span>
                            </span>
                            <span>•</span>
                            <span className={d.isOnline ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                              {d.isOnline ? '🟢 Live' : '⚪ Offline'}
                            </span>
                          </div>
                        </td>

                        {/* EMI Progress & Dues */}
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-1 text-xs">
                            <span className="font-bold text-emerald-700">{d.paidEmis}</span>
                            <span className="text-slate-400">of</span>
                            <span className="font-semibold text-slate-600">{d.totalEmis} EMIs Paid</span>
                          </div>
                          {pendingInstallment ? (
                            <div className="mt-1">
                              <span className="text-amber-700 font-bold text-sm">
                                ₹{pendingInstallment.amount}
                              </span>
                              <span className="text-[11px] text-slate-500 block font-medium">
                                Due: #{pendingInstallment.installmentNo} (
                                {new Date(pendingInstallment.dueDate).toLocaleDateString()})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-700 font-bold block mt-1">
                              Loan Fully Paid ✅
                            </span>
                          )}
                        </td>

                        {/* Current Status Badge */}
                        <td className="px-4 py-4">
                          {d.isLocked ? (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                🔒 Phone Locked
                              </span>
                              {d.isSirenActive && (
                                <span className="block mt-1 text-[11px] font-bold text-amber-700 animate-pulse">
                                  🔊 Siren Blaring
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 Active Normal
                            </span>
                          )}
                        </td>

                        {/* Counter Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            {/* 1. Mark Cash Paid Button */}
                            <button
                              disabled={isOperating}
                              onClick={() => setCashModalDevice(d)}
                              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs min-h-[40px] transition-all cursor-pointer"
                              title="Customer paid cash at shop counter"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>💵 Cash Paid</span>
                            </button>

                            {/* 2. Remote Lock / Unlock */}
                            {d.isLocked ? (
                              <button
                                disabled={isOperating}
                                onClick={() => handleUnlock(d.id)}
                                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs min-h-[40px] transition-all cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock</span>
                              </button>
                            ) : (
                              <button
                                disabled={isOperating}
                                onClick={() => handleLock(d.id)}
                                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs min-h-[40px] transition-all cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Lock</span>
                              </button>
                            )}

                            {/* 3. Siren Remote Button */}
                            <button
                              disabled={isOperating}
                              onClick={() => handleSiren(d.id, d.isSirenActive)}
                              className={`p-2 rounded-lg border text-xs min-h-[40px] min-w-[40px] flex items-center justify-center transition-all cursor-pointer ${
                                d.isSirenActive
                                  ? 'bg-amber-500 text-slate-900 border-amber-600 font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                              title={d.isSirenActive ? 'Stop Loud Siren Alarm' : 'Trigger Loud Siren on phone'}
                            >
                              {d.isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>

                            {/* 4. Grace Period Button */}
                            <button
                              disabled={isOperating}
                              onClick={() => handleGracePeriod(d.id)}
                              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-300 text-blue-700 text-xs min-h-[40px] min-w-[40px] flex items-center justify-center transition-all cursor-pointer"
                              title="+2 Days Grace Period"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Mark Cash Paid & Auto Unlock */}
      {cashModalDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Banknote className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Accept Cash at Counter</h3>
              </div>
              <button
                onClick={() => setCashModalDevice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-slate-500 text-xs font-medium">Customer Name:</p>
                <p className="text-base font-bold text-slate-900">{cashModalDevice.customerName}</p>
                <p className="text-slate-500 text-xs">Phone: {cashModalDevice.customerPhone}</p>
                <p className="text-slate-500 text-xs font-mono">Model: {cashModalDevice.deviceModel}</p>
                {cashModalDevice.shop && (
                  <p className="text-blue-700 text-xs font-semibold">Store: {cashModalDevice.shop.shopName}</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-emerald-800 font-semibold">Installment Amount to Collect:</p>
                <p className="text-3xl font-extrabold text-emerald-700 mt-1">
                  ₹{cashModalDevice.emiSchedules.find((e) => e.status !== 'PAID')?.amount ?? cashModalDevice.emiAmount}
                </p>
                <p className="text-xs text-emerald-800 mt-1 font-medium">
                  ✨ Clicking confirm records the cash receipt and <b>instantly auto-unlocks</b> the phone!
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">Receipt Remarks (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash at Devi Mobile counter"
                  value={cashRemarks}
                  onChange={(e) => setCashRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setCashModalDevice(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCashPaid}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm min-h-[44px] cursor-pointer"
              >
                Confirm Cash & Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Register New Customer Phone (With Dual SIM: IMEI 1 & IMEI 2 + Store Selection) */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Register New Customer Phone</h3>
                  <p className="text-xs text-slate-500">Devi Mobile & Accessories Multi-Store</p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollDevice} className="space-y-4">
              {/* Store Branch Selection */}
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Assign to Store Branch *
                </label>
                <select
                  required
                  value={newDeviceForm.shopId}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, shopId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shopName} ({s.phone}) - {s.address}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Customer Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Ramesh Singh"
                    value={newDeviceForm.customerName}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Customer Mobile *</label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. 9812345678"
                    value={newDeviceForm.customerPhone}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* Dual IMEI Fields: IMEI 1 and IMEI 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">
                    Phone IMEI 1 * <span className="text-[10px] text-blue-600">(Primary SIM)</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="15-digit IMEI 1"
                    maxLength={17}
                    value={newDeviceForm.imei1}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, imei1: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">
                    Phone IMEI 2 <span className="text-[10px] text-slate-500">(Secondary SIM / Dual)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="15-digit IMEI 2 (Optional)"
                    maxLength={17}
                    value={newDeviceForm.imei2}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, imei2: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-blue-600 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Model & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Brand</label>
                  <select
                    value={newDeviceForm.brand}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, brand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  >
                    <option value="Samsung">Samsung</option>
                    <option value="Xiaomi">Xiaomi / Redmi</option>
                    <option value="Vivo">Vivo</option>
                    <option value="Realme">Realme</option>
                    <option value="Oppo">Oppo</option>
                    <option value="OnePlus">OnePlus</option>
                    <option value="Motorola">Motorola</option>
                    <option value="Android">Other Android</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Device Model *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Galaxy A15 / Redmi 13C"
                    value={newDeviceForm.deviceModel}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceModel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* EMI Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Total Loan (₹)</label>
                  <input
                    type="number"
                    value={newDeviceForm.totalLoanAmount}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, totalLoanAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    value={newDeviceForm.emiAmount}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, emiAmount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    value={newDeviceForm.totalEmis}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, totalEmis: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm min-h-[44px] cursor-pointer"
                >
                  Save to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Setup QR Code Popup (Instant Access) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <QrCode className="w-5 h-5 text-blue-600" />
                <span>Device Provisioning QR</span>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-md inline-block mx-auto">
              <Image
                src="/sarvam_enrollment_qr.png"
                alt="Sarvam Provisioning QR Code"
                width={224}
                height={224}
                className="w-56 h-56 object-contain mx-auto"
              />
            </div>

            <div className="text-xs text-slate-600 text-left space-y-1.5 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="font-bold text-blue-900">📲 Setup Steps:</p>
              <p>1. Naye phone ki <b>&quot;Welcome&quot; screen par 6 baar tap karein</b>.</p>
              <p>2. Scanner aate hi is QR ko scan karein.</p>
              <p>3. App auto-install hokar <b>Device Owner</b> ban jayegi!</p>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href="/sarvam_enrollment_qr.png"
                download="sarvam_enrollment_qr.png"
                className="flex-1 inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Save QR Image</span>
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
