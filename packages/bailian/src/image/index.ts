// ---------------------------------------------------------------------------
// 图片生成领域 — 模型注册表
// ---------------------------------------------------------------------------

import type { ModelDefinition } from '../video/types'
import { qwenTextToImage } from './models/qwen-t2i'
import { qwenImageEdit } from './models/qwen-image-edit'
import { qwenImageTranslation } from './models/qwen-mt-image'
import { klingImageGen, klingOmniImageGen } from './models/kling-image'
import { wan27ImagePro, wan27Image } from './models/wan2.7-image'
import { zImageTurbo } from './models/z-image'

export type ImageSubCategory =
  | 'text-to-image'
  | 'image-to-image'
  | 'reference-to-image'

export type ImageModelRegistry = Record<
  ImageSubCategory,
  ModelDefinition<ImageSubCategory>[]
>

export const imageModels: ImageModelRegistry = {
  'text-to-image': [
    qwenTextToImage,
    klingImageGen,
    klingOmniImageGen,
    wan27ImagePro,
    wan27Image,
    zImageTurbo,
  ],
  'image-to-image': [qwenImageEdit],
  'reference-to-image': [qwenImageTranslation],
}

export const allImageModels = Object.values(imageModels).flat()

// ---- 模型定义 ----
export { qwenTextToImage } from './models/qwen-t2i'
export { qwenImageEdit } from './models/qwen-image-edit'
export { qwenImageTranslation } from './models/qwen-mt-image'
export { klingImageGen } from './models/kling-image'
export { klingOmniImageGen } from './models/kling-image'
export { wan27ImagePro } from './models/wan2.7-image'
export { wan27Image } from './models/wan2.7-image'
export { zImageTurbo } from './models/z-image'
