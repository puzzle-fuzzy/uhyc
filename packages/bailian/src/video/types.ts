// ---------------------------------------------------------------------------
// 参数元数据 & 模型定义 — 前端渲染表单 + 校验的核心
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 定价
// ---------------------------------------------------------------------------

/** 计费单位 */
export type PricingUnit = 'per_second' | 'per_image'

/** 价格档位：按某参数维度（如分辨率）匹配不同单价 */
export interface PriceTier {
  /** 匹配条件，如 { resolution: "720P" }。空对象表示统一价 */
  condition: Record<string, unknown>
  /** 单价（元） */
  price: number
}

/** 模型定价定义 */
export interface ModelPricing {
  /** 计费单位 */
  unit: PricingUnit
  /** 价格档位列表。第一个为默认档位 */
  tiers: PriceTier[]
  /** 决定总价乘数的参数字段 key（视频→duration，图像→n） */
  quantityKey: string
  /** 地域，默认 cn-beijing */
  region?: string
}

// ---------------------------------------------------------------------------

/** 表单控件类型 */
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'range'
  | 'media'
  | 'multi-text'
  | 'color-palette'
  | 'shot-list'

// ---------------------------------------------------------------------------
// 媒体素材类型 & 配置
// ---------------------------------------------------------------------------

/** 百炼 API media[] 中每个元素的 type 值 */
export type MediaSlotType =
  | 'reference_image'
  | 'reference_video'
  | 'first_frame'
  | 'last_frame'
  | 'driving_audio'
  | 'reference_voice'
  | 'video'
  | 'first_clip'
  | 'refer'
  | 'base'
  | 'feature'
  | 'image_url'
  | 'image'

/** media 字段的槽位配置：描述该字段接受哪些类型的媒体文件 */
export interface MediaSlotConfig {
  /** API type 值，如 'first_frame'、'reference_video' */
  type: MediaSlotType
  /** 上传按钮文案 */
  label: string
  /** HTML accept 属性 */
  accept: string
  /** 该类型最多上传数量。undefined = 不限（受 field 整体约束） */
  maxCount?: number
  /** 文件大小上限提示（MB），仅用于 UI 展示 */
  maxSizeMB?: number
  /** 文件时长限制提示（秒），用于视频/音频，仅 UI 展示 */
  maxDurationSec?: number
}

/** 请求体中该字段所属的分组 */
export type FieldGroup = 'input' | 'parameters'

/** 单个参数的运行时元数据 */
export interface FieldMeta {
  /** API 参数名，如 "resolution"、"ratio" */
  key: string
  /** 发送到 API 的参数名，当与 key 不同时使用（如 key='resolution' 但 API 期望 'size'） */
  apiKey?: string
  /** 前端表单 label */
  label: string
  /** 补充说明，以 tooltip 形式展示 */
  description?: string
  /** 控件类型，前端据此渲染组件 */
  type: FieldType
  /** 请求体分组 */
  group: FieldGroup
  /** 默认值 */
  defaultValue?: unknown
  /** 是否必填 */
  required?: boolean

  // --- select 专有 ---
  /** 可选项列表 */
  options?: { label: string; value: unknown }[]

  // --- number / range 专有 ---
  min?: number
  max?: number

  // --- text 专有 ---
  maxLength?: number

  // --- media 专有 ---
  /** 该字段接受的媒体类型列表。前端据此渲染对应的上传入口。
   *  未设置时默认为单图片上传（向后兼容）。 */
  mediaSlots?: MediaSlotConfig[]
}

// ---------------------------------------------------------------------------
// 领域分类
// ---------------------------------------------------------------------------

/** 大类 */
export type Category = 'image' | 'video' | 'music'

/** 视频领域的小类 */
export type VideoSubCategory =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'video-editing'

// ---------------------------------------------------------------------------
// 模型定义
// ---------------------------------------------------------------------------

/** 模型完整定义 */
export interface ModelDefinition<SubCategory extends string = string> {
  /** 前端唯一标识，用于模型选择和数据关联。不与 API 模型 ID 耦合 */
  id: string
  /** API 调用时的模型标识，如 "wan2.7-t2v" */
  model: string
  /** 该模型支持的所有版本 */
  supportedModels: string[]
  /** 前端展示名称 */
  displayName: string
  /** 大类 */
  category: Category
  /** 小类 */
  subCategory: SubCategory
  /** 有序参数列表，前端按数组顺序渲染 */
  fields: FieldMeta[]
  /** 创建任务的 API 路径（相对 baseUrl），如 "/services/aigc/video-generation/video-synthesis" */
  endpoint: string
  /** 是否异步 API（创建任务 → 轮询结果）。false 表示同步返回结果 */
  async: boolean
  /** 定价信息（北京地域默认价格） */
  pricing: ModelPricing
  /** prompt 中参考素材的引用语法风格，决定 chip 序列化格式。
   *  存在时表示该模型支持多素材（r2v/video-edit），前端启用 @ 编辑器。
   *  - 'bracket-en'：chip → `[Image N]`（仅图片）
   *  - 'cn-prefixed'：chip → `图N` / `视频N`（图/视频分别计数）
   */
  refSyntax?: 'bracket-en' | 'cn-prefixed'
}

// ---------------------------------------------------------------------------
// 注册表
// ---------------------------------------------------------------------------

/**
 * 视频领域注册表：小类 → 模型列表。
 * 新增模型只需在对应小类数组中追加 ModelDefinition。
 */
export type VideoModelRegistry = Record<VideoSubCategory, ModelDefinition<VideoSubCategory>[]>

// ---------------------------------------------------------------------------
// 校验结果
// ---------------------------------------------------------------------------

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/** prompt 中参考素材的引用语法风格 */
export type RefSyntax = 'bracket-en' | 'cn-prefixed'
