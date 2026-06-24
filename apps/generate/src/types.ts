/** 镜像后端 generate/model.ts 与 @uhyc/bailian 的字段元数据。 */
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'range'
  | 'media'
export type FieldGroup = 'input' | 'parameters'

export interface FieldMeta {
  key: string
  label: string
  type: FieldType
  group: FieldGroup
  description?: string
  defaultValue?: unknown
  required?: boolean
  options?: { label: string; value: unknown }[]
  min?: number
  max?: number
  maxLength?: number
}

export interface ModelDefinition {
  model: string
  supportedModels: string[]
  displayName: string
  category: string
  subCategory: string
  endpoint: string
  fields: FieldMeta[]
  refSyntax?: RefSyntax
}

export type Catalog = Record<string, Record<string, ModelDefinition[]>>

export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'UNKNOWN'

export interface TaskFile {
  id: string
  kind: string
  storagePath: string
  sourceUrl: string | null
  mimeType: string | null
  sizeBytes: number | null
  originalFilename: string | null
}

export interface TaskResponse {
  id: string
  userId: string
  bailianTaskId: string | null
  createRequestId: string | null
  category: string
  subCategory: string
  model: string
  params: Record<string, unknown>
  status: TaskStatus
  errorMessage: string | null
  files?: TaskFile[]
  createdAt: string
  updatedAt: string
}

/** prompt 中参考素材的引用语法风格（镜像 bailian） */
export type RefSyntax = 'bracket-en' | 'cn-prefixed'

/** 一个参考素材（参考素材区的产物，也是 media[] 的元素） */
export interface MediaItem {
  /** 前端临时 id */
  id: string
  /** bailian 类型 */
  type: 'reference_image' | 'reference_video' | 'first_frame'
  /** 上传后的 URL（现阶段本地 blob，OSS 后接） */
  url: string
  /** 显示编号，如 "图1" / "视频1" / "[Image 1]"（按 refSyntax 生成） */
  label: string
  /** 本地预览缩略图 URL（视频用占位） */
  thumbnail?: string
}

// prompt 编辑期的 token 结构（提交时序列化为字符串）。来自 lib/promptSerializer。
export type { PromptToken } from './lib/promptSerializer'
