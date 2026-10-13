// Error Monitoring & Exception Tracking (Sentry & APM ready).
// Automatically captures runtime exceptions and pushes them to Sentry
// or logs them via structured logger if SENTRY_DSN is not configured.

import { logger } from '@/lib/logger'

interface MonitoringContext {
  userId?: string
  shopId?: string
  imei1?: string
  endpoint?: string
  action?: string
  extra?: Record<string, unknown>
}

export async function reportException(
  error: unknown,
  context?: MonitoringContext
): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim()

  logger.error(
    error instanceof Error ? error.message : 'Application exception',
    error,
    context as Record<string, unknown>
  )

  if (!dsn) {
    // Sentry not configured - logger already recorded the event
    return
  }

  try {
    // Lightweight Sentry HTTP reporting without heavy SDK bundle dependencies
    // Allows instant drop-in Sentry integration by setting SENTRY_DSN in .env
    const url = new URL(dsn)
    const projectId = url.pathname.replace('/', '')
    const key = url.username
    const sentryEndpoint = `https://${url.host}/api/${projectId}/store/?sentry_key=${key}&sentry_version=7`

    const payload = {
      event_id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString().slice(0, 19),
      platform: 'javascript',
      level: 'error',
      logger: 'sarvam-management',
      message: error instanceof Error ? error.message : String(error),
      exception: {
        values: [
          {
            type: error instanceof Error ? error.name : 'Error',
            value: error instanceof Error ? error.message : String(error),
            stacktrace: error instanceof Error && error.stack ? { frames: [{ filename: 'server', function: 'route' }] } : undefined,
          },
        ],
      },
      tags: {
        environment: process.env.NODE_ENV || 'production',
        ...(context?.shopId ? { shopId: context.shopId } : {}),
        ...(context?.action ? { action: context.action } : {}),
      },
      user: context?.userId ? { id: context.userId } : undefined,
    }

    await fetch(sentryEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=sarvam/1.0`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch {
    // Failure to reach Sentry must never crash the main application request
  }
}

export function reportSecurityAlert(
  title: string,
  context?: MonitoringContext
): void {
  logger.security(title, context as Record<string, unknown>)
}
