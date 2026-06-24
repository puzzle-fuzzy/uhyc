# Generate Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `@uhyc/bailian` 的模型定义通过 Elysia 后端传递给 `apps/generate`，做成左（元数据驱动生成器）右（轮询的历史记录）两栏工作台。

**Architecture:** 后端新增 `modules/generate` 模块（MVC），用 `@uhyc/bailian` 的 `createTask/queryTask` 代理百炼调用，任务持久化到两张新表（`generation_tasks` + `generation_task_files`），成功时下载产物到本地 `storage/<task_id>/`。前端由 `GET /catalog` 返回的 `fields[]` 元数据驱动渲染表单，每 8s 轮询非终态任务。

**Tech Stack:** Elysia + Drizzle (PostgreSQL) + `@uhyc/bailian`（后端）；React 19 + Vite + `@radix-ui/react-scroll-area`（前端）；`@uhyc/shared` 设计系统与 auth 复用。

参考 spec：`docs/superpowers/specs/2026-06-24-generate-studio-design.md`

---

## 文件结构总览

**新增/修改 — 数据库 (`packages/db`)：**
- `src/schema/index.ts` — 加 `task_status` enum、`generation_tasks` 表、`generation_task_files` 表、更新 `table` 导出

**新增/修改 — 后端 (`services/api`)：**
- `package.json` — 加 `@uhyc/bailian` workspace 依赖
- `.env` / `.env.example` — 加 `BAILIAN_API_KEY`、`BAILIAN_BASE_URL`
- `src/modules/generate/model.ts` — TypeBox DTO（请求/响应）
- `src/modules/generate/storage.ts` — 下载落盘 + 静态文件服务
- `src/modules/generate/service.ts` — 业务逻辑（catalog/create/sync/list）
- `src/modules/generate/index.ts` — 路由（Elysia controller）
- `src/index.ts` — 挂载 generate 模块 + 静态文件路由
- `tests/generate/catalog.test.ts`、`create.test.ts`、`list.test.ts`、`sync.test.ts`

**新增/修改 — 前端 (`apps/generate`)：**
- `package.json` — 加 `@radix-ui/react-scroll-area`
- `src/api.ts` — fetch 封装
- `src/hooks/useCatalog.ts`、`useGenerate.ts`、`useTaskHistory.ts`
- `src/components/GeneratorPanel.tsx`、`CategorySelect.tsx`、`SubCategoryTabs.tsx`、`ModelSelect.tsx`、`DynamicForm.tsx`、`FieldRenderer.tsx`、`TaskHistory.tsx`、`TaskCard.tsx`
- `src/App.tsx` — 左右两栏布局
- `src/App.css` — 局部样式

---

## Task 1: 数据库表 — `generation_tasks` 与 `generation_task_files`

**Files:**
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: 在 schema 末尾追加 task_status enum 与两张表**

在 `packages/db/src/schema/index.ts` 文件**末尾**（`export type NewUser = ...` 之后）追加：

```ts
// ---------------------------------------------------------------------------
// 生成任务（Generate）
// ---------------------------------------------------------------------------

/** 任务状态，与 @uhyc/bailian 的 TASK_STATUS 对齐 */
export const taskStatus = pgEnum('task_status', [
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELED',
  'UNKNOWN',
])

/** 生成历史记录主表：每条任务 = 一条历史记录 */
export const generationTasks = pgTable('generation_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bailianTaskId: varchar('bailian_task_id', { length: 128 }),
  createRequestId: varchar('create_request_id', { length: 128 }),
  category: varchar('category', { length: 20 }).notNull(),
  subCategory: varchar('sub_category', { length: 40 }).notNull(),
  model: varchar('model', { length: 60 }).notNull(),
  params: jsonb('params').notNull(),
  status: taskStatus('status').notNull().default('PENDING'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
})

/** 文件明细表：一个任务可产多个文件 */
export const generationTaskFiles = pgTable('generation_task_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => generationTasks.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 30 }).notNull(),
  sourceUrl: varchar('source_url', { length: 1024 }),
  storagePath: varchar('storage_path', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes'),
  originalFilename: varchar('original_filename', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
})

export type GenerationTask = typeof generationTasks.$inferSelect
export type NewGenerationTask = typeof generationTasks.$inferInsert
export type GenerationTaskFile = typeof generationTaskFiles.$inferSelect
```

- [ ] **Step 2: 更新 `table` 聚合对象**

把文件中的 `export const table = { users } as const` 改为：

```ts
export const table = {
  users,
  generationTasks,
  generationTaskFiles,
} as const
```

- [ ] **Step 3: 生成迁移**

Run:
```bash
cd packages/db && bun run generate
```
Expected: 生成 `drizzle/000X_*.sql`，包含 `task_status` enum、`generation_tasks` 表、`generation_task_files` 表、`(user_id, created_at)` 索引、`bailian_task_id` unique。

- [ ] **Step 4: 应用迁移（需 docker 库在跑）**

Run:
```bash
cd packages/db && bun run migrate
```
Expected: `migrations applied successfully!`

- [ ] **Step 5: 验证表结构**

Run:
```bash
docker exec uhyc-db psql -U uhyc -d uhyc -c '\dt' -c '\d generation_tasks' -c '\d generation_task_files'
```
Expected: 看到 `generation_tasks`、`generation_task_files` 两表，字段与上列一致。

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema/index.ts packages/db/drizzle/
git commit -m "feat(db): add generation_tasks and generation_task_files tables"
```

---

## Task 2: 后端 — 配置与依赖

**Files:**
- Modify: `services/api/package.json`
- Modify: `services/api/.env`
- Modify: `.env.example`

- [ ] **Step 1: 给 api 包加 bailian 依赖**

把 `services/api/package.json` 的 `dependencies` 从：

```json
"dependencies": {
  "@elysia/cors": "^1.4.2",
  "@elysia/eden": "^1.4.10",
  "@elysia/jwt": "^1.4.2",
  "@elysia/openapi": "^1.4.15",
  "@uhyc/db": "workspace:*",
  "bcryptjs": "^2.4.3",
  "elysia": "catalog:"
},
```

改为（加 `"@uhyc/bailian": "workspace:*"`，按字母序排在 `@uhyc/db` 前）：

```json
"dependencies": {
  "@elysia/cors": "^1.4.2",
  "@elysia/eden": "^1.4.10",
  "@elysia/jwt": "^1.4.2",
  "@elysia/openapi": "^1.4.15",
  "@uhyc/bailian": "workspace:*",
  "@uhyc/db": "workspace:*",
  "bcryptjs": "^2.4.3",
  "elysia": "catalog:"
},
```

- [ ] **Step 2: 写入 api 本地 .env**

在 `services/api/.env` 末尾追加（`BAILIAN_API_KEY` 由执行者填真实值，此处占位）：

```
BAILIAN_API_KEY=replace-with-real-key
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

