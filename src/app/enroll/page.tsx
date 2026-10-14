'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Wifi, Smartphone, ShieldCheck, Download, Copy, Check, Store, AlertTriangle } from 'lucide-react'

export default function EnrollPage() {
  const [selectedBranch, setSelectedBranch] = useState('DEVI_MAIN')
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://sarvam-tau.vercel.app/sarvam.apk')
  const [checksum, setChecksum] = useState('bZwOdyqWztJJmAyW0bP9CvnMz8cShGEiRVq_J4Rc5R8')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const branches = [
    { id: 'DEVI_MAIN', name: 'Devi Mobile - Branch 1 (Main Market)', phone: '9876543210' },
    { id: 'DEVI_BRANCH2', name: 'Devi Mobile - Branch 2 (Station Road)', phone: '9123456789' },
  ]

  // Generate Android Enterprise Zero-Touch QR Code Payload
  useEffect(() => {
    const payload: Record<string, unknown> = {
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME':
        'com.androidmanager/com.androidmanager.receiver.DeviceAdminReceiver',
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION':
        apkDownloadUrl.trim(),
      'android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED': true,
      'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
        serverUrl: 'https://sarvam-tau.vercel.app',
        backend_url: 'https://sarvam-tau.vercel.app/',
        brandName: 'Devi Mobile & Accessories',
        shopId: selectedBranch,
        shopPhone: selectedBranch === 'DEVI_MAIN' ? '9876543210' : '9123456789',
        enrollment_key: selectedBranch === 'DEVI_MAIN' ? 'devi_enroll_key_2026_main_branch' : 'devi_enroll_key_2026_station_br',
      },
    }

    if (checksum.trim()) {
      payload['android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM'] = checksum.trim()
    }

    if (wifiSsid.trim()) {
      payload['android.app.extra.PROVISIONING_WIFI_SSID'] = wifiSsid.trim()
      payload['android.app.extra.PROVISIONING_WIFI_PASSWORD'] = wifiPassword
    }

    QRCode.toDataURL(JSON.stringify(payload), {
      width: 360,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err))
  }, [wifiSsid, wifiPassword, apkDownloadUrl, checksum, selectedBranch])

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify({
      adminComponent: 'com.androidmanager/com.androidmanager.receiver.DeviceAdminReceiver',
      apkDownloadUrl,
      checksum,
      wifiSsid,
      wifiPassword,
      shopId: selectedBranch,
    }, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Android Zero-Touch Active
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Devi Mobile Verified
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
          Android 6-Tap QR Provisioning
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          नए या फैक्टरी रिसेट किए गए फोन की &quot;Welcome&quot; स्क्रीन पर 6 बार टैप करके यह QR स्कैन करें — Sarvam Device Owner अपने-आप एक्टिवेट हो जाएगा!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: QR Code Display Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-2xl bg-white border-2 border-slate-200 shadow-md">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="Sarvam Provisioning QR Code"
                width={288}
                height={288}
                unoptimized
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="w-full">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Device Owner Provisioning (SHA-256 Verified)</span>
            </span>
            <p className="text-xs text-slate-500 mt-2">
              Scan directly from fresh unboxed / factory-reset Android setup screen
            </p>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-2">
            <button
              onClick={copyPayload}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 min-h-[44px] cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Config!' : 'Copy JSON'}</span>
            </button>
            <a
              href="/sarvam.apk"
              download
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Download APK</span>
            </a>
          </div>
        </div>

        {/* Right Col: Wi-Fi, Branch & Setup Instructions */}
        <div className="lg:col-span-7 space-y-4">
          {/* Shop Branch & Wi-Fi Settings Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Store className="w-4 h-4 text-blue-600" />
              <span>दुकान शाखा चुनें (Select Devi Mobile Branch)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranch(b.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer min-h-[44px] ${
                    selectedBranch === b.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{b.name}</div>
                  <div className="text-slate-500 mt-0.5">📞 Call: {b.phone}</div>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>दुकान का Wi-Fi (QR स्कैन करते ही फोन खुद जुड़ जाएगा)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Wi-Fi Name (SSID - Optional):</label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="Optional (phone Wi-Fi se juda hai toh khali chhod dein)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Wi-Fi Password (Optional):</label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Optional (Password)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div>
                <label className="text-xs text-slate-600 font-semibold block mb-1">APK Direct Download Link:</label>
                <input
                  type="text"
                  value={apkDownloadUrl}
                  onChange={(e) => setApkDownloadUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-semibold flex items-center justify-between mb-1">
                  <span>Signer SHA-256 Checksum (URL-Safe Base64):</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Exact Match</span>
                </label>
                <input
                  type="text"
                  value={checksum}
                  onChange={(e) => setChecksum(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:border-blue-600 focus:bg-white min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* 6-Tap Physical Phone Setup Guide */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>असली फोन पर 6-टैप ट्रायल रन स्टेप्स (Physical Phone Guide)</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">1</span>
                <div><b>फोन ऑन या फैक्टरी रिसेट:</b> नया अनबॉक्स्ड फोन खोलें या किसी भी फोन को <i>Settings &gt; System &gt; Reset options &gt; Erase all data (factory reset)</i> करें।</div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">2</span>
                <div><b>6-टैप करें:</b> फोन स्टार्ट होते ही पहली <b>&quot;Welcome&quot; / &quot;Hi there&quot;</b> स्क्रीन पर किसी भी खाली जगह (सफेद बैकग्राउंड) पर लगातार <b>6 बार टैप</b> करें।</div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">3</span>
                <div><b>QR स्कैनर खुलेगा:</b> फोन एक बीप देगा और स्क्रीन पर कैमरा QR स्कैनर खुल जाएगा।</div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">4</span>
                <div><b>QR कोड स्कैन करें:</b> फोन के कैमरे को ऊपर दिए गए QR कोड के सामने रखें। फोन अपने-आप दुकान के Wi-Fi से कनेक्ट होकर Sarvam MDM APK डाउनलोड कर लेगा।</div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[11px]">5</span>
                <div><b>Device Owner एक्टिवेट:</b> बिना USB के फोन का सम्पूर्ण कंट्रोल (Zero-Tamper Device Owner) एक्टिवेट हो जाएगा और EMI लॉक स्क्रीन चालू हो जाएगी!</div>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span><b>ध्यान दें:</b> यदि फोन पर पहले से कोई गूगल अकाउंट लॉगिन है तो 6-टैप काम नहीं करेगा। फोन का बिल्कुल नया या फ्रेश फैक्टरी रिसेट होना जरूरी है।</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
