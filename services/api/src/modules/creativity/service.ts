import { desc, eq, isNull } from 'drizzle-orm'
import { status } from 'elysia'

import { db, table, type CreativityTask } from '@uhyc/db'
import type { BailianClientConfig } from '@uhyc/bailian'
import { DEFAULT_BASE_URL } from '@uhyc/bailian'
import { presenceManager } from '../presence/manager'

const POLL_INTERVAL = 5000
const MAX_POLLS = 60

export type StatusReturn = ReturnType<typeof status>
export const isStatusReturn = (v: unknown): v is StatusReturn =>
  typeof v === 'object' && v !== null && 'code' in v && 'response' in v

function bailianConfig(): BailianClientConfig {
  const apiKey = process.env.BAILIAN_API_KEY
  if (!apiKey || apiKey === 'replace-with-real-key') {
    throw new Error('未配置 BAILIAN_API_KEY，请在 .env 文件中设置有效的百炼 API Key')
  }
  return { apiKey, baseUrl: process.env.BAILIAN_BASE_URL }
}

function toTaskResponse(task: CreativityTask) {
  return {
    id: task.id,
    userId: task.userId,
    videoUrl: task.videoUrl,
    status: task.status,
    step: task.step,
    asrResult: task.asrResult as Record<string, unknown> | null | undefined,
    scriptResult: task.scriptResult,
    mergedResult: task.mergedResult,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

async function updateTask(
  taskId: string,
  userId: string,
  patch: Partial<CreativityTask>,
): Promise<CreativityTask> {
  const [updated] = await db
    .update(table.creativityTasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(table.creativityTasks.id, taskId))
    .returning()

  // 通过 WS 推送给任务创建者
  const taskResp = toTaskResponse(updated)
  presenceManager.broadcastTask(userId, { type: 'task_updated', task: taskResp })

  return updated
}

// ---------------------------------------------------------------------------
// 步骤1：语音识别（ASR）
// ---------------------------------------------------------------------------

/** 异步提交 ASR 任务 */
async function submitAsr(config: BailianClientConfig, videoUrl: string) {
  const base = config.baseUrl ?? DEFAULT_BASE_URL
  const res = await fetch(`${base}/services/audio/asr/transcription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'paraformer-v2',
      input: { file_urls: [videoUrl] },
      parameters: {
        diarization_enabled: true,
        timestamp_alignment_enabled: true,
      },
    }),
  })
  const json = await res.json()
  if (!res.ok) {
    const err = json as { code?: string; message?: string; request_id?: string }
    throw new Error(err.message || `ASR 提交失败 (HTTP ${res.status})`)
  }
  return json as { output: { task_id: string }; request_id: string }
}

/** 轮询 ASR 任务直到完成 */
async function pollAsr(
  config: BailianClientConfig,
  taskId: string,
  requestId: string,
): Promise<{ text: string; srt: string; sentences: unknown[] }> {
  const base = config.baseUrl ?? DEFAULT_BASE_URL
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(`${base}/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(
        (json as { message?: string }).message || `ASR 查询失败 (HTTP ${res.status})`,
      )
    }
    const output = (json as Record<string, unknown>).output as Record<string, unknown> | undefined
    const status = output?.task_status as string | undefined

    if (status === 'SUCCEEDED') {
      // 获取 transcription_url → 下载转录 JSON
      const transcriptionUrl = output?.transcription_url as string | undefined
      if (!transcriptionUrl) {
        throw new Error('ASR 成功但未返回 transcription_url')
      }
      const transRes = await fetch(transcriptionUrl)
      const transJson = await transRes.json() as {
        transcripts?: Array<{
          text?: string
          sentences?: Array<{
            begin_time?: number
            end_time?: number
            text?: string
            sentence_id?: number
          }>
        }>
      }
      const transcript = transJson.transcripts?.[0]
      const fullText = transcript?.text ?? ''
      const sentences = transcript?.sentences ?? []

      // 生成 SRT
      const srt = sentences
        .map((s) => {
          const id = s.sentence_id ?? 0
          const start = msToSrtTime(s.begin_time ?? 0)
          const end = msToSrtTime(s.end_time ?? 0)
          return `${id}\n${start} --> ${end}\n${s.text ?? ''}\n`
        })
        .join('\n')

      return { text: fullText, srt, sentences }
    }

    if (status === 'FAILED') {
      throw new Error(
        [output?.code, output?.message].filter(Boolean).join(': ') || 'ASR 识别失败',
      )
    }

    await sleep(POLL_INTERVAL)
  }
  throw new Error(`ASR 任务 ${requestId} 轮询超时`)
}

function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const msRest = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msRest).padStart(3, '0')}`
}

// ---------------------------------------------------------------------------
// 步骤2：视频理解 → 剧本
// ---------------------------------------------------------------------------

async function videoUnderstand(config: BailianClientConfig, videoUrl: string) {
  const base = config.baseUrl ?? DEFAULT_BASE_URL
  const res = await fetch(
    `${base}/services/aigc/multimodal-generation/generation`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { video: videoUrl },
                {
                  text: '请详细描述这个视频的内容，包括场景变化、人物动作、对话内容等，按照时间顺序生成完整的剧本格式。包含场景标题、人物、动作描述和对话。',
                },
              ],
            },
          ],
        },
      }),
    },
  )
  const json = await res.json()
  if (!res.ok) {
    const err = json as { code?: string; message?: string }
    throw new Error(err.message || `视频理解失败 (HTTP ${res.status})`)
  }
  const output = (json as Record<string, unknown>).output as
    | { choices?: Array<{ message?: { content?: Array<{ text?: string }> } }> }
    | undefined
  const text = output?.choices?.[0]?.message?.content?.[0]?.text ?? ''
  if (!text) throw new Error('视频理解返回内容为空')
  return text
}

// ---------------------------------------------------------------------------
// 步骤3：合并 → 专业脚本
// ---------------------------------------------------------------------------

async function mergeScript(
  config: BailianClientConfig,
  asrText: string,
  scriptText: string,
) {
  const base = config.baseUrl ?? DEFAULT_BASE_URL
  const res = await fetch(
    `${base}/services/aigc/multimodal-generation/generation`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: `你有一个视频的语音识别文本和场景分析剧本，请将它们合并为一个格式化的专业视频脚本。