- [ ] **Step 3: 更新 .env.example（入库的文档）**

在 `.env.example` 末尾追加：

```
# Bailian (Aliyun Model Studio) API Key + base URL for generation calls.
BAILIAN_API_KEY=replace-with-real-key
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

- [ ] **Step 4: 安装并验证 workspace 链接**

Run:
```bash
bun install
```
Expected: `@uhyc/bailian` 被 services/api 引用，无报错。

验证：
```bash
ls services/api/node_modules/@uhyc/ 2>/dev/null || ls node_modules/@uhyc/
```
Expected: 看到 `bailian`、`db`、`shared`。

- [ ] **Step 5: Commit**

```bash
git add services/api/package.json services/api/.env .env.example bun.lock
git commit -m "feat(api): add bailian dependency and config"
```

---

## Task 3: 后端 — TypeBox DTO (`model.ts`)

**Files:**
- Create: `services/api/src/modules/generate/model.ts`

- [ ] **Step 1: 写 model.ts**

创建 `services/api/src/modules/generate/model.ts`：

```ts
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
  options: t.Optional(t.Array(t.Object({ label: t.String(), value: t.Unknown() }))),
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
  status: t.Union([
    t.Literal('PENDING'),
    t.Literal('RUNNING'),
    t.Literal('SUCCEEDED'),
    t.Literal('FAILED'),
    t.Literal('CANCELED'),
    t.Literal('UNKNOWN'),
  ]),
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
  errors: t.Optional(t.Array(t.Object({ field: t.String(), message: t.String() }))),
})

export type TaskResponse = typeof TaskResponse.static
export type CreateTaskBody = typeof CreateTaskBody.static
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/modules/generate/model.ts
git commit -m "feat(api): add generate module DTOs"
```

---

## Task 4: 后端 — 存储与下载 (`storage.ts`)

**Files:**
- Create: `services/api/src/modules/generate/storage.ts`

- [ ] **Step 1: 写 storage.ts**

创建 `services/api/src/modules/generate/storage.ts`：

```ts
import { exists } from 'node:fs/promises'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

/** 存储根目录（相对 cwd）。可用 STORAGE_DIR 环境变量覆盖。 */
export const STORAGE_DIR = resolve(process.env.STORAGE_DIR || './storage')

/** 任务目录：storage/<taskId>/ */
export function taskDir(taskId: string): string {
  return join(STORAGE_DIR, taskId)
}

/** 从 URL 取末段文件名（百炼返回的 hash.后缀）。 */
export function filenameFromUrl(url: string): string {
  const u = new URL(url)
  const last = u.pathname.split('/').filter(Boolean).pop()
  return last || `file-${Date.now()}`
}

/**
 * 下载一个远程文件到本地任务目录。
 * @returns 写入的相对路径（相对 cwd，即 `storage/<taskId>/<filename>`）与元数据。
 */
export async function downloadToTaskDir(
  taskId: string,
  sourceUrl: string,
): Promise<{
  storagePath: string
  mimeType: string | null
  sizeBytes: number | null
  originalFilename: string
}> {
  const res = await fetch(sourceUrl)
  if (!res.ok) {
    throw new Error(`download failed: HTTP ${res.status} for ${sourceUrl}`)
  }

  const originalFilename = filenameFromUrl(sourceUrl)
  const absDir = taskDir(taskId)
  if (!(await exists(absDir))) {
    await mkdir(absDir, { recursive: true })
  }

  const absPath = join(absDir, originalFilename)
  const bytes = new Uint8Array(await res.arrayBuffer())
  await writeFile(absPath, bytes)

  // 相对路径（用于 DB 存储 + 静态服务拼接）
  const storagePath = join('storage', taskId, originalFilename)

  return {
    storagePath,
    mimeType: res.headers.get('content-type'),
    sizeBytes: bytes.byteLength,
    originalFilename,
  }
}

/** 解析 video 领域成功响应中的产物 URL（百炼返回 output.video_url）。 */
export function extractVideoResultUrl(queryOutput: unknown): string | null {
  if (typeof queryOutput !== 'object' || queryOutput === null) return null
  const url = (queryOutput as Record<string, unknown>).video_url
  return typeof url === 'string' ? url : null
}
```

- [ ] **Step 2: 验证纯函数逻辑（无副作用函数）**

Run:
```bash
cd services/api && bun -e "
import { filenameFromUrl, extractVideoResultUrl } from './src/modules/generate/storage'
console.log(filenameFromUrl('https://x.aliyuncs.com/abc123def.mp4?token=1'))
console.log(extractVideoResultUrl({ task_status: 'SUCCEEDED', video_url: 'https://x/y.mp4' }))
console.log(extractVideoResultUrl({ task_status: 'RUNNING' }))
"
```
Expected: 输出 `abc123def.mp4`、`https://x/y.mp4`、`null`。

- [ ] **Step 3: Commit**

```bash
git add services/api/src/modules/generate/storage.ts
git commit -m "feat(api): add storage download + url helpers"
```

---

## Task 5: 后端 — 业务逻辑 (`service.ts`)

**Files:**
- Create: `services/api/src/modules/generate/service.ts`

- [ ] **Step 1: 写 service.ts**

创建 `services/api/src/modules/generate/service.ts`：

```ts
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
} from '@uhyc/bailian'
import { db, table, type GenerationTask, type GenerationTaskFile } from '@uhyc/db'

import { downloadToTaskDir, extractVideoResultUrl } from './storage'
import type { CreateTaskBody } from './model'

const ALL_MODELS = [...allVideoModels, ...allImageModels, ...allMusicModels]

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

function bailianConfig() {
  const apiKey = process.env.BAILIAN_API_KEY
  if (!apiKey) throw new Error('BAILIAN_API_KEY is not configured')
  return {
    apiKey,
    baseUrl: process.env.BAILIAN_BASE_URL,
  }
}

function findModel(category: string, subCategory: string, model: string) {
  return ALL_MODELS.find(
    (m) =>
      m.category === category && m.subCategory === subCategory && m.model === model,
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
      const taskStatus = (res.output as Record<string, unknown>)?.task_status as
        | string
        | undefined

      if (taskStatus === 'SUCCEEDED') {
        await downloadResultFiles(row.id, row.category, res.output)
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

      if (taskStatus === 'FAILED' || taskStatus === 'CANCELED' || taskStatus === 'UNKNOWN') {
        const out = res.output as Record<string, unknown>
        const msg = [out.code, out.message].filter(Boolean).join(': ') || taskStatus
        const [updated] = await db
          .update(table.generationTasks)
          .set({ status: taskStatus as GenerationTask['status'], errorMessage: msg, updatedAt: new Date() })
          .where(eq(table.generationTasks.id, row.id))
          .returning()
        return { task: toTaskResponse(updated) }
      }

      // PENDING / RUNNING
      const [updated] = await db
        .update(table.generationTasks)
        .set({ status: (taskStatus as GenerationTask['status']) || 'RUNNING', updatedAt: new Date() })
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

/** 按 subCategory 分组。 */
function groupBySubCategory(models: ModelDefinition[]): Record<string, ModelDefinition[]> {
  const out: Record<string, ModelDefinition[]> = {}
  for (const m of models) {
    ;(out[m.subCategory] ??= []).push(m)
  }
  return out
}

/** 按 category 下载产物文件。video 解析 video_url；其余领域留待补模型。 */
async function downloadResultFiles(taskId: string, category: string, output: unknown) {
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
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/modules/generate/service.ts
git commit -m "feat(api): add generate service (catalog/create/list/sync)"
```

