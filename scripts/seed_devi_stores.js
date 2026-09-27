const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Setting up Devi Mobile & Accessories Stores in Supabase ---');

  // Update or create Branch 1
  const existingShop = await prisma.shop.findFirst();
  let shop1;
  if (existingShop) {
    shop1 = await prisma.shop.update({
      where: { id: existingShop.id },
      data: {
        shopName: 'Devi Mobile & Accessories (Main Branch)',
        ownerName: 'Devi Lal',
        phone: '9876543210',
        email: 'devimobile.main@gmail.com',
        address: 'Shop 14, Near Clock Tower, Main Market',
      }
    });
  } else {
    shop1 = await prisma.shop.create({
      data: {
        shopName: 'Devi Mobile & Accessories (Main Branch)',
        ownerName: 'Devi Lal',
        phone: '9876543210',
        email: 'devimobile.main@gmail.com',
        address: 'Shop 14, Near Clock Tower, Main Market',
      }
    });
  }

  // Check if Branch 2 exists, else create it
  let shop2 = await prisma.shop.findFirst({
    where: { shopName: { contains: 'Station' } }
  });
  if (!shop2) {
    shop2 = await prisma.shop.create({
      data: {
        shopName: 'Devi Mobile & Accessories (Station Branch)',
        ownerName: 'Devi Lal (Branch 2)',
        phone: '9123456789',
        email: 'devimobile.station@gmail.com',
        address: 'Opp. Railway Station, Station Road',
      }
    });
  }

  // Update existing devices: Assign Rahul & Priya to Shop 1, Amit to Shop 2
  const devices = await prisma.device.findMany();
  for (let i = 0; i < devices.length; i++) {
    const assignedShopId = i === 1 ? shop2.id : shop1.id;
    await prisma.device.update({
      where: { id: devices[i].id },
      data: { shopId: assignedShopId }
    });
  }

  console.log('✅ Stores and customer devices updated successfully!');
  const allShops = await prisma.shop.findMany({ include: { _count: { select: { devices: true } } } });
  console.log(JSON.stringify(allShops, null, 2));
}

main()
  .catch((e) => {
    console.error('Error seeding stores:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
