import { describe, expect, it } from 'bun:test'
import { computeLabels, serializePrompt, type PromptToken } from './promptSerializer'
import type { MediaItem } from '../types'

function img(id: string): MediaItem {
  return { id, type: 'reference_image', url: 'u', label: '' }
}
function vid(id: string): MediaItem {
  return { id, type: 'reference_video', url: 'u', label: '' }
}

describe('computeLabels', () => {
  it('cn-prefixed: images and videos counted separately', () => {
    const items = [img('a'), vid('b'), img('c')]
    const labeled = computeLabels(items, 'cn-prefixed')
    expect(labeled[0].label).toBe('图1')
    expect(labeled[1].label).toBe('视频1')
    expect(labeled[2].label).toBe('图2')
  })

  it('bracket-en: images only, [Image N] format', () => {
    const items = [img('a'), img('b')]
    const labeled = computeLabels(items, 'bracket-en')
    expect(labeled[0].label).toBe('[Image 1]')
    expect(labeled[1].label).toBe('[Image 2]')
  })
})

describe('serializePrompt', () => {
  it('cn-prefixed: text + image/video chips → prompt string + ordered media[]', () => {
    const tokens: PromptToken[] = [
      { kind: 'text', text: '让' },
      { kind: 'ref', itemId: 'a' },
      { kind: 'text', text: '在' },
      { kind: 'ref', itemId: 'b' },
      { kind: 'text', text: '里玩耍' },
    ]
    const items = [img('a'), vid('b')]
    const { prompt, media } = serializePrompt(tokens, items, 'cn-prefixed')
    expect(prompt).toBe('让图1在视频1里玩耍')
    expect(media.map((m) => m.type)).toEqual([
      'reference_image',
      'reference_video',
    ])
  })

  it('bracket-en: chips → [Image N]', () => {
    const tokens: PromptToken[] = [
      { kind: 'ref', itemId: 'a' },
      { kind: 'text', text: '和' },
      { kind: 'ref', itemId: 'b' },
    ]
    const items = [img('a'), img('b')]
    const { prompt, media } = serializePrompt(tokens, items, 'bracket-en')
    expect(prompt).toBe('[Image 1]和[Image 2]')
    expect(media).toHaveLength(2)
  })

  it('media[] follows first-appearance order in prompt', () => {
    const tokens: PromptToken[] = [
      { kind: 'ref', itemId: 'b' },
      { kind: 'text', text: '前' },
      { kind: 'ref', itemId: 'a' },
    ]
    const items = [img('a'), img('b')]
    const { prompt, media } = serializePrompt(tokens, items, 'bracket-en')
    // b appears first in prompt → first in media[] → labeled [Image 1]
    expect(media[0].id).toBe('b')
    expect(media[1].id).toBe('a')
    expect(prompt).toBe('[Image 1]前[Image 2]')
  })

  it('repeated reference keeps same label', () => {
    const tokens: PromptToken[] = [
      { kind: 'ref', itemId: 'a' },
      { kind: 'ref', itemId: 'a' },
    ]
    const items = [img('a')]
    const { prompt, media } = serializePrompt(tokens, items, 'cn-prefixed')
    expect(prompt).toBe('图1图1')
    expect(media).toHaveLength(1)
  })
})
