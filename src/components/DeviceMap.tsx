'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface DeviceMapProps {
  devices: any[]
  selectedDevice: any | null
  onSelectDevice: (d: any) => void
}

export default function DeviceMap({ devices, selectedDevice, onSelectDevice }: DeviceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current) return

    // Fix default marker icons in Leaflet for Next.js bundler
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([28.6139, 77.2090], 11)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap.current)
    }

    const map = leafletMap.current

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Add markers for devices with coordinates
    const validDevices = devices.filter((d) => d.lastKnownLat && d.lastKnownLng)

    validDevices.forEach((d) => {
      const markerColor = d.isLocked ? '#F43F5E' : '#10B981'
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      const marker = L.marker([d.lastKnownLat, d.lastKnownLng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b;">
            <b style="font-size: 14px;">${d.customerName}</b><br/>
            <span>${d.deviceModel}</span><br/>
            <span>Status: <b>${d.isLocked ? '🔒 Locked' : '🟢 Active'}</b></span><br/>
            <span>Battery: <b>${d.batteryLevel ?? 80}%</b></span>
          </div>
        `)

      marker.on('click', () => onSelectDevice(d))
      markersRef.current.push(marker)
    })

    if (validDevices.length > 0 && !selectedDevice) {
      const group = L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }, [devices])

  useEffect(() => {
    if (selectedDevice?.lastKnownLat && selectedDevice?.lastKnownLng && leafletMap.current) {
      leafletMap.current.setView([selectedDevice.lastKnownLat, selectedDevice.lastKnownLng], 14, {
        animate: true,
      })
    }
  }, [selectedDevice])

  return <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-2xl z-0" />
}
