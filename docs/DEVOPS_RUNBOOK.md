# 🛠️ Sarvam Management — DevOps, CI/CD & Monitoring Runbook

This runbook documents the production operational procedures, monitoring configuration, continuous integration, and disaster recovery processes for Sarvam Management.

---

## 1. 💓 Health Monitoring & Self-Healing Probes

### Endpoint: `GET /api/health`
* **Purpose**: Verified probe for external uptime monitors (UptimeRobot, BetterStack, StatusCake) and Docker container healthchecks.
* **HTTP 200**: Database connected, memory stable, configuration verified (`status: "healthy"`).
* **HTTP 503**: Database down or pool connection timeout (`status: "unhealthy"`).

### How to set up 24/7 Free Uptime Monitoring:
1. Sign up for a free account at [UptimeRobot](https://uptimerobot.com) or [BetterStack](https://betterstack.com).
2. Click **"Add New Monitor"**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Sarvam Production Health`
   - **URL**: `https://<your-domain>/api/health`
   - **Monitoring Interval**: `5 minutes`
3. If the database or server ever experiences downtime, UptimeRobot will instantly alert you via Email / Telegram / SMS.

---

## 2. 🚨 Sentry Error Tracking & Structured Logging

### Sentry Setup (1-Minute Configuration):
1. Create a free project at [Sentry.io](https://sentry.io).
2. Copy your **Client Keys (DSN)** (e.g. `https://xyz@o123.ingest.sentry.io/456`).
3. Add it to your `.env` or Vercel Environment Variables:
   ```env
   SENTRY_DSN=https://xyz@o123.ingest.sentry.io/456
   ```
4. The system automatically routes all uncaught exceptions, critical security alerts (SIM swap, spoofing attempts), and failed database transactions directly to your Sentry dashboard without slowing down client requests.

### Structured JSON Logging:
All server actions use `src/lib/logger.ts` which automatically:
- Formats production logs as searchable JSON objects.
- Automatically redacts sensitive fields (`password`, `token`, `secret`, `deviceToken`, `enrollmentKey`).

---

## 3. 📦 Automated Database Backup & Disaster Recovery

### Manual Backup (1-Click CLI):
Run this command anytime to generate a timestamped snapshot of all tables with SHA-256 verification:
```bash
npm run db:backup
```
* **Output Path**: `backups/sarvam_backup_YYYY-MM-DD_HHmmss.json`
* **Retention Policy**: Automatically keeps the **14 most recent backups** and safely prunes older files.

### Scheduling Daily Automated Backups:
* **Linux / VPS (Cron)**:
  Run every day at 2:00 AM:
  ```bash
  0 2 * * * cd /path/to/sarvam && npm run db:backup >> /var/log/sarvam_backup.log 2>&1
  ```
* **Windows Task Scheduler**:
  Create a scheduled task running `npm.cmd run db:backup` inside the project folder daily.

---

## 4. 🚀 CI/CD Pipeline (GitHub Actions)

The workflow is configured in `.github/workflows/ci.yml`:
* **Triggers**: On every push and pull request to `main`.
* **Stage 1 (Lint & Code Quality)**: Validates ESLint rules with 0 errors.
* **Stage 2 (Production Build)**: Compiles Next.js 16 (Turbopack) and checks TypeScript across all 23 routes.
* **Stage 3 (Automated Test Suite)**: Runs 46/46 API integration tests and database triggers.

---

## 5. 🐳 Docker & Self-Hosted Hosting (Oracle Cloud / VPS)

Whenever scaling beyond Vercel's free tier:
1. Build the standalone image:
   ```bash
   docker compose build
   ```
2. Start the container in background:
   ```bash
   docker compose up -d
   ```
3. Test health:
   ```bash
   curl http://localhost:3000/api/health
   ```
