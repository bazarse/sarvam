import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Enterprise Healthcheck & Telemetry Endpoint.
// Monitored by UptimeRobot / BetterStack / Docker healthcheck probes.
// Returns 200 when database and core systems are healthy.
// Returns 503 if the database is unreachable.
export async function GET() {
  const startTime = performance.now()
  try {
    // Ping PostgreSQL to verify database connectivity and pool health
    await prisma.$queryRaw`SELECT 1`
    const dbLatencyMs = Math.round(performance.now() - startTime)

    const mem = process.memoryUsage()
    const memoryMb = {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    }

    const configSanity = {
      database: !!process.env.DATABASE_URL,
      sessionAuth: !!(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD),
      cronSecret: !!process.env.CRON_SECRET,
      fcmPush: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      sentryMonitoring: !!process.env.SENTRY_DSN,
    }

    const isHealthy = dbLatencyMs < 2000

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        version: '0.1.0-production',
        environment: process.env.NODE_ENV || 'production',
        database: {
          status: 'connected',
          latencyMs: dbLatencyMs,
          engine: 'PostgreSQL 17 (Prisma Pooler)',
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memoryMb,
        },
        services: configSanity,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database connection error'
    console.error('[healthcheck] System unhealthy:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
          error: errorMessage,
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  }
}