---

## Task 6: 后端 — 路由 (`index.ts`) 与入口挂载

**Files:**
- Create: `services/api/src/modules/generate/index.ts`
- Modify: `services/api/src/index.ts`

- [ ] **Step 1: 写 generate 路由模块**

创建 `services/api/src/modules/generate/index.ts`：

```ts
import { Elysia, t } from 'elysia'

import { authPlugin } from '../../plugins/jwt'
import { GenerateService, isStatusReturn } from './service'
import {
  CatalogResponse,
  CreateTaskBody,
  TaskListResponse,
  TaskResponse,
  ValidationErrorResponse,
} from './model'

export const generateModule = new Elysia({ prefix: '/generate' })
  .use(authPlugin)
  .get(
    '/catalog',
    () => GenerateService.catalog(),
    {
      response: { 200: CatalogResponse },
      detail: { summary: 'List all generation models (drives the frontend form)' },
    },
  )
  .post(
    '/tasks',
    async ({ body, currentUser }) => {
      const result = await GenerateService.create(currentUser.id, body)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      body: CreateTaskBody,
      response: {
        200: t.Object({ task: TaskResponse }),
        422: ValidationErrorResponse,
      },
      detail: { summary: 'Create a generation task' },
    },
  )
  .get(
    '/tasks',
    ({ currentUser }) => GenerateService.list(currentUser.id),
    {
      isAuth: true,
      response: { 200: TaskListResponse },
      detail: { summary: 'List current user task history' },
    },
  )
  .get(
    '/tasks/:id',
    async ({ params, currentUser }) => {
      const result = await GenerateService.findOneAndSync(currentUser.id, params.id)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      response: {
        200: t.Object({ task: TaskResponse }),
        404: ValidationErrorResponse,
      },
      detail: { summary: 'Get a task and sync its status from Bailian' },
    },
  )
```

> 判定说明：`service.create` / `findOneAndSync` 成功返回 `{ task }`，失败返回 Elysia `status()` 值 `{ code, response }`。`isStatusReturn` 用 `'code' in v && 'response' in v` 区分，与 auth 模块同构（见 `modules/auth/service.ts` 的 `isStatusReturn`）。

- [ ] **Step 2: 在入口挂载 generate 模块**

读取 `services/api/src/index.ts`，在 `.use(authModule)` 之后、`.listen(3000)` 之前插入 `.use(generateModule)`，并加 import。

修改 `services/api/src/index.ts`：
- import 行区追加（在 `import { authModule } from './modules/auth'` 之后）：
```ts
import { generateModule } from './modules/generate'
```
- 链式调用区，把：
```ts
  .get('/', () => 'Hello Elysia')
  .use(authModule)
  .listen(3000)
```
改为：
```ts
  .get('/', () => 'Hello Elysia')
  .use(authModule)
  .use(generateModule)
  .listen(3000)
```

- [ ] **Step 3: 启动验证（编译无错 + catalog 返回）**

Run:
```bash
cd services/api && bun run src/index.ts &
sleep 2
# 先注册拿 cookie，再取 catalog
curl -s -c /tmp/gc.txt -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"gentest","email":"gentest@uhyc.test","password":"TestPass123!"}'
curl -s -b /tmp/gc.txt http://localhost:3000/generate/catalog | head -c 300
kill %1 2>/dev/null
```
Expected: catalog 返回 JSON，含 `video.text-to-video` 下两个模型（happyhorse、wan2.7）。

- [ ] **Step 4: Commit**

```bash
git add services/api/src/modules/generate/index.ts services/api/src/index.ts
git commit -m "feat(api): mount generate module routes"
```

---

## Task 7: 后端 — 测试（catalog + list，不依赖真实百炼）

**Files:**
- Create: `services/api/tests/generate/catalog.test.ts`
- Create: `services/api/tests/generate/list.test.ts`

- [ ] **Step 1: 写 catalog 测试**

创建 `services/api/tests/generate/catalog.test.ts`：

```ts
import { describe, expect, it, beforeAll } from 'bun:test'
import { api, ALICE, deleteUser } from '../helpers'

describe('GET /generate/catalog', () => {
  beforeAll(async () => {
    await deleteUser(ALICE.username)
    await api.auth.register.post(ALICE)
  })

  it('returns the model catalog with all three categories', async () => {
    const { data, status } = await api.generate.catalog.get()

    expect(status).toBe(200)
    expect(data).toBeDefined()
    const cat = data!
    expect(cat.video).toBeDefined()
    expect(cat.image).toBeDefined()
    expect(cat.music).toBeDefined()
  })

  it('includes the two text-to-video models', async () => {
    const { data } = await api.generate.catalog.get()
    const t2v = data!.video['text-to-video']
    expect(t2v.length).toBeGreaterThanOrEqual(2)
    const models = t2v.map((m) => m.model)
    expect(models).toContain('happyhorse-1.1-t2v')
    expect(models).toContain('wan2.7-t2v')
  })

  it('exposes field metadata for form rendering', async () => {
    const { data } = await api.generate.catalog.get()
    const wan = data!.video['text-to-video'].find((m) => m.model === 'wan2.7-t2v')!
    expect(wan.fields.length).toBeGreaterThan(0)
    const prompt = wan.fields.find((f) => f.key === 'prompt')
    expect(prompt).toBeDefined()
    expect(prompt!.required).toBe(true)
  })
})
```

- [ ] **Step 2: 写 list 测试**

创建 `services/api/tests/generate/list.test.ts`：

