import { describe, expect, it, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  api,
  ALICE,
  BOB,
  cleanupAll,
  parseAuthToken,
  authHeaders,
} from '../helpers'

// ---------------------------------------------------------------------------
// Cross-scenario integration tests
// ---------------------------------------------------------------------------

describe('Integration scenarios', () => {
  // Clean slate for each integration scenario to avoid cross-test pollution.
  beforeEach(cleanupAll)
  afterAll(cleanupAll)

  it('register → login → me → logout → me (full lifecycle)', async () => {
    // 1. Register
    const reg = await api.auth.register.post(ALICE)
    expect(reg.status).toBe(200)
    const regCookie = parseAuthToken(reg.response.headers.get('set-cookie'))

    // 2. /me with the cookie from registration
    const meAfterReg = await api.auth.me.get({
      headers: authHeaders(regCookie),
    })
    expect(meAfterReg.status).toBe(200)
    expect(meAfterReg.data).not.toBeNull()
    expect(meAfterReg.data!.user.username).toBe(ALICE.username)

    // 3. Logout
    const out = await api.auth.logout.post(
      {},
      { headers: authHeaders(regCookie) },
    )
    expect(out.status).toBe(200)

    // 4. Login
    const login = await api.auth.login.post({
      emailOrUsername: ALICE.email,
      password: ALICE.password,
    })
    expect(login.status).toBe(200)
    const loginCookie = parseAuthToken(login.response.headers.get('set-cookie'))

    // 5. /me after login (should still work)
    const meAfterLogin = await api.auth.me.get({
      headers: authHeaders(loginCookie),
    })
    expect(meAfterLogin.status).toBe(200)
    expect(meAfterLogin.data).not.toBeNull()
    expect(meAfterLogin.data!.user.email).toBe(ALICE.email)
  })

  it('two independent users can register and login separately', async () => {
    // Register Alice
    const a = await api.auth.register.post(ALICE)
    expect(a.status).toBe(200)

    // Register Bob
    const b = await api.auth.register.post(BOB)
    expect(b.status).toBe(200)

    // Each gets their own token
    const aCookie = parseAuthToken(a.response.headers.get('set-cookie'))
    const bCookie = parseAuthToken(b.response.headers.get('set-cookie'))
    expect(aCookie).not.toBe(bCookie)

    // Alice's /me returns Alice
    const meA = await api.auth.me.get({ headers: authHeaders(aCookie) })
    expect(meA.status).toBe(200)
    expect(meA.data).not.toBeNull()
    expect(meA.data!.user.username).toBe(ALICE.username)

    // Bob's /me returns Bob
    const meB = await api.auth.me.get({ headers: authHeaders(bCookie) })
    expect(meB.status).toBe(200)
    expect(meB.data).not.toBeNull()
    expect(meB.data!.user.username).toBe(BOB.username)

    // Alice's profile and Bob's profile must be distinct
    expect(meA.data!.user.id).not.toBe(meB.data!.user.id)
  })
})
