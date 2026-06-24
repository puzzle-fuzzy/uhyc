// ---------------------------------------------------------------------------
// 图片生成领域 — 模型注册表
// ---------------------------------------------------------------------------

import type { ModelDefinition } from '../video/types'
import { qwenTextToImage } from './models/qwen-t2i'
import { qwenImageEdit } from './models/qwen-image-edit'
import { qwenImageTranslation } from './models/qwen-mt-image'

export type ImageSubCategory =
  | 'text-to-image'
  | 'image-to-image'
  | 'reference-to-image'

export type ImageModelRegistry = Record<
  ImageSubCategory,
  ModelDefinition<ImageSubCategory>[]
>

export const imageModels: ImageModelRegistry = {
  'text-to-image':       [qwenTextToImage],
  'image-to-image':      [qwenImageEdit],
  'reference-to-image':  [qwenImageTranslation],
}

export const allImageModels = Object.values(imageModels).flat()

// ---- 模型定义 ----
export { qwenTextToImage } from './models/qwen-t2i'
export { qwenImageEdit } from './models/qwen-image-edit'
export { qwenImageTranslation } from './models/qwen-mt-image'
