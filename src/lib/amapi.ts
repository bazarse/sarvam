/**
 * Google Android Management API (AMAPI) helper
 * Uses service account to authenticate and send device commands
 */

import { GoogleAuth } from 'google-auth-library'

const ENTERPRISE_NAME = 'enterprises/LC01o0c2nt'
const AMAPI_BASE = 'https://androidmanagement.googleapis.com/v1'

// Service account credentials from env
function getCredentials() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var missing')
  return JSON.parse(key)
}

async function getAccessToken(): Promise<string> {
  const credentials = getCredentials()
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidmanagement'],
  })
  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()
  if (!tokenResponse.token) throw new Error('Could not get AMAPI access token')
  return tokenResponse.token
}

/**
 * Lock a device via AMAPI using its AMAPI device name
 * deviceName format: "enterprises/LC01o0c2nt/devices/XXXX"
 */
export async function amapiLockDevice(amapiDeviceName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken()
    const res = await fetch(`${AMAPI_BASE}/${amapiDeviceName}:issueCommand`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'LOCK' }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('AMAPI lock error:', err)
      return { ok: false, error: err }
    }
    return { ok: true }
  } catch (e) {
    console.error('AMAPI lock exception:', e)
    return { ok: false, error: String(e) }
  }
}

/**
 * Unlock a device via AMAPI (reset password to empty = unlocks)
 */
export async function amapiUnlockDevice(amapiDeviceName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken()
    // Clear the lock by resetting password — this removes MDM-set lockscreen
    const res = await fetch(`${AMAPI_BASE}/${amapiDeviceName}:issueCommand`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'RESET_PASSWORD', resetPasswordFlags: ['REQUIRE_ENTRY'] }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('AMAPI unlock error:', err)
      return { ok: false, error: err }
    }
    return { ok: true }
  } catch (e) {
    console.error('AMAPI unlock exception:', e)
    return { ok: false, error: String(e) }
  }
}

/**
 * Apply lock policy to a device (restricts apps, calls lock screen)
 */
export async function amapiApplyLockPolicy(amapiDeviceName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken()
    const res = await fetch(`${AMAPI_BASE}/${amapiDeviceName}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policyName: `${ENTERPRISE_NAME}/policies/emi-locked`,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('AMAPI policy error:', err)
      return { ok: false, error: err }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/**
 * Apply normal (unlocked) policy to a device
 */
export async function amapiApplyUnlockPolicy(amapiDeviceName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getAccessToken()
    const res = await fetch(`${AMAPI_BASE}/${amapiDeviceName}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policyName: `${ENTERPRISE_NAME}/policies/emi-lock-policy`,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, error: err }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export { ENTERPRISE_NAME }
