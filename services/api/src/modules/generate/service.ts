import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { status } from 'elysia'

import {
  allImageModels,
  allMusicModels,
  allVideoModels,
  applyDefaults,
  createTask,
  isTerminalStatus,
  queryTask,
  sanitizeParams,
  validateParams,
  translateBailianError,
  type CreateTaskResponse,
  type ModelDefinition,
  type BailianClientConfig,
  type SyncTaskResponse,
} from '@uhyc/bailian'
import { db, table, type GenerationTask, type GenerationTaskFile } from '@uhyc/db'

import { taskPoller } from '../presence/task-poller'
import { downloadToTaskDir, extractVideoResultUrl } from './storage'
import { generateKey, isOSSConfigured, uploadBuffer } from '../../lib/oss'
import type { CreateTaskBody } from './model'

const ALL_MODELS: ModelDefinition[] = [
  ...allVideoModels,
  ...allImageModels,
  ...allMusicModels,
]

/**
 * 运行时判定 service 返回的是 Elysia `status()` 错误值还是正常数据。
 * Elysia `status()` 返回 `{ code, response }`（无 `status` 键），正常返回 `{ task }`。
 * 与 auth 模块同构（见 modules/auth/service.ts 的 isStatusReturn）。
 */
export type StatusReturn = ReturnType<typeof status>
export const isStatusReturn = (v: unknown): v is StatusReturn =>
  typeof v === 'object' &&
  v !== null &&
  'code' in v &&
  'response' in v

function bailianConfig(): BailianClientConfig {
  const apiKey = process.env.BAILIAN_API_KEY
  if (!apiKey || apiKey === 'replace-with-real-key') {
    throw new Error('未配置 BAILIAN_API_KEY，请在 .env 文件中设置有效的百炼 API Key')
  }
  return {
    apiKey,
    baseUrl: process.env.BAILIAN_BASE_URL,
  }
}

function findModel(category: string, subCategory: string, model: string) {
  return ALL_MODELS.find(
    (m) =>
      m.category === category &&
      m.subCategory === subCategory &&
      m.model === model,
  )
}

function toFileRow(f: GenerationTaskFile) {
  return {
    id: f.id,
    kind: f.kind,
    storagePath: f.storagePath,
    sourceUrl: f.sourceUrl,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    originalFilename: f.originalFilename,
  }
}

