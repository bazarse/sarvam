'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, Wifi, Smartphone, ShieldCheck, Download, Copy, Check } from 'lucide-react'

export default function EnrollPage() {
  const [wifiSsid, setWifiSsid] = useState('Shop_WiFi')
  const [wifiPassword, setWifiPassword] = useState('shop1234')
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://github.com/bazarse/sarvam/releases/latest/download/sarvam.apk')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate Android Enterprise Zero-Touch QR Code Payload
  useEffect(() => {
    const payload = {
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME':
        'com.androidmanager/com.androidmanager.receiver.DeviceAdminReceiver',
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION':
        apkDownloadUrl,
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM': '',
      'android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED': true,
      'android.app.extra.PROVISIONING_WIFI_SSID': wifiSsid,
      'android.app.extra.PROVISIONING_WIFI_PASSWORD': wifiPassword,
      'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
        serverUrl: 'https://sarvam-management.vercel.app',
        brandName: 'Sarvam Management',
      },
    }

    QRCode.toDataURL(JSON.stringify(payload), {
      width: 320,
      margin: 2,
      color: {
        dark: '#0B132B',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err))
  }, [wifiSsid, wifiPassword, apkDownloadUrl])

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify({
      wifiSsid,
      wifiPassword,
      apkDownloadUrl,
      adminComponent: 'com.androidmanager/com.androidmanager.receiver.DeviceAdminReceiver',
    }, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Android Zero-Touch QR Provisioning
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Naye ya format kiye huye phone par 6-tap karke is QR ko scan karein — Sarvam app automatically install ho jayegi!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Col: QR Code Display Card */}
        <div className="p-6 rounded-2xl bg-[#1C2541] border border-slate-800 shadow-xl flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-2xl bg-white shadow-2xl">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Sarvam Provisioning QR Code"
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-200 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <div>
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Device Owner Provisioning</span>
            </span>
            <p className="text-xs text-slate-400 mt-2">
              Scan directly from fresh unboxed / factory-reset Android device setup screen
            </p>
          </div>

          <button
            onClick={copyPayload}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 min-h-[44px]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Configuration!' : 'Copy JSON Configuration'}</span>
          </button>
        </div>

        {/* Right Col: Wi-Fi & Setup Instructions */}
        <div className="space-y-4">
          {/* Shop Wi-Fi Settings Card */}
          <div className="p-5 rounded-2xl bg-[#1C2541] border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <Wifi className="w-4 h-4 text-cyan-400" />
              <span>Shop Wi-Fi Settings (QR Auto-Connect)</span>
            </div>
            <p className="text-xs text-slate-400">
              In credentials ko change karenge toh QR automatically update ho jayega taaki phone scan hote hi dukan ke Wi-Fi se connect ho jaye:
            </p>

            <div className="space-y-2.5 pt-1">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Wi-Fi Name (SSID):</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Wi-Fi Password:</label>
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Sarvam APK Download URL:</label>
                <input
                  type="text"
                  value={apkDownloadUrl}
                  onChange={(e) => setApkDownloadUrl(e.target.value)}
                  className="w-full bg-[#0B132B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="p-5 rounded-2xl bg-[#1C2541] border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Phone Setup Guide (30 Seconds)</span>
            </h3>

            <ol className="space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
              <li>Naye phone ko on karein ya puraane phone ko <b>Factory Reset</b> karein.</li>
              <li>Pehli <b>"Welcome" / "Hi there"</b> screen par kisi bhi khaali jagah par <b>6 baar lagataar tap karein</b>.</li>
              <li>Phone me QR Scanner automatically khul jayega.</li>
              <li>Is dashboard ke <b>QR Code</b> ko phone se scan karein.</li>
              <li>Phone dukan ke Wi-Fi se connect hoga aur Sarvam Management app automatically install ho kar <b>Device Owner</b> ban jayegi!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
