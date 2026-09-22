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
  X
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
        showToast('Customer device registered successfully!')
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
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium border animate-in slide-in-from-top duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
              : 'bg-rose-950 text-rose-200 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header with Search & Enroll Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Devices & EMI Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dukan par cash aane par 1-click me unlock karein aur phones ko remotely control karein
          </p>
        </div>

        <button
          onClick={() => setIsEnrollModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium text-sm transition-all shadow-lg shadow-blue-500/20 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Customer Phone</span>
        </button>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1C2541] p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Customer Name, Phone, Model, or IMEI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0B132B] border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[44px]"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'ACTIVE', 'LOCKED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab === 'ALL' ? 'All Devices' : tab === 'ACTIVE' ? '🟢 Active Only' : '🔒 Locked Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Responsive Table Card */}
      <div className="bg-[#1C2541] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm">Connecting to Supabase and loading customer devices...</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Smartphone className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-300">No devices found</p>
            <p className="text-xs text-slate-500 mt-1">Try another search keyword or enroll a new device</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Customer Details</th>
                  <th className="px-4 py-3.5">Device & Telemetry</th>
                  <th className="px-4 py-3.5">EMI Ledger</th>
                  <th className="px-4 py-3.5">Lock Status</th>
                  <th className="px-4 py-3.5 text-center">Counter Actions (Cash / Lock)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDevices.map((d) => {
                  const pendingInstallment = d.emiSchedules.find((e) => e.status !== 'PAID')
                  const isOperating = actionLoading === d.id

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Customer Info */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/devices/${d.id}`}
                          className="font-bold text-white hover:text-cyan-400 flex items-center space-x-1.5"
                        >
                          <span>{d.customerName}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        </Link>
                        <div className="flex items-center space-x-2 mt-1">
                          <a
                            href={`tel:${d.customerPhone}`}
                            className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 font-mono"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{d.customerPhone}</span>
                          </a>
                        </div>
                      </td>

                      {/* Device Model & Battery */}
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-200 block">{d.deviceModel}</span>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          IMEI: {d.imei1}
                        </span>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Battery className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{d.batteryLevel ?? 80}%</span>
                          </span>
                          <span>•</span>
                          <span className={d.isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                            {d.isOnline ? '🟢 Live' : '⚪ Offline'}
                          </span>
                        </div>
                      </td>

                      {/* EMI Progress & Dues */}
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-1 text-xs">
                          <span className="font-bold text-emerald-400">{d.paidEmis}</span>
                          <span className="text-slate-400">of</span>
                          <span className="font-semibold text-slate-300">{d.totalEmis} EMIs Paid</span>
                        </div>
                        {pendingInstallment ? (
                          <div className="mt-1">
                            <span className="text-amber-400 font-bold text-sm">
                              ₹{pendingInstallment.amount}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Due: #{pendingInstallment.installmentNo} (
                              {new Date(pendingInstallment.dueDate).toLocaleDateString()})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium block mt-1">
                            Loan Fully Paid ✅
                          </span>
                        )}
                      </td>

                      {/* Current Status Badge */}
                      <td className="px-4 py-4">
                        {d.isLocked ? (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              🔒 Phone Locked
                            </span>
                            {d.isSirenActive && (
                              <span className="block mt-1 text-[11px] font-bold text-amber-400 animate-pulse">
                                🔊 Siren Blaring
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            🟢 Phone Active
                          </span>
                        )}
                        {d.gracePeriodDays > 0 && (
                          <span className="text-[10px] text-cyan-400 block mt-1 font-semibold">
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
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all min-h-[40px] cursor-pointer"
                            title="Customer paid Cash at shop"
                          >
                            <Banknote className="w-4 h-4 text-emerald-200" />
                            <span>💵 Mark Paid</span>
                          </button>

                          {/* 2. Lock / Unlock Remote Button */}
                          {d.isLocked ? (
                            <button
                              disabled={isOperating}
                              onClick={() => handleUnlock(d.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600/20 text-cyan-300 hover:bg-blue-600/40 border border-blue-500/30 text-xs font-semibold min-h-[40px] transition-all"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              disabled={isOperating}
                              onClick={() => handleLock(d.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/40 border border-rose-500/30 text-xs font-semibold min-h-[40px] transition-all"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock</span>
                            </button>
                          )}

                          {/* 3. Siren Remote Button */}
                          <button
                            disabled={isOperating}
                            onClick={() => handleSiren(d.id, d.isSirenActive)}
                            className={`p-2 rounded-lg border text-xs min-h-[40px] min-w-[40px] flex items-center justify-center transition-all ${
                              d.isSirenActive
                                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                            }`}
                            title={d.isSirenActive ? 'Stop Loud Siren Alarm' : 'Trigger Loud Siren on phone'}
                          >
                            {d.isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>

                          {/* 4. Grace Period Button */}
                          <button
                            disabled={isOperating}
                            onClick={() => handleGracePeriod(d.id)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs min-h-[40px] min-w-[40px] flex items-center justify-center transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <Banknote className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Accept Cash at Counter</h3>
              </div>
              <button
                onClick={() => setCashModalDevice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <p className="text-slate-400 text-xs">Customer Name:</p>
                <p className="text-base font-bold text-white">{cashModalDevice.customerName}</p>
                <p className="text-slate-400 text-xs">Phone: {cashModalDevice.customerPhone}</p>
                <p className="text-slate-400 text-xs font-mono">Model: {cashModalDevice.deviceModel}</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-xs text-emerald-300 font-medium">Installment Amount to Collect:</p>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1">
                  ₹{cashModalDevice.emiSchedules.find((e) => e.status !== 'PAID')?.amount ?? cashModalDevice.emiAmount}
                </p>
                <p className="text-xs text-emerald-300/80 mt-1">
                  ✨ Clicking confirm will record the cash receipt and <b>instantly unlock</b> the phone!
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Receipt Remarks (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash at shop counter"
                  value={cashRemarks}
                  onChange={(e) => setCashRemarks(e.target.value)}
                  className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setCashModalDevice(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCashPaid}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 min-h-[44px]"
              >
                Confirm Cash & Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Register New Customer Phone */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Register New Phone</h3>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollDevice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Ramesh Singh"
                    value={newDeviceForm.customerName}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, customerName: e.target.value })}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer Mobile *</label>
                  <input
                    required
                    type="tel"
                    placeholder="e.g. 9812345678"
                    value={newDeviceForm.customerPhone}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, customerPhone: e.target.value })}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Phone IMEI 1 *</label>
                  <input
                    required
                    type="text"
                    placeholder="15-digit IMEI number"
                    value={newDeviceForm.imei1}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, imei1: e.target.value })}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Device Model *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Redmi 13C / Vivo Y28"
                    value={newDeviceForm.deviceModel}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceModel: e.target.value })}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Total Loan (₹)</label>
                  <input
                    type="number"
                    value={newDeviceForm.totalLoanAmount}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, totalLoanAmount: e.target.value })}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    value={newDeviceForm.emiAmount}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, emiAmount: e.target.value })}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    value={newDeviceForm.totalEmis}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, totalEmis: e.target.value })}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 min-h-[44px]"
                >
                  Save & Generate Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
