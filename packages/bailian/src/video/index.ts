// ---------------------------------------------------------------------------
// 视频生成领域 — 模型注册表 & 导出
// ---------------------------------------------------------------------------

import { happyhorseT2v } from './models/happyhorse-t2v'
import { wan27T2v } from './models/wan2.7-t2v'
import type { VideoModelRegistry } from './types'

/**
 * 视频生成领域模型注册表。
 *
 * 前端消费方式：
 * 1. 遍历 `videoModels` 的 key（subCategory）渲染子 Tab
 * 2. 选中子 Tab 后列出对应数组中的模型
 * 3. 选择模型后遍历 `model.fields` 渲染参数表单
 */
export const videoModels: VideoModelRegistry = {
  'text-to-video': [happyhorseT2v, wan27T2v],
  'image-to-video': [],
  'reference-to-video': [],
  'video-editing': [],
}

/** 所有视频领域模型的扁平列表 */
export const allVideoModels = Object.values(videoModels).flat()

// ---- 模型定义 ----
export { happyhorseT2v } from './models/happyhorse-t2v'
export { wan27T2v } from './models/wan2.7-t2v'

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
} from './types'

// ---- 校验 ----
export { validateParams, sanitizeParams, applyDefaults } from './validate'
