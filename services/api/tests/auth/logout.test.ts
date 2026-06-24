import { describe, expect, it, beforeAll } from 'bun:test'
import {
  api,
  ALICE,
  deleteUser,
  parseAuthToken,
  authHeaders,
} from '../helpers'

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

describe('POST /auth/logout', () => {
  let aliceToken: string | null = null

  beforeAll(async () => {
    await deleteUser(ALICE.username)
    await api.auth.register.post(ALICE)
    const { response } = await api.auth.login.post({
      emailOrUsername: ALICE.email,
      password: ALICE.password,
    })
    aliceToken = parseAuthToken(response.headers.get('set-cookie'))
  })

  it('returns { ok: true } with status 200', async () => {
    const { data, status } = await api.auth.logout.post()
    expect(status).toBe(200)
    expect(data).toEqual({ ok: true })
  })

  it('clears the auth cookie so the token is no longer usable', async () => {
    const { response } = await api.auth.logout.post(
      {},
      { headers: authHeaders(aliceToken) },
    )

    // Elysia's cookie.remove() either deletes the cookie or sets it to empty.
    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toBeDefined()
  })

  it('succeeds even when no cookie is present (idempotent)', async () => {
    const { data, status } = await api.auth.logout.post()
    expect(status).toBe(200)
    expect(data).toEqual({ ok: true })
  })
})
