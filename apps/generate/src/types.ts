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
