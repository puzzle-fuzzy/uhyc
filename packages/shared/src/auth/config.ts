/**
 * Shared auth config — used by both front-end apps and the gateway logic.
 *
 * Central login (auth) flow:
 *   generate (5174) → not logged in → redirect to auth (5173)?cb=<self>
 *   auth login success → if cb is in the whitelist, redirect back to cb.
 */

/** Query-string parameter carrying the post-login return URL. */
export const CB_PARAM = 'cb'

/**
 * Origins allowed as a post-login callback target. Anything else is rejected
 * to prevent open-redirect abuse.
 *
 * In production, set these via `VITE_ALLOWED_CB_ORIGINS` (comma-separated).
 */
function allowedCbOrigins(): string[] {
  const fromEnv = (import.meta as unknown as { env?: Record<string, string> })
    .env?.VITE_ALLOWED_CB_ORIGINS
  if (fromEnv) return fromEnv.split(',').map((s) => s.trim()).filter(Boolean)

  // Sensible dev defaults — both front-end apps on localhost.
  return [
    'http://localhost:5173',
    'http://localhost:5174',
  ]
}

/** Dev URLs of each app (override with VITE_* in prod). */
export const AUTH_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_AUTH_URL ?? 'http://localhost:5173'

export const GENERATE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_GENERATE_URL ?? 'http://localhost:5174'

/**
 * Validate a callback URL against the whitelist.
 * Accepts absolute URLs whose origin is allow-listed, AND same-origin relative
 * paths (e.g. "/dashboard"). Rejects everything else.
 */
export function isAllowedCallback(raw: string | null | undefined): boolean {
  if (!raw) return false

  // Relative same-origin paths are always safe.
  if (raw.startsWith('/') && !raw.startsWith('//')) return true

  try {
    const url = new URL(raw)
    return allowedCbOrigins().includes(`${url.protocol}//${url.host}`)
  } catch {
    return false
  }
}

/** Build a login redirect to the auth app with a `cb` param back to `returnTo`. */
export function buildLoginUrl(returnTo: string): string {
  const cb = encodeURIComponent(returnTo)
  return `${AUTH_URL}/?${CB_PARAM}=${cb}`
}
