// Create or update a dashboard user (OWNER or STAFF) for a shop.
// Additive and safe to run against the live database — it never deletes data.
//
// Usage (PowerShell):
//   npx tsx scripts/create_user.ts --username owner1 --password "secret" --role OWNER --shop <shopId>
//   npx tsx scripts/create_user.ts --username staff1 --password "secret" --role STAFF --shop <shopId>
//
// If --shop is omitted and exactly one shop exists, that shop is used.
// If the username already exists, its password/role/shop are updated.

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const username = arg('username')
  const password = arg('password')
  const role = (arg('role') ?? 'OWNER').toUpperCase()
  let shopId = arg('shop')

  if (!username || !password) {
    console.error('Usage: tsx scripts/create_user.ts --username <u> --password <p> [--role OWNER|STAFF] [--shop <shopId>]')
    process.exit(1)
  }
  if (role !== 'OWNER' && role !== 'STAFF') {
    console.error('--role must be OWNER or STAFF')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  if (!shopId) {
    const shops = await prisma.shop.findMany({ select: { id: true, shopName: true } })
    if (shops.length === 0) {
      console.error('No shops exist. Create a shop first.')
      process.exit(1)
    }
    if (shops.length > 1) {
      console.error('Multiple shops exist. Pass --shop <shopId>. Available:')
      shops.forEach((s) => console.error(`  ${s.id}  ${s.shopName}`))
      process.exit(1)
    }
    shopId = shops[0].id
  } else {
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } })
    if (!shop) {
      console.error(`Shop ${shopId} not found`)
      process.exit(1)
    }
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role, shopId, isActive: true },
    create: { username, passwordHash, role, shopId },
  })

  console.log(`✅ User ready: ${user.username} (${user.role}) for shop ${user.shopId}`)
}

main()
  .catch((e) => {
    console.error('Error creating user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
