// ---------------------------------------------------------------------------
// @uhyc/bailian — 百炼模型参数类型系统 & API 客户端
//
// 顶层导出：
//   - 所有领域的模型注册表
//   - 共享类型 & 常量
//   - API 客户端
// ---------------------------------------------------------------------------

// ---- 领域注册表 ----
export { videoModels, allVideoModels } from './video'
export { imageModels, allImageModels } from './image'
export { musicModels, allMusicModels } from './music'

// ---- 类型（从 video 领域集中导出，其他领域复用同一套类型系统） ----
export type {
  FieldType,
  FieldGroup,
  FieldMeta,
  Category,
  ModelDefinition,
  ValidationError,
  ValidationResult,
  PricingUnit,
  PriceTier,
  ModelPricing,
  RefSyntax,
} from './video/types'
export type { VideoSubCategory } from './video/types'
export type { ImageSubCategory } from './image'
export type { MusicSubCategory } from './music'

// ---- 校验 ----
export { validateParams, sanitizeParams, applyDefaults } from './video/validate'

// ---- 共享类型 ----
export type {
  TaskStatus,
  CreateTaskResponse,
  QueryTaskResponse,
  TaskUsage,
  TaskSuccessBase,
  TaskFailedOutput,
  TaskUnknownOutput,
  ApiErrorResponse,
  BailianClientConfig,
} from './shared/types'
export {
  TASK_STATUS,
  TASK_STATUS_ORDER,
  isTerminalStatus,
  DEFAULT_BASE_URL,
} from './shared/types'

// ---- API 客户端 ----
export { createTask, queryTask, waitForCompletion } from './shared/client'
export type { PollOptions } from './shared/client'

// ---- 价格计算 ----
export { calcPrice, getDefaultUnitPrice } from './shared/pricing'
