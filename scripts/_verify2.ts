// Spot-check the newly role-gated routes: siren, device list scoping, create.
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()
const BASE = process.env.VERIFY_BASE ?? 'http://localhost:3001'
let pass = 0, fail = 0
const check = (n: string, c: boolean, e = '') => { if (c) { pass++; console.log(`  PASS  ${n}`) } else { fail++; console.log(`  FAIL  ${n} ${e}`) } }

async function login(username: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return { status: res.status, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? '' }
}

async function main() {
  const tag = `v2_${Date.now()}`
  const shopA = await prisma.shop.create({ data: { shopName: `${tag}_A`, phone: '9000000001' } })
  const shopB = await prisma.shop.create({ data: { shopName: `${tag}_B`, phone: '9000000002' } })
  const ownerA = await prisma.user.create({ data: { username: `${tag}_ownerA`, passwordHash: await hashPassword('pass12345'), role: 'OWNER', shopId: shopA.id } })
  const staffA = await prisma.user.create({ data: { username: `${tag}_staffA`, passwordHash: await hashPassword('pass12345'), role: 'STAFF', shopId: shopA.id } })
  // A device in shop B (should be invisible to shop A users)
  const devB = await prisma.device.create({ data: { imei1: `88${Date.now().toString().slice(-10)}`, customerName: 'B cust', customerPhone: '1', deviceModel: 'X', shopId: shopB.id } })

  try {
    const o = await login(`${tag}_ownerA`, 'pass12345')
    const s = await login(`${tag}_staffA`, 'pass12345')

    // Staff cannot create a device (OWNER-only)
    const staffCreate = await fetch(`${BASE}/api/dashboard/devices/create`, {
      method: 'POST', headers: { cookie: s.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ imei1: `77${Date.now().toString().slice(-10)}`, customerName: 'x', customerPhone: '9999999999', deviceModel: 'M' }),
    })
    check('staff create device -> 403', staffCreate.status === 403, `got ${staffCreate.status}`)

    // Owner A creates a device -> bound to shop A regardless of body shopId
    const imeiA = `66${Date.now().toString().slice(-10)}`
    const ownerCreate = await fetch(`${BASE}/api/dashboard/devices/create`, {
      method: 'POST', headers: { cookie: o.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ imei1: imeiA, customerName: 'A cust', customerPhone: '9999999999', deviceModel: 'M', shopId: shopB.id }),
    })
    check('owner create device -> 200', ownerCreate.status === 200, `got ${ownerCreate.status}`)
    const createdA = await prisma.device.findUnique({ where: { imei1: imeiA }, select: { shopId: true } })
    check('created device bound to OWN shop (not body shopId)', createdA?.shopId === shopA.id)

    // Device list for owner A must NOT include shop B device
    const list = await fetch(`${BASE}/api/dashboard/devices`, { headers: { cookie: o.cookie } })
    const listJson = await list.json()
    const ids: string[] = (listJson.devices ?? []).map((d: { id: string }) => d.id)
    check('device list scoped to own shop (excludes other shop)', !ids.includes(devB.id), `list size ${ids.length}`)

    // Siren: staff allowed on own-shop device
    const createdDev = await prisma.device.findUnique({ where: { imei1: imeiA }, select: { id: true } })
    const staffSiren = await fetch(`${BASE}/api/dashboard/devices/${createdDev!.id}/siren`, {
      method: 'POST', headers: { cookie: s.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ enable: true }),
    })
    check('staff siren own-shop device -> 200', staffSiren.status === 200, `got ${staffSiren.status}`)

    // Siren on another shop's device -> 404 (not visible)
    const crossSiren = await fetch(`${BASE}/api/dashboard/devices/${devB.id}/siren`, {
      method: 'POST', headers: { cookie: o.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ enable: true }),
    })
    check('siren on other-shop device -> 404', crossSiren.status === 404, `got ${crossSiren.status}`)
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DISABLE TRIGGER USER`).catch(() => {})
    await prisma.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE "shopId" IN ($1,$2)`, shopA.id, shopB.id).catch(() => {})
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ENABLE TRIGGER USER`).catch(() => {})
    for (const sid of [shopA.id, shopB.id]) {
      const ds = await prisma.device.findMany({ where: { shopId: sid }, select: { id: true } })
      for (const d of ds) { await prisma.deviceActivityLog.deleteMany({ where: { deviceId: d.id } }); await prisma.emiSchedule.deleteMany({ where: { deviceId: d.id } }) }
      await prisma.device.deleteMany({ where: { shopId: sid } })
    }
    await prisma.user.deleteMany({ where: { id: { in: [ownerA.id, staffA.id] } } })
    await prisma.shop.deleteMany({ where: { id: { in: [shopA.id, shopB.id] } } })
    console.log(`\n  Cleaned up ${tag}`)
  }
  console.log(`\n=== ${pass} passed, ${fail} failed ===`)
  process.exit(fail > 0 ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
