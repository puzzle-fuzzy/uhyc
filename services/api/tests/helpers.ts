import app, { type App } from '../src/index'
import { treaty } from '@elysia/eden'
import { db, table } from '@uhyc/db'
import { eq } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Eden treaty client
// ---------------------------------------------------------------------------

export const api = treaty<App>(app)

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/** Extract the token from a `Set-Cookie: auth=<jwt>; ...` header. */
export function parseAuthToken(header: string | null): string | null {
  if (!header) return null
  const m = header.match(/^auth=([^;]+)/)
  return m ? m[1] : null
}

/** Build request headers that send the auth cookie. */
export function authHeaders(
  token: string | null,
): Record<string, string> | undefined {
  if (!token) return undefined
  return { cookie: `auth=${token}` }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

export const ALICE = {
  username: 'alice_test',
  email: 'alice_test@uhyc.test',
  password: 'TestPass123!',
} as const

export const BOB = {
  username: 'bob_test',
  email: 'bob_test@uhyc.test',
  password: 'TestPass456!',
} as const

// ---------------------------------------------------------------------------
// Database cleanup
// ---------------------------------------------------------------------------

/** Remove a test user by username. */
export async function deleteUser(username: string) {
  await db.delete(table.users).where(eq(table.users.username, username))
}

/** Remove all shared fixture users in one shot. */
export async function cleanupAll() {
  await Promise.all([deleteUser(ALICE.username), deleteUser(BOB.username)])
}
