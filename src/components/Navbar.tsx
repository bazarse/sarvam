'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Smartphone, 
  Store,
  MapPin, 
  QrCode, 
  Menu, 
  X, 
  UserCircle2,
  Database,
  LogOut
} from 'lucide-react'

interface CurrentUser {
  id: string
  username: string
  role: 'OWNER' | 'STAFF'
  shopId: string
  shopName: string
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    if (pathname === '/login') return
    let isMounted = true
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.user) {
          setCurrentUser(data.user)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [pathname])

  if (pathname === '/login') return null

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
  }

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Devices', href: '/devices', icon: Smartphone },
    { name: 'Stores', href: '/stores', icon: Store },
    { name: 'Live Map', href: '/map', icon: MapPin },
    { name: 'Setup QR', href: '/enroll', icon: QrCode },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center space-x-3 group min-h-[44px]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight truncate">
                  {currentUser?.shopName ?? 'SARVAM PORTAL'}
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                  {currentUser?.role ?? 'ENTERPRISE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">EMI Locker & MDM Control</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              )
            })}
          </div>

          {/* User info & Logout */}
          <div className="hidden sm:flex items-center space-x-3">
            {currentUser && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-700 font-medium">
                <UserCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold">{currentUser.username}</span>
                <span className="text-[10px] uppercase text-slate-500">({currentUser.role})</span>
              </div>
            )}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Postgres Live</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 font-medium min-h-[44px] cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2 animate-in slide-in-from-top duration-200">
          {currentUser && (
            <div className="flex items-center justify-between p-3 mb-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2">
                <UserCircle2 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{currentUser.username}</p>
                  <p className="text-xs text-slate-500">{currentUser.shopName}</p>
                </div>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                {currentUser.role}
              </span>
            </div>
          )}
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium min-h-[44px] ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.name}</span>
              </Link>
            )
          })}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-sm min-h-[44px] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout Session</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (App Experience on Phones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 flex items-center justify-around py-2 px-1 shadow-lg">
        {navLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[48px] min-h-[44px] transition-colors ${
                isActive ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{link.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
