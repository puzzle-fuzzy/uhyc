// ---------------------------------------------------------------------------
// 音乐生成领域 — 模型注册表（待后续扩展）
//
// 小类: text-to-music | ...
// ---------------------------------------------------------------------------

import type { ModelDefinition } from '../video/types'

export type MusicSubCategory = 'text-to-music'

export type MusicModelRegistry = Record<
  MusicSubCategory,
  ModelDefinition<MusicSubCategory>[]
>

export const musicModels: MusicModelRegistry = {
  'text-to-music': [],
}

export const allMusicModels = Object.values(musicModels).flat()
