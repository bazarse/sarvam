// Enterprise Structured Logger with Automatic PII & Secret Redaction.
// Formats logs into searchable JSON in production and readable output in dev.

type LogLevel = 'info' | 'warn' | 'error' | 'security'

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'devicetoken',
  'devicetokenhash',
  'token',
  'secret',
  'authorization',
  'key',
  'enrollmentkey',
  'enrollmentkeyhash',
  'cookie',
])

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(sanitize)
  }
  if (typeof value === 'object') {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        clean[k] = '[REDACTED]'
      } else {
        clean[k] = sanitize(v)
      }
    }
    return clean
  }
  return String(value)
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
  const timestamp = new Date().toISOString()
  const errorDetails = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error ? { message: String(error) } : undefined

  const payload = {
    timestamp,
    level,
    message,
    ...(context ? { context: sanitize(context) } : {}),
    ...(errorDetails ? { error: errorDetails } : {}),
  }

  const isProd = process.env.NODE_ENV === 'production'

  if (level === 'error') {
    if (isProd) {
      console.error(JSON.stringify(payload))
    } else {
      console.error(`[${timestamp}] ❌ ERROR: ${message}`, context || '', error || '')
    }
  } else if (level === 'warn') {
    if (isProd) {
      console.warn(JSON.stringify(payload))
    } else {
      console.warn(`[${timestamp}] ⚠️ WARN: ${message}`, context || '')
    }
  } else if (level === 'security') {
    if (isProd) {
      console.warn(JSON.stringify({ ...payload, alertType: 'SECURITY_INCIDENT' }))
    } else {
      console.warn(`[${timestamp}] 🚨 SECURITY ALERT: ${message}`, context || '')
    }
  } else {
    if (isProd) {
      console.log(JSON.stringify(payload))
    } else {
      console.log(`[${timestamp}] ℹ️ INFO: ${message}`, context || '')
    }
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => log('error', message, context, error),
  security: (message: string, context?: Record<string, unknown>) => log('security', message, context),
}
