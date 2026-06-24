import { describe, expect, it } from 'bun:test'
import { validateParams, sanitizeParams, applyDefaults } from '../src/video/validate'
import type { ModelDefinition } from '../src/video/types'
import { happyhorseT2v } from '../src/video/models/happyhorse-t2v'

// ---------------------------------------------------------------------------
// validateParams — parameter validation tests
// ---------------------------------------------------------------------------

describe('validateParams', () => {
  // Minimal model definition for focused testing
  const miniDef: ModelDefinition = {
    model: 'test-model',
    supportedModels: ['test-model'],
    displayName: 'Test Model',
    category: 'video',
    subCategory: 'text-to-video',
    endpoint: '/test',
    async: true,
    pricing: { unit: 'per_second', quantityKey: 'duration', tiers: [{ condition: {}, price: 1 }] },
    fields: [
      { key: 'prompt', label: '提示词', type: 'text', group: 'input', required: true, maxLength: 100 },
      { key: 'negative_prompt', label: '反向提示词', type: 'text', group: 'input', maxLength: 50 },
      { key: 'resolution', label: '分辨率', type: 'select', group: 'parameters', defaultValue: '1080P', options: [{ label: '720P', value: '720P' }, { label: '1080P', value: '1080P' }] },
      { key: 'duration', label: '时长', type: 'range', group: 'parameters', defaultValue: 5, min: 2, max: 15 },
      { key: 'watermark', label: '水印', type: 'boolean', group: 'parameters', defaultValue: false },
      { key: 'seed', label: '种子', type: 'number', group: 'parameters', min: 0, max: 100 },
    ],
  }

  // ---- Success cases ----

  it('passes when all required fields are present and valid', () => {
    const result = validateParams(miniDef, {
      prompt: 'a cat running',
      resolution: '720P',
      duration: 5,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('passes when optional fields are omitted', () => {
    const result = validateParams(miniDef, { prompt: 'hello' })
    expect(result.valid).toBe(true)
  })

  // ---- Required field ----

  it('fails when a required field is missing', () => {
    const result = validateParams(miniDef, { duration: 5 })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'prompt')).toBe(true)
  })

  it('fails when a required field is an empty string', () => {
    const result = validateParams(miniDef, { prompt: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'prompt')).toBe(true)
  })

  // ---- text type ----

  it('fails when text field exceeds maxLength', () => {
    const result = validateParams(miniDef, {
      prompt: 'x'.repeat(101),
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'prompt')).toBe(true)
  })

  it('fails when text field is not a string', () => {
    const result = validateParams(miniDef, { prompt: 123 } as any)
    expect(result.valid).toBe(false)
  })

  // ---- select type ----

  it('fails when select value is not in options', () => {
    const result = validateParams(miniDef, {
      prompt: 'hello',
      resolution: '4K',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'resolution')).toBe(true)
  })

  it('passes when select value is a valid option', () => {
    const result = validateParams(miniDef, {
      prompt: 'hello',
      resolution: '720P',
    })
    expect(result.valid).toBe(true)
  })

  // ---- range type ----

  it('fails when range value is below min', () => {
    const result = validateParams(miniDef, {
      prompt: 'hello',
      duration: 1,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'duration')).toBe(true)
  })

  it('fails when range value is above max', () => {
    const result = validateParams(miniDef, {
      prompt: 'hello',
      duration: 20,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'duration')).toBe(true)
  })

  // ---- number type ----

  it('fails when number field is above max', () => {
    const result = validateParams(miniDef, {
      prompt: 'hello',
      seed: 200,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'seed')).toBe(true)
  })

  // ---- boolean type ----

  it('fails when boolean field is not a boolean', () => {
    const result = validateParams(miniDef, {
      prompt: 'hello',
      watermark: 'yes',
    } as any)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'watermark')).toBe(true)
  })

  // ---- Multiple errors ----

  it('collects all errors when multiple fields fail', () => {
    const result = validateParams(miniDef, { duration: 100, seed: 999, watermark: 'nope' } as any)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// sanitizeParams
// ---------------------------------------------------------------------------

describe('sanitizeParams', () => {
  it('strips keys not declared in the model definition', () => {
    const def: ModelDefinition = {
      model: 'x',
      supportedModels: ['x'],
      displayName: 'X',
      category: 'video',
      subCategory: 'text-to-video',
      endpoint: '/x',
      async: true,
      pricing: { unit: 'per_second', quantityKey: 'd', tiers: [{ condition: {}, price: 1 }] },
      fields: [
        { key: 'prompt', label: 'P', type: 'text', group: 'input' },
        { key: 'duration', label: 'D', type: 'number', group: 'parameters' },
      ],
    }
    const result = sanitizeParams(def, { prompt: 'hi', duration: 5, injected: 'evil' })
    expect(result).toEqual({ prompt: 'hi', duration: 5 })
    expect(result).not.toHaveProperty('injected')
  })

  it('omits declared keys that were not provided', () => {
    const def: ModelDefinition = {
      model: 'x',
      supportedModels: ['x'],
      displayName: 'X',
      category: 'video',
      subCategory: 'text-to-video',
      endpoint: '/x',
      async: true,
      pricing: { unit: 'per_second', quantityKey: 'd', tiers: [{ condition: {}, price: 1 }] },
      fields: [
        { key: 'prompt', label: 'P', type: 'text', group: 'input' },
        { key: 'duration', label: 'D', type: 'number', group: 'parameters' },
      ],
    }
    const result = sanitizeParams(def, { prompt: 'hi' })
    expect(result).toEqual({ prompt: 'hi' })
  })
})

// ---------------------------------------------------------------------------
// applyDefaults
// ---------------------------------------------------------------------------

describe('applyDefaults', () => {
  it('fills in missing optional fields with their defaults', () => {
    const result = applyDefaults(happyhorseT2v, { prompt: 'test' })
    // HappyHorse defaults: resolution=1080P, ratio=16:9, duration=5, watermark=true
    expect(result.prompt).toBe('test')
    expect(result.resolution).toBe('1080P')
    expect(result.duration).toBe(5)
    expect(result.watermark).toBe(true)
  })

  it('preserves user-provided values over defaults', () => {
    const result = applyDefaults(happyhorseT2v, {
      prompt: 'test',
      duration: 10,
      watermark: false,
    })
    expect(result.duration).toBe(10)
    expect(result.watermark).toBe(false)
  })

  it('skips empty strings (treated as unfilled) so they have no default filled', () => {
    // applyDefaults skips empty strings, null, undefined — they don't appear in result
    const result = applyDefaults(happyhorseT2v, { prompt: '', resolution: '720P' })
    expect(result.resolution).toBe('720P')
    // Empty string is skipped, so prompt key is absent (not defaulted)
    expect(result).not.toHaveProperty('prompt')
  })
})