export function toTaskResponse(
  task: GenerationTask,
  files: GenerationTaskFile[] = [],
) {
  return {
    id: task.id,
    userId: task.userId,
    bailianTaskId: task.bailianTaskId,
    createRequestId: task.createRequestId,
    category: task.category,
    subCategory: task.subCategory,
    model: task.model,
    params: task.params as Record<string, unknown>,
    status: task.status,
    errorMessage: task.errorMessage,
    files: files.map(toFileRow),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

/** 按 subCategory 分组。 */
function groupBySubCategory(
  models: ModelDefinition[],
): Record<string, ModelDefinition[]> {
  const out: Record<string, ModelDefinition[]> = {}
  for (const m of models) {
    ;(out[m.subCategory] ??= []).push(m)
  }
  return out
}

/** 按 category 下载产物文件。video 解析 video_url；其余领域留待补模型。 */
async function downloadResultFiles(
  taskId: string,
  category: string,
  output: unknown,
) {
  if (category === 'video') {
    const url = extractVideoResultUrl(output)
    if (!url) return
    const info = await downloadToTaskDir(taskId, url)

    // 如 OSS 已配置则上传到 OSS
    let storagePath = info.storagePath
    if (isOSSConfigured()) {
      const ext = info.originalFilename.split('.').pop() || 'mp4'
      const key = generateKey('tasks', taskId, ext)
      const ossUrl = await uploadBuffer(key, info.buffer, info.mimeType || undefined)
      storagePath = ossUrl // 用 OSS URL 替代本地路径
    }

    await db.insert(table.generationTaskFiles).values({
      taskId,
      kind: 'primary',
      sourceUrl: url,
      storagePath,
      mimeType: info.mimeType,
      sizeBytes: info.sizeBytes,
      originalFilename: info.originalFilename,
    })
  }
  // image / music 待补模型后在此分支实现
}

export abstract class GenerateService {
  /** 模型目录，序列化返回前端。 */
  static catalog(): Record<string, Record<string, ModelDefinition[]>> {
    return {
      video: groupBySubCategory(allVideoModels),
      image: groupBySubCategory(allImageModels),
      music: groupBySubCategory(allMusicModels),
    }
  }

  /** 创建任务：校验 → 入库 PENDING → 调百炼 → 回写 task_id。 */
  static async create(userId: string, body: CreateTaskBody) {
    const definition = findModel(body.category, body.subCategory, body.model)
    if (!definition) {
      return status(422, { error: 'Unknown model', errors: [] })
    }

    const sanitized = sanitizeParams(definition, body.params)
    const validation = validateParams(definition, sanitized)
    if (!validation.valid) {
      return status(422, { error: '参数校验失败', errors: validation.errors })
    }
    const finalParams = applyDefaults(definition, sanitized)

    // 先落本地行（即便百炼失败也有记录）
    const [row] = await db
      .insert(table.generationTasks)
      .values({
        userId,
        category: body.category,
        subCategory: body.subCategory,
        model: body.model,
        params: finalParams,
        status: 'PENDING',
      })
      .returning()

    try {
      const res = await createTask(bailianConfig(), definition, finalParams)

      if (!definition.async && 'choices' in (res as SyncTaskResponse).output) {

      if (!definition.async && 'audio' in (res as any).output) {
        const audioUrl = (res as any).output.audio.url as string | undefined
        if (audioUrl) {
          try {
            const info = await downloadToTaskDir(row.id, audioUrl)
            await db.insert(table.generationTaskFiles).values({
              taskId: row.id,
              kind: 'primary',
              sourceUrl: audioUrl,
              storagePath: info.storagePath,
              mimeType: info.mimeType || 'audio/mpeg',
              sizeBytes: info.sizeBytes,
              originalFilename: info.originalFilename,
            })
          } catch (e) {
            await db.insert(table.generationTaskFiles).values({
              taskId: row.id,
              kind: 'primary',
              sourceUrl: audioUrl,
              storagePath: audioUrl,
              mimeType: 'audio/mpeg',
            }).catch(function() {})
          }
        }
        const [updated] = await db
          .update(table.generationTasks)
          .set({ status: 'SUCCEEDED', createRequestId: (res as any).request_id, updatedAt: new Date() })
          .where(eq(table.generationTasks.id, row.id))
          .returning()
        const taskFiles = await db
          .select()
          .from(table.generationTaskFiles)
          .where(eq(table.generationTaskFiles.taskId, row.id))
        return { task: toTaskResponse(updated, taskFiles) }
      }
        // 同步模型：结果已返回，直接处理
        const syncRes = res as SyncTaskResponse
        const content = syncRes.output.choices?.[0]?.message?.content ?? []
        const imageUrls = content
          .map((c) => c.image)
          .filter((u): u is string => Boolean(u))

        if (imageUrls.length > 0) {
          // 下载结果并生成 task_files 记录
          const files: { storagePath: string; mimeType: string | null; sizeBytes: number | null; originalFilename: string }[] = []
          for (let i = 0; i < imageUrls.length; i++) {
            const info = await downloadToTaskDir(row.id, imageUrls[i])
            files.push(info)
          }

          await db.insert(table.generationTaskFiles).values(
            files.map((info) => ({
              taskId: row.id,
              kind: 'primary',
              sourceUrl: imageUrls[0],
              storagePath: info.storagePath,
              mimeType: info.mimeType,
              sizeBytes: info.sizeBytes,
              originalFilename: info.originalFilename,
            })),
          )
        }

        const [updated] = await db
          .update(table.generationTasks)
          .set({ status: 'SUCCEEDED', createRequestId: syncRes.request_id, updatedAt: new Date() })
          .where(eq(table.generationTasks.id, row.id))
          .returning()
        const taskFiles = await db
          .select()
          .from(table.generationTaskFiles)
          .where(eq(table.generationTaskFiles.taskId, row.id))
        return { task: toTaskResponse(updated, taskFiles) }
      }

      // 异步模型：回写 task_id，后续由 TaskPoller 通过 WS 推送状态
      const asyncRes = res as CreateTaskResponse
      const [updated] = await db
        .update(table.generationTasks)
        .set({
          bailianTaskId: asyncRes.output.task_id,
          createRequestId: asyncRes.request_id,
          updatedAt: new Date(),
        })
        .where(eq(table.generationTasks.id, row.id))
        .returning()

      // 注册服务端轮询（替代前端 HTTP 轮询）
      taskPoller.register(row.id, userId)

      return { task: toTaskResponse(updated) }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'createTask failed'
      const [updated] = await db
        .update(table.generationTasks)
        .set({ status: 'FAILED', errorMessage: msg, updatedAt: new Date() })
        .where(eq(table.generationTasks.id, row.id))
        .returning()
      return { task: toTaskResponse(updated) }
    }
  }

  /** 列出当前用户历史记录（最新在前），附带文件信息。 */
  /** 列出当前用户历史记录（最新在前），附带文件信息。
   *  当 all=true 时返回所有用户的记录（开发调试用）。 */
  static async list(userId: string, limit = 50, all = false) {
    const rows = all
      ? await db
          .select()
          .from(table.generationTasks)
          .where(isNull(table.generationTasks.deletedAt))
          .orderBy(desc(table.generationTasks.createdAt))
          .limit(limit)
      : await db
          .select()
          .from(table.generationTasks)
          .where(and(eq(table.generationTasks.userId, userId), isNull(table.generationTasks.deletedAt)))
          .orderBy(desc(table.generationTasks.createdAt))
          .limit(limit)

    // 批量加载所有任务的 files，按 taskId 分组
    const taskIds = rows.map((r) => r.id)
    const filesByTaskId = new Map<string, GenerationTaskFile[]>()
    if (taskIds.length > 0) {
      const fileRows = await db
        .select()
        .from(table.generationTaskFiles)
        .where(inArray(table.generationTaskFiles.taskId, taskIds))
      for (const f of fileRows) {
        const list = filesByTaskId.get(f.taskId)
        if (list) list.push(f)
        else filesByTaskId.set(f.taskId, [f])
      }
    }

    return {
      items: rows.map((r) => toTaskResponse(r, filesByTaskId.get(r.id) ?? [])),
      total: rows.length,
    }
  }

  /**
   * 查单个任务并同步百炼状态：
   * - 终态直接返回
   * - 非终态调百炼 queryTask，成功则下载文件入库
   */
  static async findOneAndSync(userId: string, taskId: string) {
    const [row] = await db
      .select()
      .from(table.generationTasks)
      .where(eq(table.generationTasks.id, taskId))
      .limit(1)

    if (!row || row.userId !== userId) {
      return status(404, { error: 'Task not found', errors: [] })
    }

    // 已终态：直接返回（含文件）
    if (isTerminalStatus(row.status)) {
      const files = await db
        .select()
        .from(table.generationTaskFiles)
        .where(eq(table.generationTaskFiles.taskId, row.id))
      return { task: toTaskResponse(row, files) }
    }

    // 非终态：调百炼查询
    if (!row.bailianTaskId) {
      return { task: toTaskResponse(row) }
    }

    try {
      const res = await queryTask(bailianConfig(), row.bailianTaskId)
      const out = res.output as Record<string, unknown>
      const taskStatus = out?.task_status as string | undefined

      if (taskStatus === 'SUCCEEDED') {
        // 先标记成功，再尝试下载（下载失败不阻塞状态更新）
        const [updated] = await db
          .update(table.generationTasks)
          .set({ status: 'SUCCEEDED', updatedAt: new Date() })
          .where(eq(table.generationTasks.id, row.id))
          .returning()

        try {
          await downloadResultFiles(row.id, row.category, out)
        } catch (e) {
          // 下载失败时，至少将百炼的原始 URL 存为 sourceUrl
          const bailianUrl = extractVideoResultUrl(out)
          if (bailianUrl) {
            await db.insert(table.generationTaskFiles).values({
              taskId: row.id,
              kind: 'primary',
              sourceUrl: bailianUrl,
              storagePath: bailianUrl,
              mimeType: 'video/mp4',
            }).catch(() => {})
          }
        }

        const files = await db
          .select()
          .from(table.generationTaskFiles)
          .where(eq(table.generationTaskFiles.taskId, row.id))
        return { task: toTaskResponse(updated, files) }
      }

      if (
        taskStatus === 'FAILED' ||
        taskStatus === 'CANCELED' ||
        taskStatus === 'UNKNOWN'
      ) {
        const rawMsg =
          [out?.code, out?.message].filter(Boolean).join(': ') ||
          taskStatus
        const msg = out?.code
          ? translateBailianError(String(out.code), String(out.message || ''))
          : rawMsg
        const [updated] = await db
          .update(table.generationTasks)
          .set({
            status: taskStatus as GenerationTask['status'],
            errorMessage: msg as string,
            updatedAt: new Date(),
          })
          .where(eq(table.generationTasks.id, row.id))
          .returning()
        return { task: toTaskResponse(updated) }
      }

      // PENDING / RUNNING
      const [updated] = await db
        .update(table.generationTasks)
        .set({
          status: (taskStatus as GenerationTask['status']) || 'RUNNING',
          updatedAt: new Date(),
        })
        .where(eq(table.generationTasks.id, row.id))
        .returning()
      return { task: toTaskResponse(updated) }
    } catch (e) {
      // 查询失败不改变 DB 状态，返回当前行
      const msg = e instanceof Error ? e.message : 'queryTask failed'
      return { task: toTaskResponse(row), warning: msg }
    }
  }

  /** 删除失败任务。仅允许删除 FAILED 状态的任务。 */
  static async delete(userId: string, taskId: string) {
    const [row] = await db
      .select()
      .from(table.generationTasks)
      .where(eq(table.generationTasks.id, taskId))
      .limit(1)

    if (!row || row.userId !== userId) {
      return status(404, { error: 'Task not found', errors: [] })
    }

    if (row.status !== 'FAILED') {
      return status(400, { error: '仅允许删除失败的任务' })
    }

    await db
      .update(table.generationTasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(table.generationTasks.id, taskId))
    return { ok: true }
  }
}
