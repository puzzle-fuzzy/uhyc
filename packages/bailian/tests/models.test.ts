import { describe, expect, it } from 'bun:test'
import { allVideoModels } from '../src/video'
import { allImageModels } from '../src/image'
import { allMusicModels } from '../src/music'
import type { ModelDefinition } from '../src/video/types'

// ---------------------------------------------------------------------------
// Model definition integrity — every model in every registry must be valid
// ---------------------------------------------------------------------------

const allModels: ModelDefinition[] = [
  ...allVideoModels,
  ...allImageModels,
  ...allMusicModels,
]

const VALID_CATEGORIES = ['video', 'image', 'music'] as const

const VALID_FIELD_TYPES = [
  'text',
  'number',
  'boolean',
  'select',
  'range',
  'media',
  'multi-text',
] as const

const VALID_FIELD_GROUPS = ['input', 'parameters'] as const

describe('Model definition integrity', () => {
  // ---- Every model in the registry ----

  it('has at least some video models registered', () => {
    expect(allVideoModels.length).toBeGreaterThanOrEqual(8)
  })

  it('has at least some image models registered', () => {
    expect(allImageModels.length).toBeGreaterThanOrEqual(3)
  })

  // ---- Per-model checks ----

  for (const model of allModels) {
    const label = model.model

    describe(label, () => {
      it('has a non-empty model id', () => {
        expect(model.model.length).toBeGreaterThan(0)
      })

      it('has supportedModels that includes the primary model', () => {
        expect(model.supportedModels).toContain(model.model)
      })

      it('has a displayName', () => {
        expect(model.displayName.length).toBeGreaterThan(0)
      })

      it('has a valid category', () => {
        expect(VALID_CATEGORIES).toContain(model.category)
      })

      it('has a non-empty subCategory', () => {
        expect(model.subCategory.length).toBeGreaterThan(0)
      })

      it('has an endpoint that starts with /', () => {
        expect(model.endpoint.startsWith('/')).toBe(true)
      })

      it('has at least one field', () => {
        expect(model.fields.length).toBeGreaterThan(0)
      })

      it('has pricing defined', () => {
        expect(model.pricing).toBeDefined()
        expect(model.pricing.tiers.length).toBeGreaterThan(0)
        expect(model.pricing.tiers[0].price).toBeGreaterThan(0)
      })

      it('has a valid pricing unit', () => {
        expect(['per_second', 'per_image']).toContain(model.pricing.unit)
      })

      it('has a quantityKey that exists in fields or is implicit', () => {
        const fieldKeys = model.fields.map((f) => f.key)
        const implicitQuantityKeys = ['duration', 'n']
        // quantityKey either maps to a visible field or is an implicit concept
        // (e.g. video-edit duration comes from input video; MT-image always 1 image)
        const ok =
          fieldKeys.includes(model.pricing.quantityKey) ||
          implicitQuantityKeys.includes(model.pricing.quantityKey)
        expect(ok).toBe(true)
      })

      // ---- Per-field checks ----

      for (const field of model.fields) {
        it(`field "${field.key}" has a valid type`, () => {
          expect(VALID_FIELD_TYPES).toContain(field.type)
        })

        it(`field "${field.key}" has a valid group`, () => {
          expect(VALID_FIELD_GROUPS).toContain(field.group)
        })

        it(`field "${field.key}" has a label`, () => {
          expect(field.label.length).toBeGreaterThan(0)
        })

        if (field.type === 'select') {
          it(`field "${field.key}" (select) has options`, () => {
            expect(field.options).toBeDefined()
            expect(field.options!.length).toBeGreaterThanOrEqual(1)
          })
        }

        if (field.type === 'range' || field.type === 'number') {
          it(`field "${field.key}" (${field.type}) has min and max defined`, () => {
            expect(field.min).toBeDefined()
            expect(field.max).toBeDefined()
            expect(field.min!).toBeLessThanOrEqual(field.max!)
          })
        }
      }
    })
  }

  // ---- No duplicate primary model IDs within the same subCategory ----
  // (Same model ID may appear in different subCategories, e.g. qwen-image-2.0-pro
  //  can be used for both text-to-image and image-to-image.)

  it('has no duplicate primary model IDs within the same subCategory', () => {
    const seen = new Map<string, string>()
    for (const m of allModels) {
      const scope = `${m.category}/${m.subCategory}/${m.model}`
      if (seen.has(scope)) {
        expect(`duplicate in same subCategory: ${scope}`).toBe('no duplicates')
      }
      seen.set(scope, scope)
    }
  })
})