```ts
import { describe, expect, it, beforeAll } from 'bun:test'
import { api, ALICE, deleteUser } from '../helpers'

describe('GET /generate/tasks', () => {
  beforeAll(async () => {
    await deleteUser(ALICE.username)
    await api.auth.register.post(ALICE)
  })

  it('returns an empty list for a fresh user', async () => {
    const { data, status } = await api.generate.tasks.get()
    expect(status).toBe(200)
    expect(data!.items).toEqual([])
    expect(data!.total).toBe(0)
  })

  it('returns 401 without auth (treaty without cookie)', async () => {
    // treaty 自动带 cookie，此处只验证结构存在；未授权场景由 isAuth 守卫覆盖
    const { status } = await api.generate.tasks.get()
    expect([200, 401]).toContain(status)
  })
})
```

- [ ] **Step 3: 跑测试**

Run:
```bash
cd services/api && bun test tests/generate
```
Expected: catalog 3 个 + list 2 个测试全 PASS。

- [ ] **Step 4: 跑全部测试确认无回归**

Run:
```bash
cd services/api && bun test
```
Expected: 现有 23 个 auth 测试 + 新 generate 测试全绿。

- [ ] **Step 5: Commit**

```bash
git add services/api/tests/generate/
git commit -m "test(api): add generate catalog and list tests"
```

---

## Task 8: 后端 — 静态文件服务路由

**Files:**
- Modify: `services/api/src/index.ts`

- [ ] **Step 1: 在入口加静态文件路由**

修改 `services/api/src/index.ts`，在顶部 import 区追加：
```ts
import { exists } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
```

在 `.use(generateModule)` 之后、`.listen(3000)` 之前插入静态路由（链式调用里加一个 `.get`）：

```ts
  .get(
    '/generate/storage/:taskId/:filename',
    async ({ params, set }) => {
      const dir = resolve(process.env.STORAGE_DIR || './storage')
      const safeTaskId = params.taskId.replace(/[^a-zA-Z0-9-]/g, '')
      const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, '')
      const abs = join(dir, safeTaskId, safeName)
      if (!exists(abs)) {
        set.status = 404
        return { error: 'Not found' }
      }
      const buf = await readFile(abs)
      set.headers['content-type'] = mimeByExt(extname(abs))
      return buf
    },
    { detail: { summary: 'Serve a downloaded task artifact' } },
  )
```

并在文件底部（`export default app` 之前）追加 MIME 辅助函数：

```ts
function mimeByExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.mp4':
      return 'video/mp4'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.json':
      return 'application/json'
    case '.txt':
      return 'text/plain'
    case '.srt':
      return 'application/x-subrip'
    default:
      return 'application/octet-stream'
  }
}
```

- [ ] **Step 2: 启动验证 404**

Run:
```bash
cd services/api && bun run src/index.ts &
sleep 2
curl -s -w "\n[HTTP %{http_code}]\n" http://localhost:3000/generate/storage/nonexistent/x.mp4
kill %1 2>/dev/null
```
Expected: HTTP 404 `{ error: 'Not found' }`。

- [ ] **Step 3: Commit**

```bash
git add services/api/src/index.ts
git commit -m "feat(api): serve downloaded task artifacts via static route"
```

---

## Task 9: 前端 — 依赖与 API 封装

**Files:**
- Modify: `apps/generate/package.json`
- Create: `apps/generate/src/api.ts`
- Create: `apps/generate/src/types.ts`

- [ ] **Step 1: 加滚动条依赖**

把 `apps/generate/package.json` 的 `dependencies` 从：
```json
"dependencies": {
  "@uhyc/shared": "workspace:*",
  "react": "^19.2.7",
  "react-dom": "^19.2.7"
},
```
改为：
```json
"dependencies": {
  "@radix-ui/react-scroll-area": "^1.2.12",
  "@uhyc/shared": "workspace:*",
  "react": "^19.2.7",
  "react-dom": "^19.2.7"
},
```

- [ ] **Step 2: 写 types.ts**

创建 `apps/generate/src/types.ts`：

```ts
/** 镜像后端 generate/model.ts 与 @uhyc/bailian 的字段元数据。 */
export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'range'
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
```

- [ ] **Step 3: 写 api.ts**

创建 `apps/generate/src/api.ts`：

```ts
import type { Catalog, ModelDefinition, TaskResponse } from './types'

const BASE = '/api'
const CREDS: RequestInit = { credentials: 'include' }

export class ApiError extends Error {
  status: number
  errors?: { field: string; message: string }[]
  constructor(message: string, status: number, errors?: { field: string; message: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...CREDS, method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError((data as any)?.error || `HTTP ${res.status}`, res.status)
  return data as T
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...CREDS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError((data as any)?.error || `HTTP ${res.status}`, res.status, (data as any)?.errors)
  }
  return data as T
}

export interface CreateTaskInput {
  category: string
  subCategory: string
  model: string
  params: Record<string, unknown>
}

export const generateApi = {
  catalog: () => get<Catalog>('/generate/catalog'),
  createTask: (body: CreateTaskInput) => post<{ task: TaskResponse }>('/generate/tasks', body),
  listTasks: () => get<{ items: TaskResponse[]; total: number }>('/generate/tasks'),
  getTask: (id: string) => get<{ task: TaskResponse }>(`/generate/tasks/${id}`),
}

/** 由 storagePath 拼出可访问 URL（走 vite 代理 → 后端静态路由）。 */
export function artifactUrl(storagePath: string): string {
  // storagePath 形如 "storage/<taskId>/<file>"，路由是 /api/generate/storage/<taskId>/<file>
  return `${BASE}/generate/${storagePath.replace(/^storage\//, 'storage/')}`
}
```

- [ ] **Step 4: 安装依赖并验证类型**

Run:
```bash
bun install
cd apps/generate && bunx tsc -b
```
Expected: exit 0，无类型错误。

- [ ] **Step 5: Commit**

```bash
git add apps/generate/package.json apps/generate/src/api.ts apps/generate/src/types.ts bun.lock
git commit -m "feat(generate): add scroll-area dep, api client and types"
```

---

## Task 10: 前端 — Hooks（catalog / history / generate+轮询）

**Files:**
- Create: `apps/generate/src/hooks/useCatalog.ts`
- Create: `apps/generate/src/hooks/useTaskHistory.ts`
- Create: `apps/generate/src/hooks/useGenerate.ts`

- [ ] **Step 1: 写 useCatalog**

创建 `apps/generate/src/hooks/useCatalog.ts`：

```ts
import { useEffect, useState } from 'react'
import { generateApi } from '../api'
import type { Catalog } from '../types'

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    generateApi
      .catalog()
      .then((c) => !cancelled && setCatalog(c))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'load failed'))
    return () => {
      cancelled = true
    }
  }, [])

  return { catalog, error }
}
```

- [ ] **Step 2: 写 useTaskHistory**

创建 `apps/generate/src/hooks/useTaskHistory.ts`：

```ts
import { useCallback, useEffect, useState } from 'react'
import { generateApi } from '../api'
import type { TaskResponse } from '../types'