语音识别文本（带时间戳的字幕）：
${asrText}

场景分析剧本：
${scriptText}

请输出格式化的专业脚本，包含：
1. 场景标题和编号
2. 画面描述
3. 对话（带时间码）
4. 旁白/音效说明
5. 镜头建议

使用专业剧本格式，中英文均可。`,
                },
              ],
            },
          ],
        },
      }),
    },
  )
  const json = await res.json()
  if (!res.ok) {
    const err = json as { code?: string; message?: string }
    throw new Error(err.message || `合并脚本失败 (HTTP ${res.status})`)
  }
  const output = (json as Record<string, unknown>).output as
    | { choices?: Array<{ message?: { content?: Array<{ text?: string }> } }> }
    | undefined
  const text = output?.choices?.[0]?.message?.content?.[0]?.text ?? ''
  if (!text) throw new Error('合并脚本返回内容为空')
  return text
}

// ---------------------------------------------------------------------------
// Pipeline 编排
// ---------------------------------------------------------------------------

async function runPipeline(taskId: string, userId: string, videoUrl: string) {
  const config = bailianConfig()

  try {
    // -- 步骤1: ASR --
    await updateTask(taskId, userId, { status: 'RUNNING', step: 0 })
    const asrSubmitted = await submitAsr(config, videoUrl)
    const asrResult = await pollAsr(config, asrSubmitted.output.task_id, asrSubmitted.request_id)
    await updateTask(taskId, userId, {
      asrResult: asrResult as unknown as Record<string, unknown>,
      step: 1,
    })

    // -- 步骤2: 视频理解 --
    await updateTask(taskId, userId, { step: 2 })
    const script = await videoUnderstand(config, videoUrl)
    await updateTask(taskId, userId, { scriptResult: script, step: 3 })

    // -- 步骤3: 合并 --
    await updateTask(taskId, userId, { step: 4 })
    const merged = await mergeScript(config, asrResult.text, script)
    await updateTask(taskId, userId, {
      mergedResult: merged,
      step: 5,
      status: 'SUCCEEDED',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '处理失败'
    await updateTask(taskId, userId, { status: 'FAILED', errorMessage: msg })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export abstract class CreativityService {
  static async create(userId: string, body: { videoUrl: string }) {
    const [row] = await db
      .insert(table.creativityTasks)
      .values({
        userId,
        videoUrl: body.videoUrl,
        status: 'PENDING',
        step: 0,
      })
      .returning()

    // 异步启动 pipeline（不阻塞响应）
    runPipeline(row.id, userId, body.videoUrl).catch((e) => {
      console.error(`Pipeline ${row.id} failed:`, e)
    })

    return { task: toTaskResponse(row) }
  }

  static async list(userId: string, limit = 50) {
    const rows = await db
      .select()
      .from(table.creativityTasks)
      .where(and(eq(table.creativityTasks.userId, userId), isNull(table.creativityTasks.deletedAt)))
      .orderBy(desc(table.creativityTasks.createdAt))
      .limit(limit)

    return { items: rows.map(toTaskResponse), total: rows.length }
  }

  static async findOne(userId: string, taskId: string) {
    const [row] = await db
      .select()
      .from(table.creativityTasks)
      .where(eq(table.creativityTasks.id, taskId))
      .limit(1)

    if (!row || row.userId !== userId) {
      return status(404, { error: 'Task not found', errors: [] })
    }

    return { task: toTaskResponse(row) }
  }

  static async delete(userId: string, taskId: string) {
    const [row] = await db
      .select()
      .from(table.creativityTasks)
      .where(eq(table.creativityTasks.id, taskId))
      .limit(1)

    if (!row || row.userId !== userId) {
      return status(404, { error: 'Task not found', errors: [] })
    }

    if (row.status !== 'FAILED') {
      return status(400, { error: '仅允许删除失败的任务' })
    }
    await db
      .update(table.creativityTasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(table.creativityTasks.id, taskId))
    return { ok: true }
  }
}
