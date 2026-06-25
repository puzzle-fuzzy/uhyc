import { t } from 'elysia'

/** 创建任务请求 */
export const CreateTaskBody = t.Object({
  videoUrl: t.String(),
})

/** 创造力任务响应 */
export const CreativityTaskResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  videoUrl: t.String(),
  status: t.Union([
    t.Literal('PENDING'),
    t.Literal('RUNNING'),
    t.Literal('SUCCEEDED'),
    t.Literal('FAILED'),
    t.Literal('CANCELED'),
    t.Literal('UNKNOWN'),
  ]),
  step: t.Number(),
  asrResult: t.Optional(t.Any()),
  scriptResult: t.Optional(t.String()),
  mergedResult: t.Optional(t.String()),
  errorMessage: t.Union([t.String(), t.Null()]),
  createdAt: t.String(),
  updatedAt: t.String(),
})

/** 任务列表响应 */
export const TaskListResponse = t.Object({
  items: t.Array(CreativityTaskResponse),
  total: t.Number(),
})

export type CreateTaskBody = typeof CreateTaskBody.static
