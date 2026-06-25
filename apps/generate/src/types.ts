/** 镜像后端 generate/model.ts 与 @uhyc/bailian 的字段元数据。 */
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'range'
  | 'media'
  | 'color-palette'
  | 'shot-list'
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
  /** media 字段接受的媒体类型列表。未设置时默认为单图片上传 */
  mediaSlots?: MediaSlotConfig[]
}

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

/** media 字段的槽位配置 */
export interface MediaSlotConfig {
  type: MediaSlotType
  label: string
  accept: string
  maxCount?: number
  maxSizeMB?: number
  maxDurationSec?: number
}

export interface ModelDefinition {
  id: string
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
  /** bailian 媒体类型 */
  type: MediaSlotType
  /** 上传后的 URL（现阶段本地 blob，OSS 后接） */
  url: string
  /** 显示编号，如 "图1" / "视频1" / "[Image 1]"（按 refSyntax 生成） */
  label: string
  /** 本地预览缩略图 URL（视频/音频用占位） */
  thumbnail?: string
  /** 音频的参考音色 URL（仅 reference_image / reference_video 可附带） */
  referenceVoice?: string
}

// ---- creativity module (视频转剧本) ----
export interface CreativityTask {
  id: string
  userId: string
  videoUrl: string
  status: TaskStatus
  step: number
  asrResult?: {
    text: string
    srt: string
    sentences: Array<{
      begin_time: number
      end_time: number
      text: string
      sentence_id: number
    }>
  } | null
  scriptResult?: string | null
  mergedResult?: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export const STEP_LABELS = ['语音识别', '视频理解', '合并脚本']
export const STEP_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: '正在为尊贵超级VIP极速生成中',
  RUNNING: '进行中',
  SUCCEEDED: '已完成',
  FAILED: '失败',
  CANCELED: '已取消',
  UNKNOWN: '未知',
}

// prompt 编辑期的 token 结构（提交时序列化为字符串）。来自 lib/promptSerializer。
export type { PromptToken } from './lib/promptSerializer'
