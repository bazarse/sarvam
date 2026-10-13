// Admin session helpers (HMAC-signed cookie). Uses Web Crypto so it works in
// both the Proxy and Node.js route handlers.
//
// Required env vars:
//   ADMIN_SESSION_SECRET  - random string (32+ chars) used to sign session cookies
//
// Legacy (single shared password, being phased out):
//   ADMIN_PASSWORD        - dashboard login password (v1 tokens only)
//
// Session tokens:
//   v1.<expiresAt>.<sig>                               (legacy, no identity)
//   v2.<expiresAt>.<userId>.<role>.<shopId>.<sig>      (role-based accounts)

export const SESSION_COOKIE = 'sarvam_admin'
export const SESSION_TTL_SECONDS = 12 * 60 * 60 // 12 hours

const encoder = new TextEncoder()

export type SessionUser = {
  userId: string
  role: 'OWNER' | 'STAFF'
  shopId: string
}

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return secret
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return Buffer.from(sig).toString('base64url')
}

// Constant-time string comparison
export function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  let diff = ab.length ^ bb.length
  const len = Math.max(ab.length, bb.length)
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

export function isAuthConfigured(): boolean {
  return getSecret() !== null
}

// Encode a role-bearing field so '.' in a value can never break token parsing.
function enc(value: string): string {
  return Buffer.from(encoder.encode(value)).toString('base64url')
}
function dec(value: string): string {
  return new TextDecoder().decode(Buffer.from(value, 'base64url'))
}

export async function createSessionToken(user: SessionUser): Promise<string | null> {
  const secret = getSecret()
  if (!secret) return null
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `v2.${expiresAt}.${enc(user.userId)}.${user.role}.${enc(user.shopId)}`
  return `${payload}.${await hmac(payload, secret)}`
}

// Returns the identity carried by a valid session, or null. Verifies both the
// HMAC signature and expiry. v1 tokens are accepted (so live sessions survive a
// deploy) but carry no identity, surfaced as a legacy marker.
export async function getSessionUser(
  token: string | undefined | null
): Promise<SessionUser | { legacy: true } | null> {
  const secret = getSecret()
  if (!secret || !token) return null
  const parts = token.split('.')

  if (parts[0] === 'v1') {
    if (parts.length !== 3) return null
    const expiresAt = Number(parts[1])
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null
    const expected = await hmac(`v1.${parts[1]}`, secret)
    return safeEqual(expected, parts[2]) ? { legacy: true } : null
  }

  if (parts[0] === 'v2') {
    if (parts.length !== 6) return null
    const expiresAt = Number(parts[1])
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null
    const payload = `v2.${parts[1]}.${parts[2]}.${parts[3]}.${parts[4]}`
    const expected = await hmac(payload, secret)
    if (!safeEqual(expected, parts[5])) return null
    const role = parts[3]
    if (role !== 'OWNER' && role !== 'STAFF') return null
    return { userId: dec(parts[2]), role, shopId: dec(parts[4]) }
  }

  return null
}

// Boolean gate used by the proxy (any valid session, v1 or v2).
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  return (await getSessionUser(token)) !== null
}
