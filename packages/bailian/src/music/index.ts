// ---------------------------------------------------------------------------
// 音乐生成领域 — 模型注册表
// ---------------------------------------------------------------------------

import type { ModelDefinition } from '../video/types'
import { funMusicV1 } from './models/fun-music'

export type MusicSubCategory = 'text-to-music'

export type MusicModelRegistry = Record<
  MusicSubCategory,
  ModelDefinition<MusicSubCategory>[]
>

export const musicModels: MusicModelRegistry = {
  'text-to-music': [funMusicV1],
}

export const allMusicModels = Object.values(musicModels).flat()

export { funMusicV1 } from './models/fun-music'
