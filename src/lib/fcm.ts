import { createSign } from 'node:crypto'

// Sends FCM data messages to the Sarvam Android app via the FCM HTTP v1 API.
//
// Required env var:
//   FIREBASE_SERVICE_ACCOUNT_JSON - the service account JSON (raw or base64) from
//   Firebase console > Project settings > Service accounts, for the SAME Firebase
//   project that is compiled into the APK (google-services.json).
//
// The APK (EMIFirebaseMessagingService) understands these data keys:
//   action: LOCK_DEVICE | UNLOCK_DEVICE | SIREN | STOP_SIREN
//   message, upiId, amount (optional, used by LOCK_DEVICE)

export type DeviceAction = 'LOCK_DEVICE' | 'UNLOCK_DEVICE' | 'SIREN' | 'STOP_SIREN'

export interface PushResult {
  sent: boolean
  reason?: string
}

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const sa = JSON.parse(text)
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null
    return sa
  } catch {
    return null
  }
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claims = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url')
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const signature = signer.sign(sa.private_key.replace(/\\n/g, '\n')).toString('base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  if (!res.ok) throw new Error(`OAuth token request failed (${res.status})`)
  const data = await res.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.token
}

export async function sendDeviceCommand(
  fcmToken: string | null | undefined,
  action: DeviceAction,
  extra: { message?: string | null; upiId?: string | null; amount?: string | number | null } = {}
): Promise<PushResult> {
  if (!fcmToken) return { sent: false, reason: 'Phone has not registered an FCM token yet' }
  const sa = loadServiceAccount()
  if (!sa) return { sent: false, reason: 'FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server' }

  // FCM data values must be strings
  const data: Record<string, string> = { action, timestamp: String(Date.now()) }
  if (extra.message) data.message = String(extra.message)
  if (extra.upiId) data.upiId = String(extra.upiId)
  if (extra.amount !== undefined && extra.amount !== null) data.amount = String(extra.amount)

  try {
    const accessToken = await getAccessToken(sa)
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          data,
          android: { priority: 'high', ttl: '86400s' },
        },
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('FCM send failed', res.status, text.slice(0, 500))
      return { sent: false, reason: `FCM rejected the message (${res.status})` }
    }
    return { sent: true }
  } catch (error) {
    console.error('FCM send error', error)
    return { sent: false, reason: 'Could not reach FCM' }
  }
}
