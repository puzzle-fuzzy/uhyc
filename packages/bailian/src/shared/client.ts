import type { ModelDefinition } from '../video/types'
import type {
  CreateTaskResponse,
  SyncTaskResponse,
  QueryTaskResponse,
  ApiErrorResponse,
  BailianClientConfig,
} from './types'
import { DEFAULT_BASE_URL, isTerminalStatus } from './types'
import { formatBailianError } from './errors'

// ---------------------------------------------------------------------------
// 百炼 API 客户端（支持同步与异步任务）
// ---------------------------------------------------------------------------

/**
 * 将用户参数按 group 拆分为 `input` 和 `parameters`，
 * 构建百炼 API 请求体。
 */
function buildRequestBody(
  definition: ModelDefinition,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  const parameters: Record<string, unknown> = {}

  for (const field of definition.fields) {
    const value = params[field.key]
    if (value === undefined || value === null || value === '') continue

    if (field.group === 'input') {
      input[field.key] = value
    } else {
      parameters[field.key] = value
    }
  }

  return {
    model: definition.model,
    input,
    parameters,
  }
}

/**
 * 多模态生成（multimodal-generation）专用请求体。
 *
 * 部分模型（如 qwen-image-edit、qwen-t2i）使用 Chat 风格的 API 格式，
 * 要求 input 中传 `messages` 数组，而非平铺的 key-value。
 *
 * 字段映射规则：
 *   - type='media' 的 input 字段 → content 中的 `{"image": url}`
 *   - type='text'   的 input 字段 → content 中的 `{"text": text}`
 *   - parameters 分组 → 原样放入 parameters
 */
function buildMultimodalBody(
  definition: ModelDefinition,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const content: Record<string, string>[] = []
  const parameters: Record<string, unknown> = {}

  for (const field of definition.fields) {
    const value = params[field.key]
    if (value === undefined || value === null || value === '') continue

    if (field.group === 'input') {
      if (field.type === 'media') {
        // images 字段：支持单 URL 或 URL 数组
        const urls = Array.isArray(value) ? value : [value]
        for (const url of urls) {
          if (typeof url === 'string') {
            content.push({ image: url })
          }
        }
      } else if (field.type === 'text') {
        content.push({ text: String(value) })
      }
    } else {
      parameters[field.key] = value
    }
  }

  return {
    model: definition.model,
    input: {
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    },
    parameters,
  }
}

/** POST 请求头。仅当模型标记为 async: true 时添加异步头。 */
function postHeaders(
  apiKey: string,
  definition: ModelDefinition,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (definition.async) {
    headers['X-DashScope-Async'] = 'enable'
  }
  return headers
}

/** 通用的 GET 请求头（查询任务） */
function queryHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
  }
}

// ---------------------------------------------------------------------------
// API 调用
// ---------------------------------------------------------------------------

/**
 * 步骤1：创建异步任务。
 *
 * @param config  客户端配置
 * @param definition  模型定义
 * @param params  用户填写的参数（key-value）
 * @returns  包含 task_id 的响应
 */
/** 多模态生成端点使用 Chat 格式，其余使用直接参数格式。 */
/** 多模态生成和图像生成端点使用 Chat 格式，其余使用直接参数格式。 */
function chooseBodyBuilder(definition: ModelDefinition): typeof buildRequestBody {
  const chatEndpoints = [
    '/services/aigc/multimodal-generation/generation',
    '/services/aigc/image-generation/generation',
  ]
  return chatEndpoints.includes(definition.endpoint)
    ? buildMultimodalBody
    : buildRequestBody
}

export async function createTask(
  config: BailianClientConfig,
  definition: ModelDefinition,
  params: Record<string, unknown>,
): Promise<CreateTaskResponse | SyncTaskResponse> {
  const base = config.baseUrl ?? DEFAULT_BASE_URL
  const url = `${base}${definition.endpoint}`
  const buildBody = chooseBodyBuilder(definition)
  const body = buildBody(definition, params)

  const res = await fetch(url, {
    method: 'POST',
    headers: postHeaders(config.apiKey, definition),
    body: JSON.stringify(body),
  })

  const json = await res.json()

  if (!res.ok) {
    const err = json as ApiErrorResponse
    throw new Error(formatBailianError(err))
  }

  return json as CreateTaskResponse | SyncTaskResponse
}

/**
 * 步骤2：查询异步任务状态与结果。
 *
 * @param config  客户端配置
 * @param taskId  步骤1返回的 task_id
 * @returns  任务查询响应
 */
export async function queryTask<TOutput = unknown>(
  config: BailianClientConfig,
  taskId: string,
): Promise<QueryTaskResponse<TOutput>> {
  const base = config.baseUrl ?? DEFAULT_BASE_URL
  const url = `${base}/tasks/${encodeURIComponent(taskId)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: queryHeaders(config.apiKey),
  })

  const json = await res.json()

  if (!res.ok) {
    const err = json as ApiErrorResponse
    throw new Error(formatBailianError(err))
  }

  return json as QueryTaskResponse<TOutput>
}

// ---------------------------------------------------------------------------
// 轮询辅助
// ---------------------------------------------------------------------------

export interface PollOptions {
  /** 轮询间隔（毫秒），默认 15000 */
  intervalMs?: number
  /** 最大轮询次数，默认 40（10 分钟 @ 15s 间隔） */
  maxAttempts?: number
  /** 进度回调，每次轮询后调用 */
  onProgress?: (status: string, attempt: number) => void
}

/**
 * 轮询直到任务完成（成功或失败）。
 *
 * @param config  客户端配置
 * @param taskId  任务 ID
 * @param options  轮询选项
 * @returns  最终的任务查询响应
 */
export async function waitForCompletion<TOutput = unknown>(
  config: BailianClientConfig,
  taskId: string,
  options: PollOptions = {},
): Promise<QueryTaskResponse<TOutput>> {
  const { intervalMs = 15000, maxAttempts = 40, onProgress } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await queryTask<TOutput>(config, taskId)
    const status = (result.output as any)?.task_status

    onProgress?.(status, attempt)

    if (!status || isTerminalStatus(status)) {
      return result
    }

    if (attempt < maxAttempts) {
      await sleep(intervalMs)
    }
  }

  throw new Error(
    `任务 ${taskId} 在 ${maxAttempts} 次轮询后仍未完成，请手动查询`,
  )
}

/** Promise-based sleep (works in Bun, Node, and browser). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
