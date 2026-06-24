import { desc, eq } from 'drizzle-orm'
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
  type ModelDefinition,
  type BailianClientConfig,
} from '@uhyc/bailian'
import { db, table, type GenerationTask, type GenerationTaskFile } from '@uhyc/db'

import { downloadToTaskDir, extractVideoResultUrl } from './storage'
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
    throw new Error('BAILIAN_API_KEY is not configured')
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
    await db.insert(table.generationTaskFiles).values({
      taskId,
      kind: 'primary',
      sourceUrl: url,
      storagePath: info.storagePath,
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
      const [updated] = await db
        .update(table.generationTasks)
        .set({
          bailianTaskId: res.output.task_id,
          createRequestId: res.request_id,
          updatedAt: new Date(),
        })
        .where(eq(table.generationTasks.id, row.id))
        .returning()
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

  /** 列出当前用户历史记录（最新在前）。 */
  static async list(userId: string, limit = 50) {
    const rows = await db
      .select()
      .from(table.generationTasks)
      .where(eq(table.generationTasks.userId, userId))
      .orderBy(desc(table.generationTasks.createdAt))
      .limit(limit)

    return { items: rows.map((r) => toTaskResponse(r)), total: rows.length }
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
        await downloadResultFiles(row.id, row.category, out)
        const [updated] = await db
          .update(table.generationTasks)
          .set({ status: 'SUCCEEDED', updatedAt: new Date() })
          .where(eq(table.generationTasks.id, row.id))
          .returning()
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
        const msg =
          [out?.code, out?.message].filter(Boolean).join(': ') ||
          taskStatus
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
}
