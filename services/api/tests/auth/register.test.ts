import { describe, expect, it, beforeAll } from 'bun:test'
import { api, ALICE, deleteUser } from '../helpers'

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

describe('POST /auth/register', () => {
  beforeAll(async () => {
    await deleteUser(ALICE.username)
  })

  it('registers a new user and returns the public user shape', async () => {
    const { data, status, response } = await api.auth.register.post(ALICE)

    expect(status).toBe(200)
    expect(data).not.toBeNull()

    const { user } = data!
    expect(user.id).toBeDefined()
    expect(typeof user.id).toBe('string')
    expect(user.username).toBe(ALICE.username)
    expect(user.email).toBe(ALICE.email)
    expect(user.role).toBe('user')
    expect(user.avatar).toBeNull()
    expect(user.lastLoginAt).toBeNull()
    // Security: password hash must never leak
    expect(user).not.toHaveProperty('password')

    // Auth cookie is set so the user is immediately signed in
    const cookie = response.headers.get('set-cookie')
    expect(cookie).not.toBeNull()
    expect(cookie).toContain('auth=')
    expect(cookie).toContain('HttpOnly')
  })

  it('returns 409 when the username is already taken', async () => {
    const { error, status } = await api.auth.register.post({
      ...ALICE,
      email: 'other_alice@uhyc.test',
    })

    expect(status).toBe(409)
    expect(error).not.toBeNull()
    const body = error!.value as { error: string }
    expect(body.error).toMatch(/username or email already in use/i)
  })

  it('returns 409 when the email is already taken', async () => {
    const { error, status } = await api.auth.register.post({
      ...ALICE,
      username: 'other_alice',
    })

    expect(status).toBe(409)
    expect(error).not.toBeNull()
    const body = error!.value as { error: string }
    expect(body.error).toMatch(/username or email already in use/i)
  })

  it('rejects a request with a missing username (validation)', async () => {
    const { status } = await api.auth.register.post({
      email: 'someone@uhyc.test',
      password: 'TestPass123!',
    } as any)

    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('rejects a password shorter than 8 characters', async () => {
    const { status } = await api.auth.register.post({
      username: 'shortpw',
      email: 'shortpw@uhyc.test',
      password: 'Ab1',
    } as any)

    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('rejects a password longer than 72 characters', async () => {
    const { status } = await api.auth.register.post({
      username: 'longpw',
      email: 'longpw@uhyc.test',
      password: 'A'.repeat(73),
    } as any)

    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('rejects a username shorter than 3 characters', async () => {
    const { status } = await api.auth.register.post({
      username: 'ab',
      email: 'ab@uhyc.test',
      password: 'TestPass123!',
    } as any)

    expect(status).toBeGreaterThanOrEqual(400)
  })
})
