import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

// Paths reachable without an admin session:
// - /login and /api/auth/* (login flow)
// - /api/customer/* (called by the Android app, which has no admin session)
// - static assets, the APK and the enrollment QR image (excluded by the matcher)
const PUBLIC_PREFIXES = ['/login', '/enroll', '/api/auth/', '/api/customer/', '/api/cron/']

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (ok) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname + search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sarvam\\.apk|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
}
