import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  themeColor: '#0B132B',
}

export const metadata: Metadata = {
  title: 'Sarvam Management | Retail EMI Locker & Device Security',
  description: 'Enterprise Android MDM and Retail EMI Locker Dashboard with manual shopkeeper controls, instant cash-paid auto-unlock, and live cloud telemetry.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0B132B] text-slate-100 antialiased pb-16 md:pb-0">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
