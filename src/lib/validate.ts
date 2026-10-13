// Small input validation helpers shared by API routes.

// IMEI / device identifier sent by the Android app. Real IMEIs are 15 digits,
// but some devices fall back to other identifiers, so allow a safe charset.
export function isValidDeviceId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value)
}

export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function toLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = toFiniteNumber(lat)
  const lo = toFiniteNumber(lng)
  if (la === null || lo === null) return null
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null
  return { lat: la, lng: lo }
}

export function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

// Add calendar months without overflowing into the next month
// (e.g. Jan 31 + 1 month = Feb 28/29, not Mar 3).
export function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function maskAadhaar(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  return digits.length >= 4 ? `XXXX-XXXX-${digits.slice(-4)}` : 'XXXX'
}
