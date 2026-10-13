import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAuthConfigured,
} from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { cleanString } from '@/lib/validate'

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Login is not configured on the server (ADMIN_SESSION_SECRET missing)' },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const username = cleanString(body?.username, 64)
  const password = typeof body?.password === 'string' ? body.password : ''

  // Fixed delay on any failure so unknown-user and wrong-password are
  // indistinguishable (no user enumeration).
  const fail = async () => {
    await new Promise((r) => setTimeout(r, 800))
    return NextResponse.json({ success: false, message: 'Wrong username or password' }, { status: 401 })
  }

  if (!username || !password) return fail()

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.isActive) return fail()
  if (user.role !== 'OWNER' && user.role !== 'STAFF') return fail()

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return fail()

  const token = await createSessionToken({ userId: user.id, role: user.role, shopId: user.shopId })
  if (!token) {
    return NextResponse.json({ success: false, message: 'Login is not configured on the server' }, { status: 503 })
  }

  const res = NextResponse.json({
    success: true,
    user: { username: user.username, role: user.role },
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  return res
}
