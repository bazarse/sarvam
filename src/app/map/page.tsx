'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Smartphone, Battery, Phone, ExternalLink, Loader2, Database } from 'lucide-react'

// Dynamically import map to avoid window undefined during SSR
const DeviceMap = dynamic(() => import('@/components/DeviceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-500 space-y-3">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-sm font-medium">Loading Live OpenStreetMap...</p>
    </div>
  ),
})

export default function LiveMapPage() {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/devices')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDevices(data.devices)
          const firstWithLocation = data.devices.find((d: any) => d.lastKnownLat && d.lastKnownLng)
          if (firstWithLocation) setSelectedDevice(firstWithLocation)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Live Device Fleet Map
          </h1>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
            Live GPS
          </span>
        </div>
        <p className="text-sm text-slate-600 mt-0.5">
          Real-time GPS coordinates of customer phones across Delhi NCR & India stored in Supabase
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Device List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 max-h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer Devices ({devices.length})
            </span>
            <span className="text-xs text-blue-600 font-bold">Click to Locate</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <span className="text-xs">Loading device fleet...</span>
            </div>
          ) : (
            devices.map((d) => {
              const isSelected = selectedDevice?.id === d.id
              const hasLocation = d.lastKnownLat && d.lastKnownLng

              return (
                <div
                  key={d.id}
                  onClick={() => hasLocation && setSelectedDevice(d)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{d.customerName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        d.isLocked
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {d.isLocked ? 'Locked' : 'Active'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1">{d.deviceModel}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span className="flex items-center gap-1 font-mono">
                      <Battery className="w-3 h-3 text-emerald-600" />
                      <span>{d.batteryLevel ?? 80}%</span>
                    </span>
                    <span className={`font-medium ${hasLocation ? 'text-blue-700' : 'text-slate-400'}`}>
                      {hasLocation ? '📍 GPS Synced' : 'No GPS Ping'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right 2 Cols: Interactive Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden min-h-[500px]">
          <DeviceMap
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={(d) => setSelectedDevice(d)}
          />
        </div>
      </div>
    </div>
  )
}
