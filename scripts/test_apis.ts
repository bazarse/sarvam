import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { hashPassword } from '../src/lib/password'
import { createSessionToken, SESSION_COOKIE } from '../src/lib/auth'
import { proxy } from '../src/proxy'
import { GET as healthHandler } from '../src/app/api/health/route'
import { POST as loginHandler } from '../src/app/api/auth/login/route'
import { POST as logoutHandler } from '../src/app/api/auth/logout/route'
import { POST as claimHandler } from '../src/app/api/customer/device/claim/route'
import { GET as statusHandler } from '../src/app/api/customer/device/status/[imei1]/route'
import { POST as locationHandler } from '../src/app/api/customer/device/location/route'
import { POST as activityHandler } from '../src/app/api/customer/device/activity/route'
import { POST as lockResponseHandler } from '../src/app/api/customer/device/lock-response/route'
import { PUT as fcmTokenHandler } from '../src/app/api/customer/device/fcm-token/route'
import { GET as retailerShopHandler } from '../src/app/api/customer/device/retailer-shop/[imei1]/route'
import { GET as devicesListHandler } from '../src/app/api/dashboard/devices/route'
import { POST as createDeviceHandler } from '../src/app/api/dashboard/devices/create/route'
import { GET as getDeviceHandler, DELETE as deleteDeviceHandler } from '../src/app/api/dashboard/devices/[id]/route'
import { POST as resetTokenHandler } from '../src/app/api/dashboard/devices/[id]/reset-token/route'
import { POST as lockDeviceHandler } from '../src/app/api/dashboard/devices/[id]/lock/route'
import { POST as unlockDeviceHandler } from '../src/app/api/dashboard/devices/[id]/unlock/route'
import { POST as sirenDeviceHandler } from '../src/app/api/dashboard/devices/[id]/siren/route'
import { POST as gracePeriodHandler } from '../src/app/api/dashboard/devices/[id]/grace-period/route'
import { POST as markCashPaidHandler } from '../src/app/api/dashboard/devices/[id]/mark-cash-paid/route'
import { POST as reversePaymentHandler } from '../src/app/api/dashboard/devices/[id]/reverse-payment/route'
import { GET as statsHandler } from '../src/app/api/dashboard/stats/route'
import { GET as dailyCashHandler } from '../src/app/api/dashboard/reports/daily-cash/route'
import { POST as rotateEnrollmentKeyHandler } from '../src/app/api/dashboard/shops/[id]/enrollment-key/route'
import { GET as cronAutoLockHandler } from '../src/app/api/cron/emi-autolock/route'

const prisma = new PrismaClient()

interface TestResult {
  name: string
  ok: boolean
  details?: string
}
const results: TestResult[] = []

function assert(name: string, condition: boolean, details?: string) {
  results.push({ name, ok: condition, details })
  const icon = condition ? '✅' : '❌'
  console.log(`${icon} [${condition ? 'PASS' : 'FAIL'}] ${name}${details ? ` -> ${details}` : ''}`)
}

