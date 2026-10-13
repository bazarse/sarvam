import { PrismaClient } from '@prisma/client'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()
const BACKUPS_DIR = path.join(process.cwd(), 'backups')
const MAX_BACKUPS_TO_RETAIN = 14

async function runDatabaseBackup() {
  const startTime = Date.now()
  console.log('======================================================')
  console.log('📦 STARTING AUTOMATED DATABASE BACKUP')
  console.log('======================================================')

  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true })
  }

  try {
    console.log('⏳ Fetching table snapshots from PostgreSQL...')

    const [shops, users, devices, emiSchedules, activityLogs, auditLogs] = await Promise.all([
      prisma.shop.findMany({ orderBy: { id: 'asc' } }),
      prisma.user.findMany({ orderBy: { id: 'asc' } }),
      prisma.device.findMany({ orderBy: { id: 'asc' } }),
      prisma.emiSchedule.findMany({ orderBy: { id: 'asc' } }),
      prisma.deviceActivityLog.findMany({ orderBy: { id: 'asc' } }),
      prisma.auditLog.findMany({ orderBy: { id: 'asc' } }),
    ])

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      metadata: {
        shopCount: shops.length,
        userCount: users.length,
        deviceCount: devices.length,
        emiScheduleCount: emiSchedules.length,
        activityLogCount: activityLogs.length,
        auditLogCount: auditLogs.length,
      },
      tables: {
        shops,
        users,
        devices,
        emiSchedules,
        activityLogs,
        auditLogs,
      },
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const checksum = createHash('sha256').update(jsonString).digest('hex')

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFileName = `sarvam_backup_${dateStr}.json`
    const backupFilePath = path.join(BACKUPS_DIR, backupFileName)

    fs.writeFileSync(backupFilePath, jsonString, 'utf-8')

    const fileSizeKb = Math.round(fs.statSync(backupFilePath).size / 1024)
    const durationMs = Date.now() - startTime

    console.log(`✅ Backup successfully created: ${backupFileName}`)
    console.log(`📊 Backup Stats:`)
    console.log(`   - File Size: ${fileSizeKb} KB`)
    console.log(`   - Shops: ${shops.length}`)
    console.log(`   - Users: ${users.length}`)
    console.log(`   - Devices: ${devices.length}`)
    console.log(`   - EMI Records: ${emiSchedules.length}`)
    console.log(`   - Audit Records: ${auditLogs.length}`)
    console.log(`   - SHA-256 Checksum: ${checksum.slice(0, 16)}...`)
    console.log(`   - Completed in: ${durationMs}ms`)

    // Retention policy: prune older backups beyond limit
    const existingBackups = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('sarvam_backup_') && f.endsWith('.json'))
      .sort()

    if (existingBackups.length > MAX_BACKUPS_TO_RETAIN) {
      const toDelete = existingBackups.slice(0, existingBackups.length - MAX_BACKUPS_TO_RETAIN)
      for (const oldFile of toDelete) {
        fs.unlinkSync(path.join(BACKUPS_DIR, oldFile))
        console.log(`🧹 Pruned old backup: ${oldFile}`)
      }
    }

    console.log('======================================================')
    console.log('🎉 DATABASE BACKUP COMPLETED SUCCESSFULLY!')
    console.log('======================================================')
  } catch (error) {
    console.error('❌ Database backup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runDatabaseBackup()
