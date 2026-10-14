'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Smartphone, ShieldCheck, Store, CheckCircle2, AlertTriangle } from 'lucide-react'

// AMAPI QR payload — Google certified, Play Protect bypass guaranteed
const AMAPI_QR_PAYLOAD = JSON.stringify({
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
    "com.google.android.apps.work.clouddpc/.receivers.CloudDeviceAdminReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM":
    "I5YvS0O5hXY46mb01BlRjq4oJJGs2kuUcHvVkAPEXlg",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION":
    "https://play.google.com/managed/downloadManagingApp?identifier=setup",
  "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
    "com.google.android.apps.work.clouddpc.EXTRA_ENROLLMENT_TOKEN": "NSBBWZQGVMPQFURUPQTZDPIB"
  }
})

export default function EnrollPage() {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('DEVI_MAIN')

  const branches = [
    { id: 'DEVI_MAIN', name: 'Devi Mobile — Main Market', phone: '9876543210' },
    { id: 'DEVI_BRANCH2', name: 'Devi Mobile — Station Road', phone: '9123456789' },
  ]

  useEffect(() => {
    QRCode.toDataURL(AMAPI_QR_PAYLOAD, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(console.error)
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Google AMAPI — Play Protect Certified
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Bajaj / TVS जैसा सिस्टम
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
          QR से फोन एनरोल करें
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          नया या फैक्टरी रिसेट फोन — Welcome स्क्रीन पर <b>6 बार टैप</b> करें → यह QR स्कैन करें → बस! फोन अपने-आप लॉक सिस्टम से जुड़ जाएगा।
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QR Code Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-2xl bg-white border-2 border-emerald-200 shadow-md">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="AMAPI Enrollment QR Code"
                width={320}
                height={320}
                unoptimized
                className="w-72 h-72 sm:w-80 sm:h-80 object-contain"
              />
            ) : (
              <div className="w-72 h-72 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-sm">
                QR बन रहा है...
              </div>
            )}
          </div>

          <div className="w-full space-y-2">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google Certified — Play Protect Approved</span>
            </span>
            <p className="text-xs text-slate-500">
              यह QR Bajaj Finserv / TVS Credit जैसे ही Google के certified system से बना है। 100% काम करेगा।
            </p>
          </div>

          {/* What happens after scan */}
          <div className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-left space-y-1.5">
            <p className="text-xs font-bold text-blue-900">QR स्कैन के बाद फोन में क्या होगा:</p>
            {[
              'Google का Android Device Policy app डाउनलोड होगा (Play Store से — Play Protect approved)',
              'फोन Devi Mobile के MDM से जुड़ जाएगा',
              'Dashboard में device अपने-आप दिखने लगेगा',
              'EMI miss होने पर dashboard से lock करो — तुरंत lock होगा',
            ].map((step, i) => (
              <div key={i} className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-blue-800">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Instructions + Branch */}
        <div className="lg:col-span-7 space-y-4">
          {/* Branch Selector */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Store className="w-4 h-4 text-blue-600" />
              <span>दुकान की शाखा (सिर्फ record के लिए)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranch(b.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer min-h-[44px] ${
                    selectedBranch === b.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{b.name}</div>
                  <div className="text-slate-500 mt-0.5">📞 {b.phone}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step by Step Guide */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>दुकान पर फोन एनरोल करने के Steps</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-700">
              {[
                {
                  num: '1',
                  color: 'bg-blue-100 text-blue-700',
                  title: 'फोन Factory Reset करें',
                  desc: 'नया फोन हो तो सीधे शुरू करें। पुराना हो तो: Settings → System → Reset → Factory Reset करें।',
                },
                {
                  num: '2',
                  color: 'bg-blue-100 text-blue-700',
                  title: 'Welcome Screen पर 6 बार टैप करें',
                  desc: 'फोन start होने पर "Hi there" / "Welcome" स्क्रीन आएगी — उसी पर किसी भी जगह लगातार 6 बार टैप करें।',
                },
                {
                  num: '3',
                  color: 'bg-blue-100 text-blue-700',
                  title: 'Wi-Fi से जोड़ें',
                  desc: 'QR scanner खुलने से पहले phone Wi-Fi माँगेगा — दुकान का Wi-Fi connect करें।',
                },
                {
                  num: '4',
                  color: 'bg-blue-100 text-blue-700',
                  title: 'यह QR Scan करें',
                  desc: 'Camera QR scanner में ऊपर बना QR code दिखाएँ। फोन automatically Google का app download करेगा।',
                },
                {
                  num: '5',
                  color: 'bg-emerald-100 text-emerald-700',
                  title: 'Done! Dashboard में device दिखेगा',
                  desc: 'Setup complete होने पर device dashboard में "New Device" के रूप में दिखेगा। Customer का नाम / IMEI fill करें।',
                },
              ].map((step) => (
                <div key={step.num} className="flex items-start space-x-2">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full ${step.color} font-bold flex items-center justify-center text-[11px]`}>
                    {step.num}
                  </span>
                  <div>
                    <b>{step.title}:</b> {step.desc}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <b>ज़रूरी:</b> फोन बिल्कुल fresh factory reset होना चाहिए। पहले से Google account login हो तो 6-tap काम नहीं करेगा।
              </span>
            </div>
          </div>

          {/* Enterprise Info */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">Technical Details (AMAPI):</p>
            <p>Enterprise: <code className="bg-white px-1 rounded border text-slate-800">enterprises/LC01o0c2nt</code></p>
            <p>DPC: <code className="bg-white px-1 rounded border text-slate-800">com.google.android.apps.work.clouddpc</code></p>
            <p>Token: <code className="bg-white px-1 rounded border text-slate-800">NSBBWZQGVMPQFURUPQTZDPIB</code> (10 years valid)</p>
            <p>Policy: <code className="bg-white px-1 rounded border text-slate-800">emi-lock-policy</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
