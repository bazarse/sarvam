// Password hashing using PBKDF2-HMAC-SHA256 via the Web Crypto API.
// Chosen to avoid a native dependency (bcrypt/argon2) that could break on the
// Supabase/edge runtime. Format: pbkdf2$sha256$<iterations>$<saltB64url>$<hashB64url>

const PBKDF2_ITERATIONS = 210_000
const SALT_BYTES = 16
const KEY_BYTES = 32

function toB64url(bytes: ArrayBuffer | Uint8Array): string {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return Buffer.from(buf).toString('base64url')
}

function fromB64url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BYTES * 8
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('password must be a non-empty string')
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${toB64url(salt)}$${toB64url(hash)}`
}

// Constant-time comparison of two byte arrays.
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (typeof password !== 'string' || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false
  const iterations = Number(parts[2])
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 5_000_000) return false
  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = fromB64url(parts[3])
    expected = fromB64url(parts[4])
  } catch {
    return false
  }
  const actual = await derive(password, salt, iterations)
  return timingSafeEqualBytes(actual, expected)
}
