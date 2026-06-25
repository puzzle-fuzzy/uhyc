// ---------------------------------------------------------------------------
// 通用异步任务类型 — 所有百炼异步 API 共用
// ---------------------------------------------------------------------------

/** 任务状态 */
export const TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

/** 任务状态流转列表（前端轮询展示用） */
export const TASK_STATUS_ORDER: readonly TaskStatus[] = [
  TASK_STATUS.PENDING,
  TASK_STATUS.RUNNING,
  TASK_STATUS.SUCCEEDED,
] as const

/** 是否为终态 */
export function isTerminalStatus(s: TaskStatus): boolean {
  return (
    s === TASK_STATUS.SUCCEEDED ||
    s === TASK_STATUS.FAILED ||
    s === TASK_STATUS.CANCELED ||
    s === TASK_STATUS.UNKNOWN
  )
}

// ---------------------------------------------------------------------------
// 请求 / 响应
// ---------------------------------------------------------------------------

/** 步骤1 - 创建任务的成功响应（异步） */
export interface CreateTaskOutput {
  task_id: string
  task_status: TaskStatus
}

export interface CreateTaskResponse {
  output: CreateTaskOutput
  request_id: string
}

/** 同步模型的输出（如 qwen-image-edit，结果在 POST 响应中直接返回） */
export interface SyncOutput {
  choices: Array<{
    finish_reason: string
    message: {
      role: string
      content: Array<{ image?: string; text?: string }>
    }
  }>
}

export interface SyncTaskResponse {
  output: SyncOutput
  request_id: string
  usage?: {
    image_count?: number
    width?: number
    height?: number
  }
}

/** 步骤2 - 任务查询成功时的 usage 信息 */
export interface TaskUsage {
  duration: number
  input_video_duration: number
  output_video_duration: number
  video_count: number
  SR: number
  ratio: string
}

/** 步骤2 - 任务成功时的 output */
export interface TaskSuccessBase {
  task_id: string
  task_status: 'SUCCEEDED'
  submit_time: string
  scheduled_time: string
  end_time: string
  video_url: string
  orig_prompt: string
}

/** 步骤2 - 任务失败时的 output */
export interface TaskFailedOutput {
  task_id: string
  task_status: 'FAILED'
  code: string
  message: string
}

/** 步骤2 - 任务过期时的 output */
export interface TaskUnknownOutput {
  task_id: string
  task_status: 'UNKNOWN'
}

/** 步骤2 - 通用查询响应 */
export interface QueryTaskResponse<TOutput> {
  output: TOutput
  request_id: string
  usage?: TaskUsage
}

/** API 错误响应（创建任务失败时） */
export interface ApiErrorResponse {
  code: string
  message: string
  request_id: string
}

// ---------------------------------------------------------------------------
// 客户端配置
// ---------------------------------------------------------------------------

export interface BailianClientConfig {
  /** 百炼 API Key */
  apiKey: string
  /** 基础 URL，默认北京地域 */
  baseUrl?: string
}

export const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1'
