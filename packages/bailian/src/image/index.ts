// ---------------------------------------------------------------------------
// 图片生成领域 — 模型注册表（待后续扩展）
//
// 小类: text-to-image | image-to-image | reference-to-image
// ---------------------------------------------------------------------------

import type { ModelDefinition } from '../video/types'

export type ImageSubCategory =
  | 'text-to-image'
  | 'image-to-image'
  | 'reference-to-image'

export type ImageModelRegistry = Record<
  ImageSubCategory,
  ModelDefinition<ImageSubCategory>[]
>

export const imageModels: ImageModelRegistry = {
  'text-to-image': [],
  'image-to-image': [],
  'reference-to-image': [],
}

export const allImageModels = Object.values(imageModels).flat()
