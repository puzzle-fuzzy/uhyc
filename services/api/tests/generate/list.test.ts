import { describe, expect, it, beforeAll } from 'bun:test'
import {
  api,
  ALICE,
  deleteUser,
  parseAuthToken,
  authHeaders,
} from '../helpers'

// ---------------------------------------------------------------------------
// GET /generate/tasks — list current user's task history (requires auth)
// ---------------------------------------------------------------------------

interface TaskListBody {
  items: { createdAt: string }[]
  total: number
}

describe('GET /generate/tasks', () => {
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

  it('returns the list shape (items + total) for an authenticated user', async () => {
    const res = await api.generate.tasks.get({
      headers: authHeaders(aliceToken),
    })
    const body = res.data as TaskListBody | null

    expect(res.status).toBe(200)
    expect(body).not.toBeNull()
    expect(Array.isArray(body!.items)).toBe(true)
    expect(typeof body!.total).toBe('number')
  })

  it('returns 401 without an auth cookie', async () => {
    const res = await api.generate.tasks.get()
    expect(res.status).toBe(401)
  })

  it('returns items sorted newest-first (createdAt desc)', async () => {
    const res = await api.generate.tasks.get({
      headers: authHeaders(aliceToken),
    })
    const body = res.data as TaskListBody
    const times = body.items.map((t) => new Date(t.createdAt).getTime())
    const sorted = [...times].sort((a, b) => b - a)
    expect(times).toEqual(sorted)
  })
})
