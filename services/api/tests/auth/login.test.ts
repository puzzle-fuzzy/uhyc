import { describe, expect, it, beforeAll } from 'bun:test'
import { api, ALICE, deleteUser } from '../helpers'

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  // Ensure the fixture user exists.
  beforeAll(async () => {
    await deleteUser(ALICE.username)
    await api.auth.register.post(ALICE)
  })

  it('logs in using email + password', async () => {
    const { data, status, response } = await api.auth.login.post({
      emailOrUsername: ALICE.email,
      password: ALICE.password,
    })

    expect(status).toBe(200)
    expect(data).not.toBeNull()

    expect(data!.user.email).toBe(ALICE.email)
    expect(data!.user.username).toBe(ALICE.username)
    expect(data!.user).not.toHaveProperty('password')

    // lastLoginAt should be updated after a successful login
    const lastLogin = data!.user.lastLoginAt
    expect(lastLogin).toBeTruthy()
    const loginDate = new Date(lastLogin as string | Date)
    expect(loginDate.getTime()).toBeGreaterThan(0)

    // Auth cookie should be set
    expect(response.headers.get('set-cookie')).toContain('auth=')
  })

  it('logs in using username + password', async () => {
    const { data, status } = await api.auth.login.post({
      emailOrUsername: ALICE.username,
      password: ALICE.password,
    })

    expect(status).toBe(200)
    expect(data).not.toBeNull()
    expect(data!.user.username).toBe(ALICE.username)
  })

  it('returns 401 for a wrong password', async () => {
    const { error, status } = await api.auth.login.post({
      emailOrUsername: ALICE.email,
      password: 'WrongPassword99!',
    })

    expect(status).toBe(401)
    expect(error).not.toBeNull()
    const body = error!.value as { error: string }
    expect(body.error).toMatch(/invalid credentials/i)
  })

  it('returns 401 for an unregistered user', async () => {
    const { error, status } = await api.auth.login.post({
      emailOrUsername: 'ghost@uhyc.test',
      password: 'Whatever123!',
    })

    expect(status).toBe(401)
    expect(error).not.toBeNull()
    const body = error!.value as { error: string }
    expect(body.error).toMatch(/invalid credentials/i)
  })

  it('returns 401 for an empty password', async () => {
    const { status } = await api.auth.login.post({
      emailOrUsername: ALICE.email,
      password: '',
    })

    expect(status).toBe(401)
  })

  it('does not leak a password hash on 401', async () => {
    const { error, status } = await api.auth.login.post({
      emailOrUsername: ALICE.email,
      password: 'WrongPassword99!',
    })

    expect(status).toBe(401)
    expect(error).not.toBeNull()
    const body = error!.value as Record<string, unknown>
    expect(body).not.toHaveProperty('password')
    expect(body).not.toHaveProperty('user')
  })
})
