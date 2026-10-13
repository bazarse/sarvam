import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestSummary {
  name: string
  status: 'PASS' | 'FAIL'
  details?: string
}

const results: TestSummary[] = []

function record(name: string, ok: boolean, details?: string) {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', details })
  const icon = ok ? '✅' : '❌'
  console.log(`${icon} [${ok ? 'PASS' : 'FAIL'}] ${name}${details ? ` -> ${details}` : ''}`)
}

async function verify() {
  console.log('\n======================================================')
  console.log('🚀 RUNNING 100% PRODUCTION DATABASE & SCHEMA VERIFIER')
  console.log('======================================================\n')

  // 1. Connection check
  try {
    const t0 = performance.now()
    const [{ now, version }] = await prisma.$queryRaw<[{ now: Date; version: string }]>`
      SELECT NOW() as now, version() as version
    `
    const latencyMs = Math.round(performance.now() - t0)
    record('PostgreSQL Connection & Latency', true, `${latencyMs}ms | Version: ${version.split(' ')[0]} ${version.split(' ')[1]}`)
  } catch (err: any) {
    record('PostgreSQL Connection', false, err.message)
    process.exit(1)
  }

  // 2. Verify all models can be queried and new columns exist
  try {
    const shop = await prisma.shop.findFirst({ select: { id: true, isActive: true, maxDevices: true } })
    record('Model Shop: schema fields verified', true, `isActive: ${shop?.isActive ?? 'none'}, maxDevices: ${shop?.maxDevices ?? 'none'}`)

    const user = await prisma.user.findFirst({ select: { id: true, role: true, isActive: true } })
    record('Model User: schema fields verified', true, `role: ${user?.role ?? 'none'}, isActive: ${user?.isActive ?? 'none'}`)

    const device = await prisma.device.findFirst({
      select: { id: true, status: true, appVersion: true, androidVersion: true, notes: true },
    })
    record('Model Device: enterprise telemetry & status fields verified', true, `status: ${device?.status ?? 'none'}`)

    const emi = await prisma.emiSchedule.findFirst({
      select: { id: true, transactionId: true, collectedBy: true, status: true },
    })
    record('Model EmiSchedule: payment tracking fields verified', true, `status: ${emi?.status ?? 'none'}`)

    const log = await prisma.deviceActivityLog.findFirst({
      select: { id: true, metadata: true, activityType: true },
    })
    record('Model DeviceActivityLog: metadata field verified', true, `type: ${log?.activityType ?? 'none'}`)
  } catch (err: any) {
    record('Model field verification', false, err.message)
  }

  // 3. Verify PostgreSQL Indexes in pg_indexes
  try {
    const indexes = await prisma.$queryRaw<Array<{ tablename: string; indexname: string; indexdef: string }>>`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `
    const indexNames = indexes.map((i) => i.indexname)

    const expectedPatterns = [
      'Device_shopId',
      'Device_isLocked',
      'Device_status',
      'Device_customerPhone',
      'EmiSchedule_deviceId_installmentNo',
      'EmiSchedule_status_dueDate',
      'EmiSchedule_paidAt',
      'DeviceActivityLog_deviceId_timestamp',
      'AuditLog_targetType_targetId_createdAt',
    ]

    for (const pat of expectedPatterns) {
      const found = indexNames.some((idx) => idx.includes(pat) || idx.toLowerCase().includes(pat.toLowerCase()))
      record(`Index Pattern '${pat}'`, found, found ? 'Active in Postgres' : 'Missing from pg_indexes')
    }
  } catch (err: any) {
    record('PostgreSQL index catalog inspection', false, err.message)
  }

  // 4. Test Append-Only Trigger on AuditLog
  try {
    // A. Insertion must succeed
    const auditEntry = await prisma.auditLog.create({
      data: {
        actorId: 'system:verification',
        actorName: 'VerifierScript',
        actorRole: 'SYSTEM',
        shopId: 'system',
        action: 'VERIFY_DB',
        targetType: 'SYSTEM',
        targetId: 'db-test',
        reason: 'Automated verification check',
      },
    })
    record('AuditLog INSERT allowed', true, `Created audit id: ${auditEntry.id}`)

    // B. UPDATE must be rejected by PostgreSQL trigger
    let updateBlocked = false
    try {
      await prisma.auditLog.update({
        where: { id: auditEntry.id },
        data: { reason: 'tampered reason' },
      })
    } catch (err: any) {
      if (err.message.includes('AuditLog is append-only') || err.message.includes('P0001')) {
        updateBlocked = true
      }
    }
    record('AuditLog UPDATE rejected by trigger (P0001)', updateBlocked)

    // C. DELETE must be rejected by PostgreSQL trigger
    let deleteBlocked = false
    try {
      await prisma.auditLog.delete({
        where: { id: auditEntry.id },
      })
    } catch (err: any) {
      if (err.message.includes('AuditLog is append-only') || err.message.includes('P0001')) {
        deleteBlocked = true
      }
    }
    record('AuditLog DELETE rejected by trigger (P0001)', deleteBlocked)
  } catch (err: any) {
    record('AuditLog trigger defense-in-depth test', false, err.message)
  }

  // 5. Test Unique Constraint on [deviceId, installmentNo]
  try {
    const testShop = await prisma.shop.create({
      data: { shopName: 'Test Integrity Shop', phone: '9999900000' },
    })
    const testDev = await prisma.device.create({
      data: {
        imei1: `TEST_${Date.now()}`,
        customerName: 'Test Customer',
        customerPhone: '9999900000',
        deviceModel: 'Test Device',
        shopId: testShop.id,
      },
    })

    // Installment 1
    await prisma.emiSchedule.create({
      data: {
        deviceId: testDev.id,
        installmentNo: 1,
        dueDate: new Date(),
        amount: 1000,
      },
    })

    // Duplicate Installment 1 should throw P2002
    let duplicateRejected = false
    try {
      await prisma.emiSchedule.create({
        data: {
          deviceId: testDev.id,
          installmentNo: 1,
          dueDate: new Date(),
          amount: 1000,
        },
      })
    } catch (err: any) {
      if (err.code === 'P2002' || err.message.includes('unique constraint') || err.message.includes('Unique constraint failed')) {
        duplicateRejected = true
      }
    }
    record('EmiSchedule duplicate (deviceId, installmentNo) rejected (P2002)', duplicateRejected)

    // 6. Test Cascade Deletion
    await prisma.device.delete({ where: { id: testDev.id } })
    const remainingEmis = await prisma.emiSchedule.count({ where: { deviceId: testDev.id } })
    record('Cascade Deletion (Device -> EmiSchedule)', remainingEmis === 0, `Remaining: ${remainingEmis}`)

    // Cleanup test shop
    await prisma.shop.delete({ where: { id: testShop.id } })
  } catch (err: any) {
    record('Integrity & cascade test', false, err.message)
  }

  // Summary
  console.log('\n======================================================')
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  console.log(`📊 SUMMARY: ${passed}/${total} checks passed (${failed} failed)`)
  if (failed === 0) {
    console.log('🎉 DATABASE & SCHEMA IS 100% PRODUCTION READY!')
  }
  console.log('======================================================\n')
  process.exit(failed > 0 ? 1 : 0)
}

verify().catch((e) => {
  console.error('Fatal verification error:', e)
  process.exit(1)
}).finally(() => {
  prisma.$disconnect()
})
