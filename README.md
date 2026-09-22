# Sarvam Management — Enterprise EMI Locker & MDM Web Dashboard

An enterprise-grade, mobile-responsive Web Dashboard and REST API Backend for **Sarvam Management** Android EMI Locker & Device Security MDM.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **Supabase PostgreSQL**. Designed for seamless 1-click deployment on **Vercel**.

---

## 🌟 Key Features

1. **💵 Manual Shopkeeper Cash Counter (No Auto-Debit / No NACH):**
   - Direct `[ 💵 Mark Paid & Unlock ]` button for collecting cash at the shop counter.
   - Automatically marks installment paid, creates a digital receipt, and **instantly unlocks the customer phone**.
2. **🔒 Instant 1-Click Remote Lock & Unlock:**
   - Enforce lockdown with custom Hindi/English instructions and dynamic UPI QR code.
   - 1-click remote unlock.
3. **🔊 Remote Anti-Theft Siren Alarm:**
   - Overrides Silent & Do Not Disturb (DND) modes at 100% volume with SOS vibration.
4. **⏳ +2 Days Grace Period Extension:**
   - Extend customer due date without locking the phone when a customer requests extra time.
5. **🗺️ Live Device Fleet Map:**
   - OpenStreetMap / Leaflet real-time GPS coordinates of customer phones.
6. **📲 Android Enterprise Zero-Touch QR Provisioning:**
   - Dynamic QR code generator for 6-tap factory-reset setup on new phones.
7. **⚡ 100% Free Forever Architecture:**
   - Optimized in-place database telemetry updates — easily handles up to 50,000 devices within Supabase's free 500 MB tier.

---

## 🚀 1-Click Vercel Deployment

1. Go to [Vercel](https://vercel.com) and click **"Add New Project"** ➔ **"Import Git Repository"**.
2. Select **`bazarse/sarvam`**.
3. Under **Environment Variables**, add:
   - `DATABASE_URL`: `postgresql://postgres:Harshita%401920@db.bllpvafybywekxzpffrr.supabase.co:5432/postgres`
   - `DIRECT_URL`: `postgresql://postgres:Harshita%401920@db.bllpvafybywekxzpffrr.supabase.co:5432/postgres`
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://bllpvafybywekxzpffrr.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<Your Supabase Anon Key>`
4. Click **Deploy**! Your dashboard will be live at `https://sarvam.vercel.app` in under 60 seconds.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma db push

# Seed demo devices
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.
