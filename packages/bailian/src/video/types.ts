// ---------------------------------------------------------------------------
// 参数元数据 & 模型定义 — 前端渲染表单 + 校验的核心
// ---------------------------------------------------------------------------

/** 表单控件类型 */
export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'range'

/** 请求体中该字段所属的分组 */
export type FieldGroup = 'input' | 'parameters'

/** 单个参数的运行时元数据 */
export interface FieldMeta {
  /** API 参数名，如 "resolution"、"ratio" */
  key: string
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
