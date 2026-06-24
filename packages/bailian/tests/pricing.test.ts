import { describe, expect, it } from 'bun:test'
import { calcPrice, getDefaultUnitPrice } from '../src/shared/pricing'
import { happyhorseT2v } from '../src/video/models/happyhorse-t2v'
import { wan27T2v } from '../src/video/models/wan2.7-t2v'
import { qwenTextToImage } from '../src/image/models/qwen-t2i'
import { qwenImageTranslation } from '../src/image/models/qwen-mt-image'
import type { ModelPricing } from '../src/video/types'

describe('calcPrice', () => {
  // ---- Per-second, resolution-tiered ----

  it('calculates HappyHorse 720P price: 0.9 × 5s = 4.5', () => {
    const price = calcPrice(happyhorseT2v.pricing, {
      resolution: '720P',
      duration: 5,
    })
    expect(price).toBe(4.5)
  })

  it('calculates HappyHorse 1080P price: 1.2 × 10s = 12', () => {
    const price = calcPrice(happyhorseT2v.pricing, {
      resolution: '1080P',
      duration: 10,
    })
    expect(price).toBe(12)
  })

  it('falls back to first tier when resolution is unrecognized', () => {
    const price = calcPrice(happyhorseT2v.pricing, {
      resolution: '4K',
      duration: 5,
    })
    // Tier 0 is 720P = 0.9
    expect(price).toBe(4.5)
  })

  it('calculates Wan2.7 1080P price: 1.0 × 3s = 3', () => {
    const price = calcPrice(wan27T2v.pricing, {
      resolution: '1080P',
      duration: 3,
    })
    expect(price).toBe(3)
  })

  // ---- Per-image, flat rate ----

  it('calculates Qwen T2I Pro: 0.5 × 2 images = 1', () => {
    const price = calcPrice(qwenTextToImage.pricing, { n: 2 })
    expect(price).toBe(1)
  })

  it('calculates Qwen T2I Pro default quantity (n=1): 0.5', () => {
    const price = calcPrice(qwenTextToImage.pricing, {})
    expect(price).toBe(0.5)
  })

  it('calculates Qwen MT-Image: 0.003 × 5 = 0.015', () => {
    const price = calcPrice(qwenImageTranslation.pricing, { n: 5 })
    expect(price).toBe(0.015)
  })

  // ---- Edge cases ----

  it('handles missing quantity key gracefully (defaults to 1)', () => {
    const flatPricing: ModelPricing = {
      unit: 'per_image',
      quantityKey: 'n',
      tiers: [{ condition: {}, price: 0.5 }],
    }
    expect(calcPrice(flatPricing, {})).toBe(0.5)
  })

  it('handles string quantity values', () => {
    const flatPricing: ModelPricing = {
      unit: 'per_image',
      quantityKey: 'n',
      tiers: [{ condition: {}, price: 0.2 }],
    }
    expect(calcPrice(flatPricing, { n: '3' })).toBe(0.6)
  })

  it('rounds to 4 decimal places', () => {
    const pricing: ModelPricing = {
      unit: 'per_image',
      quantityKey: 'n',
      tiers: [{ condition: {}, price: 0.3333 }],
    }
    // 0.3333 × 3 = 0.9999
    expect(calcPrice(pricing, { n: 3 })).toBe(0.9999)
  })
})

describe('getDefaultUnitPrice', () => {
  it('returns first tier price', () => {
    expect(getDefaultUnitPrice(happyhorseT2v.pricing)).toBe(0.9)
  })

  it('returns 0 for empty tiers (should not happen in practice)', () => {
    const empty: ModelPricing = {
      unit: 'per_image',
      quantityKey: 'n',
      tiers: [],
    }
    expect(getDefaultUnitPrice(empty)).toBe(0)
  })
})