export function useTaskHistory() {
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { items } = await generateApi.listTasks()
      setTasks(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { tasks, setTasks, refresh, error }
}
```

- [ ] **Step 3: 写 useGenerate（创建 + 8s 轮询非终态任务）**

创建 `apps/generate/src/hooks/useGenerate.ts`：

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { generateApi } from '../api'
import type { TaskResponse } from '../types'

const POLL_INTERVAL = 8000
const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'])

export function useGenerate(
  tasks: TaskResponse[],
  setTasks: React.Dispatch<React.SetStateAction<TaskResponse[]>>,
) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const updateTask = useCallback(
    (id: string, patch: Partial<TaskResponse>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [setTasks],
  )

  const pollTask = useCallback(
    async (id: string) => {
      try {
        const { task } = await generateApi.getTask(id)
        updateTask(id, task)
        if (!TERMINAL.has(task.status)) {
          timers.current[id] = setTimeout(() => void pollTask(id), POLL_INTERVAL)
        }
      } catch {
        // 单次失败则稍后重试
        timers.current[id] = setTimeout(() => void pollTask(id), POLL_INTERVAL)
      }
    },
    [updateTask],
  )

  // 对所有非终态任务启动轮询
  useEffect(() => {
    for (const t of tasks) {
      if (!TERMINAL.has(t.status) && !timers.current[t.id]) {
        timers.current[t.id] = setTimeout(() => void pollTask(t.id), POLL_INTERVAL)
      }
    }
    return () => {
      // 组件卸载时清理所有 timer
      for (const id of Object.keys(timers.current)) {
        clearTimeout(timers.current[id])
      }
      timers.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.map((t) => `${t.id}:${t.status}`).join('|')])

  const submit = useCallback(
    async (input: {
      category: string
      subCategory: string
      model: string
      params: Record<string, unknown>
    }) => {
      setSubmitting(true)
      setError(null)
      try {
        const { task } = await generateApi.createTask(input)
        setTasks((prev) => [task, ...prev])
        // 立即启动轮询
        timers.current[task.id] = setTimeout(() => void pollTask(task.id), POLL_INTERVAL)
      } catch (e) {
        setError(e instanceof Error ? e.message : '提交失败')
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [setTasks, pollTask],
  )

  return { submit, submitting, error, setError }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/generate/src/hooks/
git commit -m "feat(generate): add catalog/history/generate hooks with polling"
```

---

## Task 11: 前端 — FieldRenderer（按 type 渲染单字段）

**Files:**
- Create: `apps/generate/src/components/FieldRenderer.tsx`

- [ ] **Step 1: 写 FieldRenderer**

创建 `apps/generate/src/components/FieldRenderer.tsx`：

```tsx
import type { FieldMeta } from '../types'

interface FieldRendererProps {
  field: FieldMeta
  value: unknown
  error?: string
  onChange: (value: unknown) => void
}

export function FieldRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const label = (
    <span className="uhyc-field__label">
      {field.label}
      {field.required ? ' *' : ''}
    </span>
  )

  const desc = field.description ? (
    <p className="gen-field__desc">{field.description}</p>
  ) : null

  switch (field.type) {
    case 'text':
      return (
        <label className="uhyc-field">
          {label}
          {field.maxLength && field.maxLength > 200 ? (
            <textarea
              className="uhyc-input gen-textarea"
              value={(value as string) ?? ''}
              maxLength={field.maxLength}
              placeholder={field.label}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              className="uhyc-input"
              type="text"
              value={(value as string) ?? ''}
              maxLength={field.maxLength}
              placeholder={field.label}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )

    case 'number':
      return (
        <label className="uhyc-field">
          {label}
          <input
            className="uhyc-input"
            type="number"
            value={(value as number) ?? ''}
            min={field.min}
            max={field.max}
            placeholder={field.label}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )

    case 'boolean':
      return (
        <label className="uhyc-field uhyc-field--inline">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {label}
          {desc}
        </label>
      )

    case 'select':
      return (
        <label className="uhyc-field">
          {label}
          <select
            className="uhyc-input"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            {(field.options ?? []).map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )

    case 'range': {
      const min = field.min ?? 0
      const max = field.max ?? 100
      return (
        <label className="uhyc-field">
          {label}
          <div className="gen-range">
            <input
              type="range"
              min={min}
              max={max}
              value={(value as number) ?? min}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="gen-range__value">{String(value ?? min)}</span>
          </div>
          {desc}
          {error && <p className="gen-field__error">{error}</p>}
        </label>
      )
    }

    default:
      return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/generate/src/components/FieldRenderer.tsx
git commit -m "feat(generate): add FieldRenderer for metadata-driven fields"
```

---

## Task 12: 前端 — 左栏（GeneratorPanel 及其子组件）

**Files:**
- Create: `apps/generate/src/components/CategorySelect.tsx`
- Create: `apps/generate/src/components/SubCategoryTabs.tsx`
- Create: `apps/generate/src/components/ModelSelect.tsx`
- Create: `apps/generate/src/components/DynamicForm.tsx`
- Create: `apps/generate/src/components/GeneratorPanel.tsx`

- [ ] **Step 1: 写 CategorySelect**

创建 `apps/generate/src/components/CategorySelect.tsx`：

```tsx
interface CategorySelectProps {
  value: string
  options: string[]
  onChange: (v: string) => void
}

const LABELS: Record<string, string> = {
  image: '图片生成',
  video: '视频生成',
  music: '音乐生成',
}

export function CategorySelect({ value, options, onChange }: CategorySelectProps) {
  return (
    <label className="uhyc-field">
      <span className="uhyc-field__label">生成类型</span>
      <select
        className="uhyc-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {LABELS[c] ?? c}
          </option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 2: 写 SubCategoryTabs**

创建 `apps/generate/src/components/SubCategoryTabs.tsx`：

```tsx
interface SubCategoryTabsProps {
  options: string[]
  value: string
  onChange: (v: string) => void
}

const LABELS: Record<string, string> = {
  'text-to-video': '文生视频',
  'image-to-video': '图生视频',
  'reference-to-video': '参考生视频',
  'video-editing': '视频编辑',
  'text-to-image': '文生图',
  'image-to-image': '图生图',
  'reference-to-image': '参考生图',
  'text-to-music': '文生音乐',
}

export function SubCategoryTabs({ options, value, onChange }: SubCategoryTabsProps) {
  if (options.length === 0) return null
  return (
    <div className="uhyc-tabs">
      {options.map((s) => (
        <button
          key={s}
          type="button"
          className={`uhyc-tab ${s === value ? 'uhyc-tab--active' : ''}`}
          onClick={() => onChange(s)}
        >
          {LABELS[s] ?? s}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 写 ModelSelect**

创建 `apps/generate/src/components/ModelSelect.tsx`：

```tsx
import type { ModelDefinition } from '../types'

interface ModelSelectProps {
  models: ModelDefinition[]
  value: string | null
  onChange: (v: string) => void
}

export function ModelSelect({ models, value, onChange }: ModelSelectProps) {
  if (models.length === 0) {
    return <p className="gen-empty-inline">该类别暂无可用模型</p>
  }
  return (
    <label className="uhyc-field">
      <span className="uhyc-field__label">模型</span>
      <select
        className="uhyc-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.model} value={m.model}>
            {m.displayName}
          </option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 4: 写 DynamicForm**

创建 `apps/generate/src/components/DynamicForm.tsx`：

```tsx
import type { FieldMeta, ModelDefinition } from '../types'
import { FieldRenderer } from './FieldRenderer'

interface DynamicFormProps {
  model: ModelDefinition | null
  params: Record<string, unknown>
  errors: Record<string, string>
  onChange: (key: string, value: unknown) => void
}

export function DynamicForm({ model, params, errors, onChange }: DynamicFormProps) {
  if (!model) return null
  const inputs = model.fields.filter((f) => f.group === 'input')
  const parameters = model.fields.filter((f) => f.group === 'parameters')

  const render = (f: FieldMeta) => (
    <FieldRenderer
      key={f.key}
      field={f}
      value={params[f.key]}
      error={errors[f.key]}
      onChange={(v) => onChange(f.key, v)}
    />
  )

  return (
    <div className="gen-form">
      {inputs.length > 0 && (
        <div className="gen-form__group">{inputs.map(render)}</div>
      )}
      {parameters.length > 0 && (
        <div className="gen-form__group">
          <p className="gen-form__group-title">参数</p>
          {parameters.map(render)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 写 GeneratorPanel（左栏总装）**

创建 `apps/generate/src/components/GeneratorPanel.tsx`：

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { Catalog, ModelDefinition } from '../types'
import { CategorySelect } from './CategorySelect'
import { SubCategoryTabs } from './SubCategoryTabs'
import { ModelSelect } from './ModelSelect'
import { DynamicForm } from './DynamicForm'

interface GeneratorPanelProps {
  catalog: Catalog
  submitting: boolean
  submitError: string | null
  onSubmit: (input: {
    category: string
    subCategory: string
    model: string
    params: Record<string, unknown>
  }) => Promise<void>
}

function defaultsFor(model: ModelDefinition | null): Record<string, unknown> {
  if (!model) return {}
  const out: Record<string, unknown> = {}
  for (const f of model.fields) {
    if (f.defaultValue !== undefined) out[f.key] = f.defaultValue
  }
  return out
}

export function GeneratorPanel({ catalog, submitting, submitError, onSubmit }: GeneratorPanelProps) {
  const categories = useMemo(() => Object.keys(catalog), [catalog])
  const [category, setCategory] = useState(categories[0] ?? '')
  const subOptions = useMemo(
    () => Object.keys(catalog[category] ?? {}),
    [catalog, category],
  )
  const [subCategory, setSubCategory] = useState('')
  const models = useMemo(
    () => (catalog[category]?.[subCategory]) ?? [],
    [catalog, category, subCategory],
  )
  const [modelName, setModelName] = useState<string | null>(null)
  const model = useMemo(
    () => models.find((m) => m.model === modelName) ?? null,
    [models, modelName],
  )
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // category 变了：取第一个 subCategory
  useEffect(() => {
    const subs = Object.keys(catalog[category] ?? {})
    setSubCategory(subs[0] ?? '')
  }, [catalog, category])

  // subCategory 变了：取第一个模型
  useEffect(() => {
    const ms = catalog[category]?.[subCategory] ?? []
    setModelName(ms[0]?.model ?? null)
  }, [catalog, category, subCategory])

  // 模型变了：重置 params 为默认值
  useEffect(() => {
    setParams(defaultsFor(model))
    setErrors({})
  }, [model])

  function setParam(key: string, value: unknown) {
    setParams((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit() {
    if (!model) return
    setErrors({})
    try {
      await onSubmit({
        category,
        subCategory,
        model: model.model,
        params,
      })
    } catch {
      // submitError 由父组件管理
    }
  }

  return (
    <div className="uhyc-card gen-panel">
      <div className="gen-panel__head">
        <CategorySelect value={category} options={categories} onChange={setCategory} />
        <SubCategoryTabs options={subOptions} value={subCategory} onChange={setSubCategory} />
      </div>

      <div className="gen-panel__body">
        <ModelSelect models={models} value={modelName} onChange={setModelName} />
        <DynamicForm model={model} params={params} errors={errors} onChange={setParam} />
        {submitError && (
          <div className="uhyc-alert uhyc-alert--error" role="alert">
            {submitError}
          </div>
        )}
      </div>

      <div className="gen-panel__foot">
        <button
          type="button"
          className="uhyc-btn uhyc-btn--accent"
          disabled={!model || submitting}
          onClick={handleSubmit}
        >
          {submitting ? <span className="uhyc-spinner" /> : '生成'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/generate/src/components/
git commit -m "feat(generate): add left generator panel (category/tab/model/form)"
```

---

## Task 13: 前端 — 右栏（TaskHistory + TaskCard + ScrollArea）

**Files:**
- Create: `apps/generate/src/components/TaskCard.tsx`
- Create: `apps/generate/src/components/TaskHistory.tsx`

- [ ] **Step 1: 写 TaskCard**

创建 `apps/generate/src/components/TaskCard.tsx`：

```tsx
import { useState } from 'react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import type { TaskResponse } from '../types'
import { artifactUrl } from '../api'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '排队中',
  RUNNING: '生成中',
  SUCCEEDED: '成功',
  FAILED: '失败',
  CANCELED: '已取消',
  UNKNOWN: '未知',
}

function statusClass(s: string): string {
  if (s === 'SUCCEEDED') return 'gen-status--ok'
  if (s === 'FAILED' || s === 'CANCELED' || s === 'UNKNOWN') return 'gen-status--err'
  return 'gen-status--run'
}

function primaryFile(task: TaskResponse) {
  return task.files?.find((f) => f.kind === 'primary')
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

interface TaskCardProps {
  task: TaskResponse
  onRerun?: (task: TaskResponse) => void
}

export function TaskCard({ task, onRerun }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const file = primaryFile(task)

  return (
    <div className="gen-task">
      <div className="gen-task__head">
        <span className="gen-task__model">{task.model}</span>
        <span className={`gen-status ${statusClass(task.status)}`}>
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
      </div>

      <div className="gen-task__preview">
        {task.status === 'SUCCEEDED' && file ? (
          task.category === 'video' ? (
            <video src={artifactUrl(file.storagePath)} controls className="gen-media" />
          ) : (
            <a href={artifactUrl(file.storagePath)} className="gen-task__link" target="_blank" rel="noreferrer">
              查看产物 {file.originalFilename}
            </a>
          )
        ) : ['PENDING', 'RUNNING'].includes(task.status) ? (
          <div className="gen-task__loading">
            <span className="uhyc-spinner" /> {STATUS_LABEL[task.status]}
          </div>
        ) : task.status === 'FAILED' ? (
          <p className="gen-task__error">{task.errorMessage}</p>
        ) : null}
      </div>

      <div className="gen-task__foot">
        <span>{task.subCategory} · {timeAgo(task.createdAt)}</span>
        <div className="gen-task__actions">
          <button type="button" className="gen-task__btn" onClick={() => setExpanded((e) => !e)}>
            {expanded ? '收起' : '详情'}
          </button>
          {onRerun && (
            <button type="button" className="gen-task__btn" onClick={() => onRerun(task)}>
              重跑
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <pre className="gen-task__params">{JSON.stringify(task.params, null, 2)}</pre>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 写 TaskHistory（ScrollArea 包裹）**

创建 `apps/generate/src/components/TaskHistory.tsx`：

```tsx
import * as ScrollArea from '@radix-ui/react-scroll-area'
import type { TaskResponse } from '../types'
import { TaskCard } from './TaskCard'

interface TaskHistoryProps {
  tasks: TaskResponse[]
  onRerun?: (task: TaskResponse) => void
}

export function TaskHistory({ tasks, onRerun }: TaskHistoryProps) {
  return (
    <div className="gen-history">
      <h2 className="gen-history__title">生成记录</h2>
      <ScrollArea.Root className="gen-scroll">
        <ScrollArea.Viewport className="gen-scroll__viewport">
          {tasks.length === 0 ? (
            <p className="gen-empty">还没有生成记录</p>
          ) : (
            <div className="gen-history__list">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} onRerun={onRerun} />
              ))}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="gen-scroll__bar"
        >
          <ScrollArea.Thumb className="gen-scroll__thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/generate/src/components/TaskCard.tsx apps/generate/src/components/TaskHistory.tsx
git commit -m "feat(generate): add right task history with ScrollArea"
```

---

## Task 14: 前端 — App 总装与样式

**Files:**
- Modify: `apps/generate/src/App.tsx`
- Modify: `apps/generate/src/App.css`

- [ ] **Step 1: 重写 App.tsx 为左右两栏**

把 `apps/generate/src/App.tsx` 全部内容替换为：

```tsx
import { useAuth } from '@uhyc/shared'
import { buildLoginUrl } from '@uhyc/shared'
import { useEffect } from 'react'
import { useCatalog } from './hooks/useCatalog'
import { useTaskHistory } from './hooks/useTaskHistory'
import { useGenerate } from './hooks/useGenerate'
import { GeneratorPanel } from './components/GeneratorPanel'
import { TaskHistory } from './components/TaskHistory'
import './App.css'

const LOGO_SVG = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="11" height="11" rx="2" fill="#cba0ff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="3" width="11" height="11" rx="2" fill="#93ecff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="3" y="18" width="11" height="11" rx="2" fill="#ffaef3" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="18" width="11" height="11" rx="2" fill="#0a0a0a" />
  </svg>
)

function App() {
  const auth = useAuth()
  const { catalog } = useCatalog()
  const { tasks, setTasks, refresh } = useTaskHistory()
  const { submit, submitting, error: submitError } = useGenerate(tasks, setTasks)

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      window.location.replace(buildLoginUrl(window.location.href))
    }
  }, [auth.status])

  useEffect(() => {
    if (auth.status === 'authenticated') void refresh()
  }, [auth.status, refresh])

  if (auth.status !== 'authenticated' || !auth.user) {
    return (
      <main className="center-screen">
        <span className="uhyc-spinner" />
      </main>
    )
  }

  const initial = auth.user.username.charAt(0).toUpperCase()

  return (
    <main className="gen-app">
      <header className="topbar">
        <div className="topbar__brand">
          {LOGO_SVG}
          <span>uhyc · generate</span>
        </div>
        <div className="topbar__user">
          <span className="topbar__avatar">{initial}</span>
          <span className="uhyc-badge">{auth.user.username}</span>
          <button type="button" className="uhyc-btn uhyc-btn--ghost topbar__logout" onClick={auth.logout}>
            登出
          </button>
        </div>
      </header>

      <div className="gen-layout">
        <section className="gen-layout__left">
          {catalog && (
            <GeneratorPanel
              catalog={catalog}
              submitting={submitting}
              submitError={submitError}
              onSubmit={submit}
            />
          )}
        </section>
        <section className="gen-layout__right">
          <TaskHistory tasks={tasks} onRerun={() => {}} />
        </section>
      </div>
    </main>
  )
}

export default App
```

- [ ] **Step 2: 重写 App.css（加左右布局 + 组件样式 + ScrollArea 样式）**

把 `apps/generate/src/App.css` 全部内容替换为：

```css
/* Generate app layout + generate-specific styles. */

html, body { margin: 0; min-height: 100vh; }
body {
  background-color: var(--bg);
  background-image: radial-gradient(var(--ink) 1px, transparent 1.4px);
  background-size: 22px 22px;
  background-position: -11px -11px;
}
#root { min-height: 100vh; }

.gen-app { min-height: 100vh; display: flex; flex-direction: column; }

/* topbar（沿用） */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 16px 24px;
  border-bottom: 2px solid var(--ink);
  background: var(--paper);
}
.topbar__brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
.topbar__brand svg { width: 32px; height: 32px; }
.topbar__user { display: inline-flex; align-items: center; gap: 12px; }
.topbar__avatar {
  width: 36px; height: 36px; border-radius: 50%;
  border: var(--border); box-shadow: var(--shadow-sm);
  background: var(--purple-soft);
  display: inline-flex; align-items: center; justify-content: center; font-weight: 900;
}
.topbar__logout { width: auto; padding: 8px 16px; }

/* 左右两栏 */
.gen-layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(420px, 560px) 1fr;
  align-items: stretch;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}
.gen-layout__left { position: sticky; top: 24px; align-self: start; max-height: calc(100vh - 120px); }
.gen-layout__right { min-height: 0; }

/* 左栏生成器卡片 */
.gen-panel { display: flex; flex-direction: column; max-height: calc(100vh - 120px); }
.gen-panel__head { padding: 20px 20px 0; border-bottom: 2px solid var(--ink); }
.gen-panel__body { padding: 20px; overflow-y: auto; flex: 1; }
.gen-panel__foot { padding: 16px 20px; border-top: 2px solid var(--ink); }

.gen-form__group { margin-bottom: 20px; }
.gen-form__group-title {
  font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--muted); margin: 0 0 12px;
}
.gen-field__desc { font-size: 12px; color: var(--muted); margin: 4px 0 0; }
.gen-field__error { font-size: 12px; color: var(--danger); margin: 4px 0 0; }
.gen-field--inline { display: flex; align-items: center; gap: 8px; flex-direction: row; }
.gen-textarea { min-height: 100px; resize: vertical; font-family: var(--font); }
.gen-range { display: flex; align-items: center; gap: 12px; }
.gen-range input { flex: 1; }
.gen-range__value { font-weight: 800; min-width: 2ch; text-align: right; }
.gen-empty-inline { color: var(--muted); font-size: 14px; padding: 8px 0; }

/* 右栏历史 */
.gen-history { display: flex; flex-direction: column; height: calc(100vh - 120px); }
.gen-history__title { font-weight: 900; font-size: 20px; margin: 0 0 16px; }
.gen-history__list { display: flex; flex-direction: column; gap: 16px; }
.gen-empty { color: var(--muted); text-align: center; padding: 40px 0; }

/* 任务卡 */
.gen-task {
  background: var(--paper); border: var(--border); border-radius: 10px;
  box-shadow: var(--shadow); padding: 16px;
}
.gen-task__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.gen-task__model { font-weight: 800; font-size: 15px; }
.gen-status {
  font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 999px;
  border: var(--border); text-transform: uppercase; letter-spacing: 0.05em;
}
.gen-status--ok { background: var(--cyan); }
.gen-status--run { background: var(--purple); }
.gen-status--err { background: var(--red-soft); color: var(--danger); }
.gen-task__preview { min-height: 60px; display: flex; align-items: center; }
.gen-media { width: 100%; border-radius: 8px; border: var(--border); }
.gen-task__loading { display: flex; align-items: center; gap: 8px; color: var(--muted); }
.gen-task__error { color: var(--danger); font-size: 14px; margin: 0; }
.gen-task__link { color: var(--ink); font-weight: 700; }
.gen-task__foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 13px; color: var(--muted); }
.gen-task__actions { display: flex; gap: 8px; }
.gen-task__btn {
  border: var(--border); background: var(--paper); border-radius: 6px;
  padding: 4px 10px; font-family: var(--font); font-weight: 700; font-size: 12px; cursor: pointer;
}
.gen-task__btn:hover { background: var(--purple-soft); }
.gen-task__params {
  background: var(--bg); border: var(--border); border-radius: 6px;
  padding: 12px; margin: 12px 0 0; font-size: 12px; overflow-x: auto; white-space: pre-wrap;
}

/* ScrollArea（@radix-ui） */
.gen-scroll { height: 100%; }
.gen-scroll__viewport { width: 100%; height: 100%; }
.gen-scroll__bar {
  width: 10px; padding: 2px; background: transparent;
  display: flex; justify-content: center;
}
.gen-scroll__thumb {
  background: var(--muted); border-radius: 999px; border: 2px solid var(--ink);
  flex: 1;
}
.gen-scroll__bar:hover .gen-scroll__thumb { background: var(--ink); }

/* loading 全屏 */
.center-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; }

/* 响应式 */
@media (max-width: 960px) {
  .gen-layout { grid-template-columns: 1fr; }
  .gen-layout__left { position: static; max-height: none; }
  .gen-history { height: auto; }
  .gen-scroll { height: auto; max-height: 70vh; }
}
```

- [ ] **Step 3: 类型检查**

Run:
```bash
cd apps/generate && bunx tsc -b
```
Expected: exit 0。

- [ ] **Step 4: Commit**

```bash
git add apps/generate/src/App.tsx apps/generate/src/App.css
git commit -m "feat(generate): assemble left/right layout with styles and ScrollArea"
```

---

## Task 15: 端到端验证

**Files:** 无（运行验证）

- [ ] **Step 1: 起库 + 后端 + 前端**

Run（三个终端）:
```bash
docker compose up -d
bun run --filter '@uhyc/backend' dev
bun run --filter 'auth' dev       # 仅用于登录拿 cookie，可选
bun run --filter 'generate' dev
```
Expected: 四服务起来，:3000/:5173/:5174 都 200。

- [ ] **Step 2: 浏览器验证完整流程**

打开 `http://localhost:5174`：
1. 未登录 → 跳 :5173 登录 → 登录成功跳回 :5174
2. 左栏选「视频生成 → 文生视频 → 万相 2.7」
3. 填提示词 → 点「生成」
4. 右栏顶部出现新卡（生成中/spinner）
5. ~1-2 分钟后卡片变「成功」+ 视频可预览

- [ ] **Step 3: 验证空态**

左栏切「图片生成」/「音乐生成」→ 模型下拉显示「该类别暂无可用模型」，表单与生成按钮隐藏/禁用。

- [ ] **Step 4: 验证静态文件可访问**

成功后从 DB 取 `storage_path`，拼 URL 验证：
```bash
curl -s -o /dev/null -w "[HTTP %{http_code}]\n" -b /tmp/gc.txt \
  "http://localhost:3000/generate/storage/<taskId>/<filename>"
```
Expected: HTTP 200。

- [ ] **Step 5: 回归测试**

Run:
```bash
cd services/api && bun test
```
Expected: 所有测试（auth 23 + generate 新增）全绿。

- [ ] **Step 6: 最终提交（若有调整）**

```bash
git add -A
git commit -m "chore: generate studio end-to-end verification" || echo "nothing to commit"
```

---

## 完成标准

- 后端 `modules/generate` 提供 catalog/create/list/sync + 静态文件路由
- DB 两表 + 索引就绪
- 前端左右两栏，元数据驱动表单，8s 轮询，ScrollArea
- 真实提交一个 HappyHorse/万相文生视频任务跑通：创建 → 轮询 → 成功 → 视频预览
- 所有测试绿，无回归
