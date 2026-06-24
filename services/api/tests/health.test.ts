import { describe, expect, it } from 'bun:test'
import { api } from './helpers'

describe('GET /', () => {
  it('returns 200 with the hello string', async () => {
    const { data, status } = await api.get()
    expect(status).toBe(200)
    expect(data).toBe('Hello Elysia')
  })
})
