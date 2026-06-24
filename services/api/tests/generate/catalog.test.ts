import { describe, expect, it, beforeAll } from 'bun:test'
import { api, ALICE, deleteUser } from '../helpers'

// ---------------------------------------------------------------------------
// GET /generate/catalog
// ---------------------------------------------------------------------------

interface CatalogBody {
  video: Record<string, { model: string; fields: { key: string; required?: boolean }[] }[]>
  image: Record<string, unknown[]>
  music: Record<string, unknown[]>
}

describe('GET /generate/catalog', () => {
  beforeAll(async () => {
    await deleteUser(ALICE.username)
    await api.auth.register.post(ALICE)
  })

  it('returns the model catalog with all three categories', async () => {
    const res = await api.generate.catalog.get()
    const cat = res.data as CatalogBody | null

    expect(res.status).toBe(200)
    expect(cat).not.toBeNull()
    expect(cat!.video).toBeDefined()
    expect(cat!.image).toBeDefined()
    expect(cat!.music).toBeDefined()
  })

  it('includes the two text-to-video models', async () => {
    const res = await api.generate.catalog.get()
    const cat = res.data as CatalogBody
    const t2v = cat.video['text-to-video']
    expect(t2v.length).toBeGreaterThanOrEqual(2)
    const models = t2v.map((m) => m.model)
    expect(models).toContain('happyhorse-1.1-t2v')
    expect(models).toContain('wan2.7-t2v')
  })

  it('exposes field metadata for form rendering', async () => {
    const res = await api.generate.catalog.get()
    const cat = res.data as CatalogBody
    const wan = cat.video['text-to-video'].find((m) => m.model === 'wan2.7-t2v')!
    expect(wan.fields.length).toBeGreaterThan(0)
    const prompt = wan.fields.find((f) => f.key === 'prompt')
    expect(prompt).toBeDefined()
    expect(prompt!.required).toBe(true)
  })
})