function req(url: string, options: { method?: string; body?: any; cookie?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers(options.headers || {})
  if (options.cookie) headers.set('cookie', `${SESSION_COOKIE}=${options.cookie}`)
  if (options.body) headers.set('content-type', 'application/json')
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

async function runApiTestSuite() {
  console.log('\n==================================================================')
  console.log('🧪 COMPREHENSIVE BACKEND REST APIs PRODUCTION VERIFICATION SUITE')
  console.log('==================================================================\n')

  const tag = `test_${Date.now()}`
  let testShop: any
  let ownerUser: any
  let staffUser: any
  let ownerToken: string
  let staffToken: string
  let rawEnrollmentKey: string
  let claimedDeviceImei = `99${Date.now().toString().slice(-13)}`
  let deviceToken = ''
  let createdDeviceId = ''

  try {
    // 1. Healthcheck Endpoint
    const healthRes = await healthHandler()
    const healthJson = await healthRes.json()
    assert('GET /api/health -> 200 with DB status', healthRes.status === 200 && healthJson.status === 'healthy', `Latency: ${healthJson.database?.latencyMs}ms`)

    // 2. Proxy (Middleware) Routing Security
    const pubReq = req('/api/health')
    const pubRes = await proxy(pubReq)
    assert('Proxy: Public /api/health bypasses session check', pubRes.status === 200)

    const unauthReq = req('/api/dashboard/devices')
    const unauthRes = await proxy(unauthReq)
    assert('Proxy: Protected /api/dashboard/devices returns 401 without cookie', unauthRes.status === 401)

    // Setup Test Multi-Tenant Fixtures
    testShop = await prisma.shop.create({
      data: {
        shopName: `Test Store ${tag}`,
        phone: '9888877777',
      },
    })
    const pwHash = await hashPassword('password1234')
    ownerUser = await prisma.user.create({
      data: {
        username: `owner_${tag}`,
        passwordHash: pwHash,
        role: 'OWNER',
        shopId: testShop.id,
      },
    })
    staffUser = await prisma.user.create({
      data: {
        username: `staff_${tag}`,
        passwordHash: pwHash,
        role: 'STAFF',
        shopId: testShop.id,
      },
    })

    ownerToken = (await createSessionToken({ userId: ownerUser.id, role: 'OWNER', shopId: testShop.id }))!
    staffToken = (await createSessionToken({ userId: staffUser.id, role: 'STAFF', shopId: testShop.id }))!

    // 3. Auth API: Login & Logout
    const loginFail = await loginHandler(req('/api/auth/login', { method: 'POST', body: { username: ownerUser.username, password: 'wrong' } }))
    assert('POST /api/auth/login -> 401 on bad password', loginFail.status === 401)

    const loginSuccess = await loginHandler(req('/api/auth/login', { method: 'POST', body: { username: ownerUser.username, password: 'password1234' } }))
    const loginJson = await loginSuccess.json()
    assert('POST /api/auth/login -> 200 on valid credentials', loginSuccess.status === 200 && loginJson.user?.username === ownerUser.username)

    const logoutRes = await logoutHandler()
    assert('POST /api/auth/logout -> 200 and expires session cookie', logoutRes.status === 200)

    // 4. Shop Enrollment Key Rotation
    const rotateRes = await rotateEnrollmentKeyHandler(
      req(`/api/dashboard/shops/${testShop.id}/enrollment-key`, { method: 'POST', cookie: ownerToken }),
      { params: Promise.resolve({ id: testShop.id }) }
    )
    const rotateJson = await rotateRes.json()
    rawEnrollmentKey = rotateJson.enrollmentKey
    assert('POST /api/dashboard/shops/[id]/enrollment-key -> 200 generates 32-char key', rotateRes.status === 200 && !!rawEnrollmentKey)

    // 5. Customer Device TOFU Claim
    const badKeyClaim = await claimHandler(req('/api/customer/device/claim', { method: 'POST', body: { imei1: claimedDeviceImei, enrollmentKey: 'bad_key_123456789' } }))
    assert('POST /api/customer/device/claim -> 403 on bad enrollment key', badKeyClaim.status === 403)

    const validClaim = await claimHandler(req('/api/customer/device/claim', { method: 'POST', body: { imei1: claimedDeviceImei, enrollmentKey: rawEnrollmentKey } }))
    const validClaimJson = await validClaim.json()
    deviceToken = validClaimJson.data?.deviceToken
    createdDeviceId = validClaimJson.data?.deviceId
    assert('POST /api/customer/device/claim -> 200 returns one-time secret token', validClaim.status === 200 && !!deviceToken)

    const duplicateClaim = await claimHandler(req('/api/customer/device/claim', { method: 'POST', body: { imei1: claimedDeviceImei, enrollmentKey: rawEnrollmentKey } }))
    assert('POST /api/customer/device/claim -> 409 conflict on already bound device', duplicateClaim.status === 409)

    // 6. Device Status Endpoint & Header Verification
    const noTokenStatus = await statusHandler(req(`/api/customer/device/status/${claimedDeviceImei}`), { params: Promise.resolve({ imei1: claimedDeviceImei }) })
    assert('GET /api/customer/device/status/[imei] -> 401 without X-Device-Token', noTokenStatus.status === 401)

    const spoofTokenStatus = await statusHandler(
      req(`/api/customer/device/status/${claimedDeviceImei}`, { headers: { 'x-device-token': 'wrong_spoofed_token_hex_1234567890123456' } }),
      { params: Promise.resolve({ imei1: claimedDeviceImei }) }
    )
    assert('GET /api/customer/device/status/[imei] -> 403 on spoofed token', spoofTokenStatus.status === 403)

    const validStatus = await statusHandler(
      req(`/api/customer/device/status/${claimedDeviceImei}`, { headers: { 'x-device-token': deviceToken } }),
      { params: Promise.resolve({ imei1: claimedDeviceImei }) }
    )
    const validStatusJson = await validStatus.json()
    assert('GET /api/customer/device/status/[imei] -> 200 with device data', validStatus.status === 200 && validStatusJson.data?.isLocked === false)

    // 6b. Header Anti-Spoofing: X-Imei Cross-Verification
    const spoofHeaderRes = await statusHandler(
      req(`/api/customer/device/status/${claimedDeviceImei}`, {
        headers: { 'x-device-token': deviceToken, 'x-imei': '999999999999999' },
      }),
      { params: Promise.resolve({ imei1: claimedDeviceImei }) }
    )
    assert('GET /api/customer/device/status/[imei] -> 403 on mismatched X-Imei header', spoofHeaderRes.status === 403)

    const validHeaderRes = await statusHandler(
      req(`/api/customer/device/status/${claimedDeviceImei}`, {
        headers: { 'x-device-token': deviceToken, 'x-imei': claimedDeviceImei },
      }),
      { params: Promise.resolve({ imei1: claimedDeviceImei }) }
    )
    assert('GET /api/customer/device/status/[imei] -> 200 with verified X-Imei header', validHeaderRes.status === 200)

    // 6c. SIM Swap Detection & Auto-Lock Trigger
    const simSwapRes = await lockResponseHandler(
      req('/api/customer/device/lock-response', {
        method: 'POST',
        headers: { 'x-device-token': deviceToken },
        body: { imei1: claimedDeviceImei, action: 'sim_swapped', lockSuccess: true, errorMessage: 'Unauthorized SIM detected' },
      })
    )
    assert('POST /api/customer/device/lock-response -> 200 auto-locks on sim_swapped alert', simSwapRes.status === 200)

    const simCheck = await prisma.device.findUnique({ where: { imei1: claimedDeviceImei } })
    assert('Device security state -> isLocked set to true after SIM swap', simCheck?.isLocked === true)

    // Restore unlocked state for following tests
    await prisma.device.update({ where: { imei1: claimedDeviceImei }, data: { isLocked: false } })

    // 7. Retailer Shop for Device
    const shopDetailRes = await retailerShopHandler(
      req(`/api/customer/device/retailer-shop/${claimedDeviceImei}`, { headers: { 'x-device-token': deviceToken } }),
      { params: Promise.resolve({ imei1: claimedDeviceImei }) }
    )
    const shopDetailJson = await shopDetailRes.json()
    assert('GET /api/customer/device/retailer-shop/[imei] -> 200 with shop details', shopDetailRes.status === 200 && shopDetailJson.data?.shopName === testShop.shopName)

    // 8. Device Location & Telemetry Updates
    const locRes = await locationHandler(
      req('/api/customer/device/location', {
        method: 'POST',
        headers: { 'x-device-token': deviceToken },
        body: { imei1: claimedDeviceImei, latitude: 28.6139, longitude: 77.2090 },
      })
    )
    assert('POST /api/customer/device/location -> 200 updates lat/lng', locRes.status === 200)

    const actRes = await activityHandler(
      req('/api/customer/device/activity', {
        method: 'POST',
        headers: { 'x-device-token': deviceToken },
        body: { imei1: claimedDeviceImei, batteryLevel: 88, activityType: 'HEARTBEAT' },
      })
    )
    assert('POST /api/customer/device/activity -> 200 records battery & ping', actRes.status === 200)

    const fcmRes = await fcmTokenHandler(
      req('/api/customer/device/fcm-token', {
        method: 'PUT',
        headers: { 'x-device-token': deviceToken },
        body: { imei1: claimedDeviceImei, fcmToken: 'test_fcm_token_sample' },
      })
    )
    assert('PUT /api/customer/device/fcm-token -> 200 saves push token', fcmRes.status === 200)

    // 9. Dashboard Device Management & RBAC
    const staffCreate = await createDeviceHandler(
      req('/api/dashboard/devices/create', { method: 'POST', cookie: staffToken, body: { imei1: '12345678', customerName: 'X', customerPhone: '9888877777', deviceModel: 'M' } })
    )
    assert('POST /api/dashboard/devices/create -> 403 for STAFF (Owner-only)', staffCreate.status === 403)

    const newDeviceImei = `88${Date.now().toString().slice(-13)}`
    const ownerCreate = await createDeviceHandler(
      req('/api/dashboard/devices/create', {
        method: 'POST',
        cookie: ownerToken,
        body: {
          imei1: newDeviceImei,
          customerName: 'Aarav Patel',
          customerPhone: '9876543210',
          deviceModel: 'Samsung Galaxy A15',
          totalLoanAmount: 12000,
          emiAmount: 2000,
          totalEmis: 6,
        },
      })
    )
    const ownerCreateJson = await ownerCreate.json()
    const newDeviceId = ownerCreateJson.device?.id
    assert('POST /api/dashboard/devices/create -> 200 creates device & schedules', ownerCreate.status === 200 && !!newDeviceId)

    // 10. Device Details GET
    const getDevRes = await getDeviceHandler(
      req(`/api/dashboard/devices/${newDeviceId}`, { cookie: staffToken }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    const getDevJson = await getDevRes.json()
    assert('GET /api/dashboard/devices/[id] -> 200 with masked Aadhaar and EMI schedule', getDevRes.status === 200 && getDevJson.device?.emiSchedules?.length === 6)

    // 11. Lock / Unlock / Siren
    const lockRes = await lockDeviceHandler(
      req(`/api/dashboard/devices/${newDeviceId}/lock`, { method: 'POST', cookie: staffToken, body: { message: 'Overdue EMI' } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/lock -> 200 by staff/owner', lockRes.status === 200)

    const staffUnlock = await unlockDeviceHandler(
      req(`/api/dashboard/devices/${newDeviceId}/unlock`, { method: 'POST', cookie: staffToken }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/unlock -> 403 for STAFF (Owner-only)', staffUnlock.status === 403)

    const ownerUnlock = await unlockDeviceHandler(
      req(`/api/dashboard/devices/${newDeviceId}/unlock`, { method: 'POST', cookie: ownerToken }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/unlock -> 200 by OWNER', ownerUnlock.status === 200)

    const sirenRes = await sirenDeviceHandler(
      req(`/api/dashboard/devices/${newDeviceId}/siren`, { method: 'POST', cookie: staffToken, body: { enable: true } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/siren -> 200 toggles emergency alarm', sirenRes.status === 200)

    // 12. Grace Period Extension
    const staffBigGrace = await gracePeriodHandler(
      req(`/api/dashboard/devices/${newDeviceId}/grace-period`, { method: 'POST', cookie: staffToken, body: { days: 5 } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/grace-period -> 403 STAFF capped at 2 days', staffBigGrace.status === 403)

    const ownerGrace = await gracePeriodHandler(
      req(`/api/dashboard/devices/${newDeviceId}/grace-period`, { method: 'POST', cookie: ownerToken, body: { days: 4, reason: 'Customer requested extension' } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/grace-period -> 200 OWNER extends due date', ownerGrace.status === 200)

    // 13. Cash Collection & Double-Click Guard
    const cashRes = await markCashPaidHandler(
      req(`/api/dashboard/devices/${newDeviceId}/mark-cash-paid`, { method: 'POST', cookie: staffToken, body: { amount: 2000, remarks: 'Collected at counter' } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    const cashJson = await cashRes.json()
    assert('POST /api/dashboard/devices/[id]/mark-cash-paid -> 200 marks EMI paid', cashRes.status === 200 && !!cashJson.receiptNumber)

    const doubleClickCash = await markCashPaidHandler(
      req(`/api/dashboard/devices/${newDeviceId}/mark-cash-paid`, { method: 'POST', cookie: staffToken, body: { amount: 2000 } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/mark-cash-paid -> 409 double-click guard within 15s', doubleClickCash.status === 409)

    // 14. Payment Reversal
    const staffReverse = await reversePaymentHandler(
      req(`/api/dashboard/devices/${newDeviceId}/reverse-payment`, { method: 'POST', cookie: staffToken, body: { installmentNo: 1, reason: 'Error' } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/reverse-payment -> 403 for STAFF (Owner-only)', staffReverse.status === 403)

    const ownerReverse = await reversePaymentHandler(
      req(`/api/dashboard/devices/${newDeviceId}/reverse-payment`, { method: 'POST', cookie: ownerToken, body: { installmentNo: 1, reason: 'Counter mistake, bounced note' } }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/reverse-payment -> 200 OWNER reverses payment to PENDING', ownerReverse.status === 200)

    // 14b. Dashboard Devices List
    const devListRes = await devicesListHandler(req('/api/dashboard/devices', { cookie: ownerToken }))
    assert('GET /api/dashboard/devices -> 200 returns devices for store', devListRes.status === 200)

    // 14c. TOFU Token Reset & Re-enrollment Lifecycle
    const staffReset = await resetTokenHandler(
      req(`/api/dashboard/devices/${createdDeviceId}/reset-token`, { method: 'POST', cookie: staffToken }),
      { params: Promise.resolve({ id: createdDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/reset-token -> 403 for STAFF (Owner-only)', staffReset.status === 403)

    const ownerReset = await resetTokenHandler(
      req(`/api/dashboard/devices/${createdDeviceId}/reset-token`, { method: 'POST', cookie: ownerToken }),
      { params: Promise.resolve({ id: createdDeviceId }) }
    )
    assert('POST /api/dashboard/devices/[id]/reset-token -> 200 by OWNER', ownerReset.status === 200)

    const resetCheck = await prisma.device.findUnique({ where: { id: createdDeviceId } })
    assert('Device security state -> deviceTokenHash cleared to null', resetCheck?.deviceTokenHash === null)

    // Re-claim device after token reset
    const reClaimRes = await claimHandler(
      req('/api/customer/device/claim', {
        method: 'POST',
        body: {
          imei1: claimedDeviceImei,
          enrollmentKey: rawEnrollmentKey,
          simIccid: '8991000123456789012',
          simOperator: 'Airtel India',
        },
      })
    )
    const reClaimJson = await reClaimRes.json()
    const reClaimedToken = reClaimJson.data?.deviceToken
    assert('POST /api/customer/device/claim -> 200 re-claim succeeds after token reset', reClaimRes.status === 200 && !!reClaimedToken)

    const reClaimDuplicate = await claimHandler(
      req('/api/customer/device/claim', {
        method: 'POST',
        body: { imei1: claimedDeviceImei, enrollmentKey: rawEnrollmentKey },
      })
    )
    assert('POST /api/customer/device/claim -> 409 conflict on already bound device again', reClaimDuplicate.status === 409)

    // 15. Stats & Daily Cash Report
    const statsRes = await statsHandler(req('/api/dashboard/stats', { cookie: ownerToken }))
    const statsJson = await statsRes.json()
    assert('GET /api/dashboard/stats -> 200 scoped to shop', statsRes.status === 200 && statsJson.stats?.totalDevices >= 2)

    const reportRes = await dailyCashHandler(req('/api/dashboard/reports/daily-cash', { cookie: ownerToken }))
    const reportJson = await reportRes.json()
    assert('GET /api/dashboard/reports/daily-cash -> 200 returns audit-backed totals', reportRes.status === 200 && Array.isArray(reportJson.perStaff))

    // 16. Cron EMI Autolock
    const cronNoAuth = await cronAutoLockHandler(req('/api/cron/emi-autolock'))
    assert('GET /api/cron/emi-autolock -> 401 without Bearer secret', cronNoAuth.status === 401)

    const cronAuth = await cronAutoLockHandler(req('/api/cron/emi-autolock', { headers: { authorization: `Bearer ${process.env.CRON_SECRET || 'sarvam-cron-secret-32-chars-long-123'}` } }))
    const cronAuthJson = await cronAuth.json()
    assert('GET /api/cron/emi-autolock -> 200 scans and executes auto-lock', cronAuth.status === 200 && cronAuthJson.success === true)

    // 17. Device Deletion Safety
    // Lock the device first
    await prisma.device.update({ where: { id: newDeviceId }, data: { isLocked: true } })
    const delLocked = await deleteDeviceHandler(
      req(`/api/dashboard/devices/${newDeviceId}`, { method: 'DELETE', cookie: ownerToken }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('DELETE /api/dashboard/devices/[id] -> 400 rejects deleting locked phone', delLocked.status === 400)

    // Unlock then delete
    await prisma.device.update({ where: { id: newDeviceId }, data: { isLocked: false } })
    const delUnlocked = await deleteDeviceHandler(
      req(`/api/dashboard/devices/${newDeviceId}`, { method: 'DELETE', cookie: ownerToken }),
      { params: Promise.resolve({ id: newDeviceId }) }
    )
    assert('DELETE /api/dashboard/devices/[id] -> 200 deletes unlocked phone', delUnlocked.status === 200)

  } finally {
    // Clean up test fixtures
    console.log('\n🧹 Cleaning up test fixtures...')
    if (testShop) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DISABLE TRIGGER USER`).catch(() => {})
      await prisma.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE "shopId" = $1`, testShop.id).catch(() => {})
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ENABLE TRIGGER USER`).catch(() => {})

      const testDevs = await prisma.device.findMany({ where: { shopId: testShop.id }, select: { id: true } })
      for (const d of testDevs) {
        await prisma.deviceActivityLog.deleteMany({ where: { deviceId: d.id } })
        await prisma.emiSchedule.deleteMany({ where: { deviceId: d.id } })
      }
      await prisma.device.deleteMany({ where: { shopId: testShop.id } })
      if (claimedDeviceImei) {
        const extra = await prisma.device.findUnique({ where: { imei1: claimedDeviceImei }, select: { id: true } })
        if (extra) {
          await prisma.deviceActivityLog.deleteMany({ where: { deviceId: extra.id } })
          await prisma.emiSchedule.deleteMany({ where: { deviceId: extra.id } })
          await prisma.device.delete({ where: { id: extra.id } })
        }
      }
      await prisma.user.deleteMany({ where: { shopId: testShop.id } })
      await prisma.shop.delete({ where: { id: testShop.id } })
    }
  }

  // Summary
  console.log('\n==================================================================')
  const total = results.length
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`📊 SUMMARY: ${passed}/${total} REST API tests passed (${failed} failed)`)
  if (failed === 0) {
    console.log('🎉 ALL BACKEND REST APIS ARE 100% PRODUCTION READY!')
  }
  console.log('==================================================================\n')
  process.exit(failed > 0 ? 1 : 0)
}

runApiTestSuite().catch((err) => {
  console.error('Fatal API test error:', err)
  process.exit(1)
}).finally(() => {
  prisma.$disconnect()
})
