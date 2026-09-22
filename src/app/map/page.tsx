'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Smartphone, Battery, Phone, ExternalLink, Loader2 } from 'lucide-react'

// Dynamically import map to avoid window undefined during SSR
const DeviceMap = dynamic(() => import('@/components/DeviceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] rounded-2xl bg-[#1C2541] flex flex-col items-center justify-center text-slate-400 space-y-3">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      <p className="text-sm">Loading Live OpenStreetMap...</p>
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Live Device Fleet Map
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Real-time location coordinates of customer phones across Delhi NCR & India
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Device List */}
        <div className="bg-[#1C2541] rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3 max-h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Customer Devices ({devices.length})
            </span>
            <span className="text-xs text-cyan-400 font-medium">Click to Locate</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
              <span>Loading devices...</span>
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
                      ? 'bg-blue-600/20 border-blue-500/40 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{d.customerName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        d.isLocked
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {d.isLocked ? 'Locked' : 'Active'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1">{d.deviceModel}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1 font-mono">
                      <Battery className="w-3 h-3 text-emerald-400" />
                      <span>{d.batteryLevel ?? 80}%</span>
                    </span>
                    <span className="font-mono text-cyan-400">
                      {hasLocation ? '📍 GPS Locked' : 'No GPS Ping'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right 2 Cols: Interactive Map */}
        <div className="lg:col-span-2 bg-[#1C2541] rounded-2xl border border-slate-800 shadow-xl overflow-hidden min-h-[500px]">
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
