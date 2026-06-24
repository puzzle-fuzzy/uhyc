import { t } from 'elysia'

/** 单个模型字段元数据（镜像 @uhyc/bailian 的 FieldMeta） */
export const FieldMeta = t.Object({
  key: t.String(),
  label: t.String(),
  type: t.Union([
    t.Literal('text'),
    t.Literal('number'),
    t.Literal('boolean'),
    t.Literal('select'),
    t.Literal('range'),
  ]),
  group: t.Union([t.Literal('input'), t.Literal('parameters')]),
  description: t.Optional(t.String()),
  defaultValue: t.Optional(t.Unknown()),
  required: t.Optional(t.Boolean()),
  options: t.Optional(
    t.Array(t.Object({ label: t.String(), value: t.Unknown() })),
  ),
  min: t.Optional(t.Number()),
  max: t.Optional(t.Number()),
  maxLength: t.Optional(t.Number()),
})

/** 模型定义 */
export const ModelDefinition = t.Object({
  model: t.String(),
  supportedModels: t.Array(t.String()),
  displayName: t.String(),
  category: t.String(),
  subCategory: t.String(),
  endpoint: t.String(),
  fields: t.Array(FieldMeta),
})

/** catalog 响应：三大类 → 子类 → 模型列表 */
export const CatalogResponse = t.Record(
  t.String(),
  t.Record(t.String(), t.Array(ModelDefinition)),
)

/** 创建任务请求 */
export const CreateTaskBody = t.Object({
  category: t.String(),
  subCategory: t.String(),
  model: t.String(),
  params: t.Record(t.String(), t.Unknown()),
})

/** 任务文件 */
export const TaskFile = t.Object({
  id: t.String(),
  kind: t.String(),
  storagePath: t.String(),
  sourceUrl: t.Union([t.String(), t.Null()]),
  mimeType: t.Union([t.String(), t.Null()]),
  sizeBytes: t.Union([t.Number(), t.Null()]),
  originalFilename: t.Union([t.String(), t.Null()]),
})

/** 任务状态字面量联合 */
export const TaskStatusLiteral = t.Union([
  t.Literal('PENDING'),
  t.Literal('RUNNING'),
  t.Literal('SUCCEEDED'),
  t.Literal('FAILED'),
  t.Literal('CANCELED'),
  t.Literal('UNKNOWN'),
])

/** 任务响应 */
export const TaskResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  bailianTaskId: t.Union([t.String(), t.Null()]),
  createRequestId: t.Union([t.String(), t.Null()]),
  category: t.String(),
  subCategory: t.String(),
  model: t.String(),
  params: t.Record(t.String(), t.Unknown()),
  status: TaskStatusLiteral,
  errorMessage: t.Union([t.String(), t.Null()]),
  files: t.Optional(t.Array(TaskFile)),
  createdAt: t.String(),
  updatedAt: t.String(),
})

/** 任务列表响应 */
export const TaskListResponse = t.Object({
  items: t.Array(TaskResponse),
  total: t.Number(),
})

/** 校验错误 */
export const ValidationErrorResponse = t.Object({
  error: t.String(),
  errors: t.Optional(
    t.Array(t.Object({ field: t.String(), message: t.String() })),
  ),
})

export type TaskResponse = typeof TaskResponse.static
export type CreateTaskBody = typeof CreateTaskBody.static
