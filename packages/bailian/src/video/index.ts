// ---------------------------------------------------------------------------
// 视频生成领域 — 模型注册表
// ---------------------------------------------------------------------------

import { happyhorseT2v } from './models/happyhorse-t2v'
import { happyhorseI2v } from './models/happyhorse-i2v'
import { happyhorseR2v } from './models/happyhorse-r2v'
import { happyhorseVideoEdit } from './models/happyhorse-video-edit'
import { wan27T2v } from './models/wan2.7-t2v'
import { wan27I2v } from './models/wan2.7-i2v'
import { wan27R2v } from './models/wan2.7-r2v'
import { wan27VideoEdit } from './models/wan2.7-video-edit'

// Vidu
import { viduQ3ProT2v, viduQ3TurboT2v, viduQ2T2v } from './models/vidu-t2v'
import { viduQ3ProI2v, viduQ3TurboI2v, viduQ2ProFastI2v, viduQ2ProI2v, viduQ2TurboI2v } from './models/vidu-i2v'
import { viduQ3ProI2vKF, viduQ3TurboI2vKF, viduQ2ProI2vKF, viduQ2TurboI2vKF } from './models/vidu-i2v-keyframe'
import { viduQ3MixR2v, viduQ3R2v, viduQ3TurboR2v, viduQ2ProR2v, viduQ2R2v } from './models/vidu-r2v'

// PixVerse (爱诗)
import { pixverseC1T2v, pixverseV6T2v, pixverseV56T2v } from './models/pixverse-t2v'
import { pixverseC1I2v, pixverseV6I2v, pixverseV56I2v } from './models/pixverse-i2v'
import { pixverseC1I2vKF, pixverseV6I2vKF, pixverseV56I2vKF } from './models/pixverse-i2v-keyframe'
import { pixverseC1R2v, pixverseV6R2v, pixverseV56R2v } from './models/pixverse-r2v'

// 可灵 (Kling)
import { klingV3T2v, klingV3OmniT2v } from './models/kling-t2v'
import { klingV3I2v, klingV3OmniI2v, klingV3I2vKF, klingV3OmniI2vKF } from './models/kling-i2v'

import type { VideoModelRegistry } from './types'

/**
 * 视频生成领域模型注册表。
 *
 * 前端消费方式：
 * 1. 遍历 videoModels 的 key（subCategory）渲染子 Tab
 * 2. 选中子 Tab 后列出对应数组中的模型
 * 3. 选择模型后遍历 model.fields 渲染参数表单
 */
export const videoModels: VideoModelRegistry = {
  'text-to-video': [
    happyhorseT2v,
    wan27T2v,
    // Vidu
    viduQ3ProT2v,
    viduQ3TurboT2v,
    viduQ2T2v,
    // PixVerse
    pixverseC1T2v,
    pixverseV6T2v,
    pixverseV56T2v,
    // 可灵
    klingV3T2v,
    klingV3OmniT2v,
  ],
  'image-to-video': [
    happyhorseI2v,
    wan27I2v,
    // Vidu (首帧)
    viduQ3ProI2v,
    viduQ3TurboI2v,
    viduQ2ProFastI2v,
    viduQ2ProI2v,
    viduQ2TurboI2v,
    // Vidu (首尾帧)
    viduQ3ProI2vKF,
    viduQ3TurboI2vKF,
    viduQ2ProI2vKF,
    viduQ2TurboI2vKF,
    // PixVerse (首帧)
    pixverseC1I2v,
    pixverseV6I2v,
    pixverseV56I2v,
    // PixVerse (首尾帧)
    pixverseC1I2vKF,
    pixverseV6I2vKF,
    pixverseV56I2vKF,
    // 可灵 (首帧 + 首尾帧)
    klingV3I2v,
    klingV3OmniI2v,
    klingV3I2vKF,
    klingV3OmniI2vKF,
  ],
  'reference-to-video': [
    happyhorseR2v,
    wan27R2v,
    // Vidu
    viduQ3MixR2v,
    viduQ3R2v,
    viduQ3TurboR2v,
    viduQ2ProR2v,
    viduQ2R2v,
    // PixVerse
    pixverseC1R2v,
    pixverseV6R2v,
    pixverseV56R2v,
  ],
  'video-editing': [
    happyhorseVideoEdit,
    wan27VideoEdit,
  ],
}

/** 所有视频领域模型的扁平列表 */
export const allVideoModels = Object.values(videoModels).flat()

// ---- 现有模型 ----
export { happyhorseT2v } from './models/happyhorse-t2v'
export { happyhorseI2v } from './models/happyhorse-i2v'
export { happyhorseR2v } from './models/happyhorse-r2v'
export { happyhorseVideoEdit } from './models/happyhorse-video-edit'
export { wan27T2v } from './models/wan2.7-t2v'
export { wan27I2v } from './models/wan2.7-i2v'
export { wan27R2v } from './models/wan2.7-r2v'
export { wan27VideoEdit } from './models/wan2.7-video-edit'

// ---- Vidu ----
export { viduQ3ProT2v, viduQ3TurboT2v, viduQ2T2v } from './models/vidu-t2v'
export { viduQ3ProI2v, viduQ3TurboI2v, viduQ2ProFastI2v, viduQ2ProI2v, viduQ2TurboI2v } from './models/vidu-i2v'
export { viduQ3ProI2vKF, viduQ3TurboI2vKF, viduQ2ProI2vKF, viduQ2TurboI2vKF } from './models/vidu-i2v-keyframe'
export { viduQ3MixR2v, viduQ3R2v, viduQ3TurboR2v, viduQ2ProR2v, viduQ2R2v } from './models/vidu-r2v'

// ---- PixVerse ----
export { pixverseC1T2v, pixverseV6T2v, pixverseV56T2v } from './models/pixverse-t2v'
export { pixverseC1I2v, pixverseV6I2v, pixverseV56I2v } from './models/pixverse-i2v'
export { pixverseC1I2vKF, pixverseV6I2vKF, pixverseV56I2vKF } from './models/pixverse-i2v-keyframe'
export { pixverseC1R2v, pixverseV6R2v, pixverseV56R2v } from './models/pixverse-r2v'

// ---- 可灵 ----
export { klingV3T2v, klingV3OmniT2v } from './models/kling-t2v'
export { klingV3I2v, klingV3OmniI2v, klingV3I2vKF, klingV3OmniI2vKF } from './models/kling-i2v'

// ---- 类型 ----
export type {
  FieldType,
  FieldGroup,
  FieldMeta,
  Category,
  VideoSubCategory,
  ModelDefinition,
  VideoModelRegistry,
  ValidationError,
  ValidationResult,
  PricingUnit,
  PriceTier,
  ModelPricing,
} from './types'

// ---- 校验 ----
export { validateParams, sanitizeParams, applyDefaults } from './validate'
