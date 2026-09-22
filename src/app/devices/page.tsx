'use client'

import { useState, useEffect } from 'react'
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
  ShieldAlert,
  Loader2,
  X,
  Database
} from 'lucide-react'

interface DeviceItem {
  id: string
  imei1: string
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  
  // Modals & Action States
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Cash Paid Modal
  const [cashModalDevice, setCashModalDevice] = useState<DeviceItem | null>(null)
  const [cashRemarks, setCashRemarks] = useState('')

  // New Device Modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [newDeviceForm, setNewDeviceForm] = useState({
    customerName: '',
    customerPhone: '',
    imei1: '',
    deviceModel: '',
    totalLoanAmount: '15000',
    emiAmount: '2500',
    totalEmis: '6',
  })

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard/devices')
      const data = await res.json()
      if (data.success) {
        setDevices(data.devices)
      }
    } catch (e) {
      console.error('Failed to fetch devices', e)
    } finally {
      setLoading(false)
    }
  }

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
        showToast('Phone locked successfully! Customer will see payment screen.')
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to lock phone', 'error')
      }
    } catch (e) {
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
        showToast('Phone unlocked successfully!')
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to unlock phone', 'error')
      }
    } catch (e) {
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
        showToast(!currentlyActive ? '🚨 Siren Alarm activated on phone!' : 'Siren stopped.')
        fetchDevices()
      }
    } catch (e) {
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
    } catch (e) {
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
      }
    } catch (e) {
      showToast('Error extending grace period', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Action: Enroll New Device
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
        showToast('Customer device registered in Supabase!')
        setIsEnrollModalOpen(false)
        setNewDeviceForm({
          customerName: '',
          customerPhone: '',
          imei1: '',
          deviceModel: '',
          totalLoanAmount: '15000',
          emiAmount: '2500',
          totalEmis: '6',
        })
        fetchDevices()
      } else {
        showToast(data.message || 'Failed to register', 'error')
      }
    } catch (err) {
      showToast('Error registering device', 'error')
    }
  }

  // Filtered List
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.customerPhone.includes(search) ||
      d.imei1.includes(search) ||
      d.deviceModel.toLowerCase().includes(search.toLowerCase())

    if (statusFilter === 'LOCKED') return matchesSearch && d.isLocked
    if (statusFilter === 'ACTIVE') return matchesSearch && !d.isLocked
    return matchesSearch
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
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header with Search & Enroll Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Devices & EMI Management</h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
              Live DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dukan par cash aane par 1-click me unlock karein aur phones ko remotely control karein
          </p>
        </div>

        <button
          onClick={() => setIsEnrollModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Customer Phone</span>
        </button>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Customer Name, Phone, Model, or IMEI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white min-h-[44px]"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'ACTIVE', 'LOCKED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] cursor-pointer ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab === 'ALL' ? 'All Devices' : tab === 'ACTIVE' ? '🟢 Active Only' : '🔒 Locked Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Responsive Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium">Connecting to Supabase PostgreSQL and fetching devices...</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-base font-bold text-slate-800">No devices found</p>
            <p className="text-xs text-slate-500 mt-1">Try another search keyword or enroll a new device</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Customer Details</th>
                  <th className="px-4 py-3.5">Device & Telemetry</th>
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

                      {/* Device Model & Battery */}
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800 block">{d.deviceModel}</span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          IMEI: {d.imei1}
                        </span>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Battery className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{d.batteryLevel ?? 80}%</span>
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
                            🟢 Phone Active
                          </span>
                        )}
                        {d.gracePeriodDays > 0 && (
                          <span className="text-[10px] text-blue-700 block mt-1 font-bold">
                            +{d.gracePeriodDays} Days Grace
                          </span>
                        )}
                      </td>

                      {/* Quick Action Control Buttons */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {/* 1. Cash Payment & Auto-Unlock Button (Highlighted) */}
                          <button
                            disabled={isOperating}
                            onClick={() => setCashModalDevice(d)}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all min-h-[40px] cursor-pointer"
                            title="Customer paid Cash at shop"
                          >
                            <Banknote className="w-4 h-4 text-emerald-100" />
                            <span>💵 Mark Paid</span>
                          </button>

                          {/* 2. Lock / Unlock Remote Button */}
                          {d.isLocked ? (
                            <button
                              disabled={isOperating}
                              onClick={() => handleUnlock(d.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold min-h-[40px] transition-all cursor-pointer"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              disabled={isOperating}
                              onClick={() => handleLock(d.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold min-h-[40px] transition-all cursor-pointer"
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
        )}
      </div>

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
                  placeholder="e.g. Paid in cash at shop counter"
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

      {/* MODAL 2: Register New Customer Phone */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Register New Phone</h3>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollDevice} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Phone IMEI 1 *</label>
                  <input
                    required
                    type="text"
                    placeholder="15-digit IMEI number"
                    value={newDeviceForm.imei1}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, imei1: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Device Model *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Redmi 13C / Vivo Y28"
                    value={newDeviceForm.deviceModel}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceModel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
              </div>

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
    </div>
  )
}
