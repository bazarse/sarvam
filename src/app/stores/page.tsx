'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Store, 
  Phone, 
  MapPin, 
  User, 
  Plus, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  X,
  ExternalLink
} from 'lucide-react'

interface ShopItem {
  id: string
  shopName: string
  ownerName: string
  phone: string
  email: string | null
  address: string | null
  _count: {
    devices: number
  }
}

export default function StoresPage() {
  const [shops, setShops] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    email: '',
  })

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  const refreshShops = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/shops')
      const data = await res.json()
      if (data.success) {
        setShops(data.shops)
      }
    } catch {
      showToast('Failed to load stores', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    let ignore = false
    fetch('/api/dashboard/shops')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setShops(data.shops)
        }
      })
      .catch(() => {
        if (!ignore) showToast('Failed to load stores', 'error')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [showToast])

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.shopName || !form.phone) {
      showToast('Store name and phone are required', 'error')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/dashboard/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Store created successfully!')
        setShowAddModal(false)
        setForm({ shopName: '', ownerName: '', phone: '', address: '', email: '' })
        refreshShops()
      } else {
        showToast(data.message || 'Failed to create store', 'error')
      }
    } catch {
      showToast('Network error while saving', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Multi-Store Manager
            </span>
            <span className="text-xs text-slate-500 font-medium">Live Cloud</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            Retail Stores & Branches
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Phones assigned to each store will show that store’s name, address, and 1-tap call button when locked.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-sm min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Store Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium">Loading store branches...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {shops.map((shop, idx) => (
            <div
              key={shop.id}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-4"
            >
              {/* Store Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Branch #{idx + 1}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">{shop.shopName}</h2>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700 shrink-0">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{shop._count.devices} Phones</span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">Owner:</span>
                  <span>{shop.ownerName}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800">Contact / Dialer Number:</span>
                  <a href={`tel:${shop.phone}`} className="font-mono font-bold text-blue-600 hover:underline">
                    {shop.phone}
                  </a>
                </div>

                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Address: </span>
                    <span>{shop.address || 'Address not configured'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <Link
                  href={`/devices?shop=${shop.id}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 min-h-[44px]"
                >
                  <span>View All Phones in this Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <a
                  href={`tel:${shop.phone}`}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors min-h-[44px]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Store</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Add New Store Branch</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Store / Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Main Branch / South Store"
                  value={form.shopName}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Dialer Phone Number (for Customer Call) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g., 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500 focus:outline-none min-h-[44px]"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">When customer phone is locked, this number will be dialed.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Branch In-Charge / Owner Name</label>
                <input
                  type="text"
                  placeholder="e.g., Store Manager"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Store Address / Landmark</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Shop 5, Near Market, Main Road"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center space-x-2 min-h-[44px] cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Store'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
