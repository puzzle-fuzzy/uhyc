import { describe, expect, it, beforeAll } from 'bun:test'
import {
  api,
  ALICE,
  deleteUser,
  parseAuthToken,
  authHeaders,
} from '../helpers'

// ---------------------------------------------------------------------------
// GET /auth/me — requires valid auth cookie
// ---------------------------------------------------------------------------

describe('GET /auth/me', () => {
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

  it('returns the authenticated user profile', async () => {
    const { data, status } = await api.auth.me.get({
      headers: authHeaders(aliceToken),
    })

    expect(status).toBe(200)
    expect(data).not.toBeNull()

    const { user } = data!
    expect(typeof user.id).toBe('string')
    expect(user.username).toBe(ALICE.username)
    expect(user.email).toBe(ALICE.email)
    expect(user.role).toBe('user')
    expect(user.avatar).toBeNull()
    // lastLoginAt should be set after login; accept both string and Date
    expect(user.lastLoginAt).toBeTruthy()
    expect(
      new Date(user.lastLoginAt as string | Date).getTime(),
    ).toBeGreaterThan(0)
    // Never expose the password
    expect(user).not.toHaveProperty('password')
  })

  it('returns 401 when no cookie is sent', async () => {
    const { error, status } = await api.auth.me.get()

    expect(status).toBe(401)
    expect(error).not.toBeNull()
    const body = error!.value as { error: string }
    expect(body.error).toBeDefined()
  })

  it('returns 401 when the token is tampered with', async () => {
    const { error, status } = await api.auth.me.get({
      headers: { cookie: 'auth=not.a.real.jwt' },
    })

    expect(status).toBe(401)
    expect(error).not.toBeNull()
    const body = error!.value as { error: string }
    expect(body.error).toBeDefined()
  })

  it('returns 401 when an empty token is sent', async () => {
    const { error, status } = await api.auth.me.get({
      headers: { cookie: 'auth=' },
    })

    expect(status).toBe(401)
    expect(error).not.toBeNull()
    const body = error!.value as { error: string }
    expect(body.error).toBeDefined()
  })
})
