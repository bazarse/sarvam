import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Sarvam Management database seed...')

  // Clean existing demo data
  await prisma.deviceActivityLog.deleteMany()
  await prisma.emiSchedule.deleteMany()
  await prisma.device.deleteMany()
  await prisma.shop.deleteMany()

  // 1. Create Default Retailer Shop
  const shop = await prisma.shop.create({
    data: {
      shopName: 'Sarvam Management',
      ownerName: 'Admin Partner',
      phone: '9876543210',
      email: 'support@sarvam.com',
      upiId: 'sarvam@upi',
      address: 'Shop 12, Mobile Market, Delhi NCR',
    },
  })
  console.log(`✅ Created Shop: ${shop.shopName}`)

  // 2. Create Sample Devices
  const devices = [
    {
      imei1: '867543029182736',
      customerName: 'Rahul Sharma',
      customerPhone: '9811122334',
      customerAadhaar: 'XXXX-XXXX-1234',
      deviceModel: 'Samsung Galaxy A15',
      brand: 'Samsung',
      isLocked: false,
      batteryLevel: 91,
      isOnline: true,
      lastKnownLat: 28.6139,
      lastKnownLng: 77.2090,
      simIccid: '8991000123456789012',
      simOperator: 'Jio 5G',
      offlineTimerHours: 48,
      totalLoanAmount: 15000,
      emiAmount: 2500,
      totalEmis: 6,
      paidEmis: 3,
      shopId: shop.id,
      emis: [
        { no: 1, amount: 2500, status: 'PAID', mode: 'CASH', dateOffsetDays: -60 },
        { no: 2, amount: 2500, status: 'PAID', mode: 'UPI', dateOffsetDays: -30 },
        { no: 3, amount: 2500, status: 'PAID', mode: 'CASH', dateOffsetDays: -1 },
        { no: 4, amount: 2500, status: 'PENDING', mode: null, dateOffsetDays: 29 },
        { no: 5, amount: 2500, status: 'PENDING', mode: null, dateOffsetDays: 59 },
        { no: 6, amount: 2500, status: 'PENDING', mode: null, dateOffsetDays: 89 },
      ],
      logs: [
        { type: 'CASH_PAID', details: 'EMI 3 collected in Cash ₹2500 at shop counter' },
        { type: 'LOCATION_UPDATE', details: 'Lat 28.6139, Lng 77.2090' },
      ],
    },
    {
      imei1: '861234059876543',
      customerName: 'Amit Patel',
      customerPhone: '9822233445',
      customerAadhaar: 'XXXX-XXXX-5678',
      deviceModel: 'Redmi 13C 5G',
      brand: 'Xiaomi',
      isLocked: true,
      lockMessage: 'ईएमआई बकाया: कृपया सर्वम मैनेजमेंट पर ₹1,800 जमा करें। फोन तुरंत अनलॉक हो जाएगा।',
      batteryLevel: 42,
      isOnline: true,
      lastKnownLat: 28.5355,
      lastKnownLng: 77.3910,
      simIccid: '8991000987654321098',
      simOperator: 'Airtel',
      offlineTimerHours: 48,
      totalLoanAmount: 10800,
      emiAmount: 1800,
      totalEmis: 6,
      paidEmis: 2,
      shopId: shop.id,
      emis: [
        { no: 1, amount: 1800, status: 'PAID', mode: 'CASH', dateOffsetDays: -60 },
        { no: 2, amount: 1800, status: 'PAID', mode: 'CASH', dateOffsetDays: -30 },
        { no: 3, amount: 1800, status: 'OVERDUE', mode: null, dateOffsetDays: -5 },
        { no: 4, amount: 1800, status: 'PENDING', mode: null, dateOffsetDays: 25 },
        { no: 5, amount: 1800, status: 'PENDING', mode: null, dateOffsetDays: 55 },
        { no: 6, amount: 1800, status: 'PENDING', mode: null, dateOffsetDays: 85 },
      ],
      logs: [
        { type: 'LOCK', details: 'Device locked automatically due to overdue EMI 3' },
        { type: 'SIM_REMOVED', details: 'SIM card temporarily removed' },
      ],
    },
    {
      imei1: '869876543210987',
      customerName: 'Priya Verma',
      customerPhone: '9833344556',
      customerAadhaar: 'XXXX-XXXX-9012',
      deviceModel: 'Realme C53',
      brand: 'Realme',
      isLocked: false,
      gracePeriodDays: 2,
      batteryLevel: 76,
      isOnline: true,
      lastKnownLat: 28.7041,
      lastKnownLng: 77.1025,
      simIccid: '8991000456789012345',
      simOperator: 'Jio 5G',
      offlineTimerHours: 48,
      totalLoanAmount: 12000,
      emiAmount: 2000,
      totalEmis: 6,
      paidEmis: 1,
      shopId: shop.id,
      emis: [
        { no: 1, amount: 2000, status: 'PAID', mode: 'UPI', dateOffsetDays: -30 },
        { no: 2, amount: 2000, status: 'PENDING', mode: null, dateOffsetDays: 1 },
        { no: 3, amount: 2000, status: 'PENDING', mode: null, dateOffsetDays: 31 },
        { no: 4, amount: 2000, status: 'PENDING', mode: null, dateOffsetDays: 61 },
        { no: 5, amount: 2000, status: 'PENDING', mode: null, dateOffsetDays: 91 },
        { no: 6, amount: 2000, status: 'PENDING', mode: null, dateOffsetDays: 121 },
      ],
      logs: [
        { type: 'WARNING', details: 'Payment reminder heads-up sent for EMI 2' },
      ],
    },
  ]

  const now = new Date()

  for (const d of devices) {
    const { emis, logs, ...deviceData } = d
    const createdDevice = await prisma.device.create({
      data: deviceData,
    })

    // Create EMI Schedules
    for (const e of emis) {
      const dueDate = new Date(now.getTime() + e.dateOffsetDays * 24 * 60 * 60 * 1000)
      await prisma.emiSchedule.create({
        data: {
          deviceId: createdDevice.id,
          installmentNo: e.no,
          dueDate,
          amount: e.amount,
          status: e.status,
          paymentMode: e.mode,
          paidAt: e.status === 'PAID' ? dueDate : null,
          receiptNumber: e.status === 'PAID' ? `REC-${createdDevice.imei1.slice(-4)}-${e.no}` : null,
        },
      })
    }

    // Create Activity Logs
    for (const log of logs) {
      await prisma.deviceActivityLog.create({
        data: {
          deviceId: createdDevice.id,
          activityType: log.type,
          details: log.details,
        },
      })
    }

    console.log(`✅ Seeded device: ${createdDevice.customerName} (${createdDevice.deviceModel})`)
  }

  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
