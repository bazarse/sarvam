import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔒 Applying PostgreSQL triggers and security rules...')

  // Statement 1: Create or replace function
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION deny_auditlog_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'AuditLog is append-only: % is not allowed', TG_OP;
    END;
    $$ LANGUAGE plpgsql;
  `
  await prisma.$executeRawUnsafe(createFunctionSql)
  console.log('  ✓ Function deny_auditlog_mutation() created.')

  // Statement 2: Drop existing triggers if present
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS auditlog_no_update ON "AuditLog"')
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS auditlog_no_delete ON "AuditLog"')
  console.log('  ✓ Cleaned up any existing triggers.')

  // Statement 3: Create BEFORE UPDATE trigger
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER auditlog_no_update
      BEFORE UPDATE ON "AuditLog"
      FOR EACH ROW EXECUTE FUNCTION deny_auditlog_mutation()
  `)
  console.log('  ✓ Created trigger auditlog_no_update.')

  // Statement 4: Create BEFORE DELETE trigger
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER auditlog_no_delete
      BEFORE DELETE ON "AuditLog"
      FOR EACH ROW EXECUTE FUNCTION deny_auditlog_mutation()
  `)
  console.log('  ✓ Created trigger auditlog_no_delete.')

  console.log('✅ All PostgreSQL triggers applied successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Failed to apply triggers:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
